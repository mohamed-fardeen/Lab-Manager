/**
 * cleanup_structure.cjs
 *
 * Enforces the correct folder structure for ALL users:
 *   [Subject Folder]
 *     ├── Program
 *     ├── Record
 *     └── Screenshots
 *
 * Rules:
 *  1. Root folders named "Program", "Record", or "Screenshots" are INVALID → deleted
 *  2. Root folders with any other name are VALID subject folders → kept
 *  3. Each subject folder must have exactly Program, Record, Screenshots as children
 *     - Missing ones are CREATED
 *     - Any extra subfolder (wrong name) is DELETED (with its files via CASCADE)
 *
 * Usage:
 *   node server/scripts/cleanup_structure.cjs          (live run)
 *   node server/scripts/cleanup_structure.cjs --dry-run (preview only)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

const REQUIRED_CATEGORIES = ['Program', 'Record', 'Screenshots'];

// Case-insensitive check — "record", "RECORD", "Record" all match
const isCategory = (name) =>
  REQUIRED_CATEGORIES.some((c) => c.toLowerCase() === name.toLowerCase());

const log = (emoji, msg) => console.log(`${emoji} ${msg}`);

const stats = {
  usersProcessed: 0,
  invalidRootFoldersDeleted: 0,
  invalidSubfoldersDeleted: 0,
  categoriesCreated: 0,
};

(async () => {
  log('🚀', `Starting structure cleanup... ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}`);

  // 1. Get all distinct user IDs from folders table
  const { data: allFolders, error: fetchError } = await supabase
    .from('folders')
    .select('id, name, parent_id, user_id');

  if (fetchError) {
    console.error('❌ Failed to fetch folders:', fetchError.message);
    process.exit(1);
  }

  const userIds = [...new Set(allFolders.map((f) => f.user_id))];
  log('ℹ️', `Found ${userIds.length} user(s) to process.`);

  for (const userId of userIds) {
    log('\n👤', `Processing user: ${userId}`);
    stats.usersProcessed++;

    const userFolders = allFolders.filter((f) => f.user_id === userId);
    const rootFolders = userFolders.filter((f) => f.parent_id === null);

    // ── STEP 1: Remove invalid root-level folders ─────────────────────────────
    for (const folder of rootFolders) {
      if (isCategory(folder.name)) {
        log('🗑️ ', `  [INVALID ROOT] "${folder.name}" (id: ${folder.id}) → deleting`);
        stats.invalidRootFoldersDeleted++;

        if (!DRY_RUN) {
          const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', folder.id);
          if (error) log('❌', `  Failed to delete root folder "${folder.name}": ${error.message}`);
        }
      }
    }

    // Valid subject folders = root folders NOT named Program/Record/Screenshots
    const subjectFolders = rootFolders.filter((f) => !isCategory(f.name));
    log('📁', `  Subject folders: ${subjectFolders.map((f) => f.name).join(', ') || '(none)'}`);

    // ── STEP 2: For each subject, enforce exactly 3 subfolders ────────────────
    for (const subject of subjectFolders) {
      const children = userFolders.filter((f) => f.parent_id === subject.id);

      // Delete any subfolder not in [Program, Record, Screenshots]
      for (const child of children) {
        if (!isCategory(child.name)) {
          log('🗑️ ', `  [INVALID SUBFOLDER] "${child.name}" under "${subject.name}" → deleting`);
          stats.invalidSubfoldersDeleted++;

          if (!DRY_RUN) {
            const { error } = await supabase
              .from('folders')
              .delete()
              .eq('id', child.id);
            if (error) log('❌', `  Failed to delete subfolder "${child.name}": ${error.message}`);
          }
        }
      }

      // Create any missing required category folder
      for (const category of REQUIRED_CATEGORIES) {
        const exists = children.some(
          (c) => c.name.toLowerCase() === category.toLowerCase()
        );

        if (!exists) {
          log('✨', `  [CREATING] "${category}" under "${subject.name}"`);
          stats.categoriesCreated++;

          if (!DRY_RUN) {
            const { error } = await supabase.from('folders').insert({
              name: category,
              user_id: userId,
              parent_id: subject.id,
              type: 'category',
            });
            if (error) log('❌', `  Failed to create "${category}": ${error.message}`);
          }
        } else {
          log('✅', `  "${category}" already exists under "${subject.name}"`);
        }
      }
    }
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(40));
  console.log('📊 CLEANUP SUMMARY' + (DRY_RUN ? ' [DRY RUN — no changes made]' : ''));
  console.log('='.repeat(40));
  console.log(`Users processed:              ${stats.usersProcessed}`);
  console.log(`Invalid root folders deleted: ${stats.invalidRootFoldersDeleted}`);
  console.log(`Invalid subfolders deleted:   ${stats.invalidSubfoldersDeleted}`);
  console.log(`Missing categories created:   ${stats.categoriesCreated}`);
  console.log('='.repeat(40));
})();
