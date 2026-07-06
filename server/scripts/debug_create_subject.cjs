require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function debug() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('--- 1. Fetching profiles ---');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, role');
  if (profileError) {
    console.error('Profile fetch error:', profileError);
    return;
  }
  console.log(`Found ${profiles.length} profiles`);
  console.log('Profiles:', profiles.slice(0, 5));

  console.log('\n--- 2. Inserting one folder per profile ---');
  const inserts = profiles.map((p) => ({
    name: 'DEBUG_TEST_SUBJECT',
    parent_id: null,
    user_id: p.id,
    type: 'subject',
  }));
  console.log(`Inserting ${inserts.length} folders`);

  const { data, error } = await supabase
    .from('folders')
    .insert(inserts)
    .select();
  if (error) {
    console.error('INSERT ERROR (full):');
    console.error(JSON.stringify(error, null, 2));
    return;
  }
  console.log(`Inserted ${data.length} folders`);

  console.log('\n--- 3. Cleaning up ---');
  const { error: cleanupError } = await supabase
    .from('folders')
    .delete()
    .eq('name', 'DEBUG_TEST_SUBJECT');
  if (cleanupError) {
    console.error('Cleanup error:', cleanupError);
  } else {
    console.log('Cleaned up DEBUG_TEST_SUBJECT folders');
  }
}

debug().catch((e) => console.error('Top-level error:', e));