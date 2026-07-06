/**
 * Repair script: propagate existing admin-created subjects and their category
 * subfolders to all users who are missing them.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function repair() {
  // 1. Get all profiles (students + admin)
  const { data: profiles, error: pe } = await supabaseAdmin.from('profiles').select('id, name');
  if (pe) throw pe;
  console.log(`Found ${profiles.length} profiles`);

  // 2. Get all distinct root subject names
  const { data: allSubjects, error: se } = await supabaseAdmin
    .from('folders')
    .select('name')
    .is('parent_id', null)
    .eq('type', 'subject');
  if (se) throw se;
  const subjectNames = [...new Set(allSubjects.map(s => s.name))];
  console.log(`Distinct subject names: ${JSON.stringify(subjectNames)}`);

  // 3. For each subject name, check which users are missing it and insert
  for (const subjectName of subjectNames) {
    // Get user_ids that already have this subject
    const { data: existing } = await supabaseAdmin
      .from('folders')
      .select('user_id')
      .eq('name', subjectName)
      .is('parent_id', null)
      .eq('type', 'subject');
    const existingUserIds = new Set(existing.map(r => r.user_id));

    // Find users missing this subject
    const missing = profiles.filter(p => !existingUserIds.has(p.id));
    console.log(`\nSubject "${subjectName}": ${existing.length} users have it, ${missing.length} missing`);

    if (missing.length > 0) {
      const inserts = missing.map(p => ({ name: subjectName, parent_id: null, user_id: p.id, type: 'subject' }));
      const { data: inserted, error: ie } = await supabaseAdmin.from('folders').insert(inserts).select();
      if (ie) { console.error(`  ✗ Insert failed:`, ie.message); continue; }
      console.log(`  ✓ Created for ${inserted.length} users`);
      
      // 4. Now check for categories under this subject and replicate them too
      // Get all category folders that exist under ANY user's version of this subject
      // We need to find one "reference" set of categories
      const { data: refSubject } = await supabaseAdmin
        .from('folders')
        .select('id')
        .eq('name', subjectName)
        .is('parent_id', null)
        .eq('type', 'subject')
        .limit(1)
        .single();

      const { data: categories } = await supabaseAdmin
        .from('folders')
        .select('name')
        .eq('parent_id', refSubject.id)
        .eq('type', 'category');

      if (categories && categories.length > 0) {
        const catNames = [...new Set(categories.map(c => c.name))];
        console.log(`  Categories to propagate: ${JSON.stringify(catNames)}`);
        // For each newly created subject, add its categories
        for (const newSubject of inserted) {
          const catInserts = catNames.map(cn => ({ name: cn, parent_id: newSubject.id, user_id: newSubject.user_id, type: 'category' }));
          const { error: cie } = await supabaseAdmin.from('folders').insert(catInserts);
          if (cie) console.error(`    ✗ Category insert failed for user ${newSubject.user_id}:`, cie.message);
          else console.log(`    ✓ Added ${catInserts.length} categories for user ${newSubject.user_id}`);
        }
      }
    }
  }

  // 5. Also propagate categories to users who have the subject but are missing some categories
  console.log('\n--- Propagating missing categories to existing subject holders ---');
  for (const subjectName of subjectNames) {
    const { data: allUserSubjects } = await supabaseAdmin
      .from('folders')
      .select('id, user_id')
      .eq('name', subjectName)
      .is('parent_id', null)
      .eq('type', 'subject');

    // Get ALL distinct category names for this subject across all users
    const parentIds = allUserSubjects.map(s => s.id);
    const { data: allCats } = await supabaseAdmin
      .from('folders')
      .select('name')
      .in('parent_id', parentIds)
      .eq('type', 'category');
    if (!allCats || allCats.length === 0) continue;
    
    const catNames = [...new Set(allCats.map(c => c.name))];

    for (const userSubject of allUserSubjects) {
      const { data: existingCats } = await supabaseAdmin
        .from('folders')
        .select('name')
        .eq('parent_id', userSubject.id)
        .eq('type', 'category');
      const existingCatNames = new Set(existingCats.map(c => c.name));
      const missingCatNames = catNames.filter(cn => !existingCatNames.has(cn));
      
      if (missingCatNames.length > 0) {
        const inserts = missingCatNames.map(cn => ({ name: cn, parent_id: userSubject.id, user_id: userSubject.user_id, type: 'category' }));
        const { error } = await supabaseAdmin.from('folders').insert(inserts);
        if (error) console.error(`  ✗ Failed for user ${userSubject.user_id}:`, error.message);
        else console.log(`  ✓ Added [${missingCatNames.join(', ')}] under "${subjectName}" for user ${userSubject.user_id}`);
      }
    }
  }

  console.log('\n✅ Repair complete!');
}

repair().catch(console.error);
