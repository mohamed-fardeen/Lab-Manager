const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function inspectDuplicates() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('--- Folder Stats by Date ---');
  
  // Ranges
  // Yesterday: 2026-04-19T00:00:00 to 2026-04-19T23:59:59
  // Today: 2026-04-20T00:00:00 to 2026-04-20T23:59:59

  const { data: yesterdayFolders, error: yError } = await supabase
    .from('folders')
    .select('id, name, user_id, created_at')
    .gte('created_at', '2026-04-19T00:00:00Z')
    .lt('created_at', '2026-04-20T00:00:00Z');

  const { data: todayFolders, error: tError } = await supabase
    .from('folders')
    .select('id, name, user_id, created_at')
    .gte('created_at', '2026-04-20T00:00:00Z')
    .lt('created_at', '2026-04-21T00:00:00Z');

  if (yError || tError) {
    console.error('Fetch Error:', yError || tError);
    return;
  }

  console.log(`Yesterday Folders (19th): ${yesterdayFolders.length}`);
  console.log(`Today Folders (20th): ${todayFolders.length}`);

  if (yesterdayFolders.length === 0) {
      console.log('No folders found for yesterday.');
      return;
  }

  // Check file counts for each batch
  const yesterdayIds = yesterdayFolders.map(f => f.id);
  const todayIds = todayFolders.map(f => f.id);

  const { count: yFiles, error: yfError } = await supabase
    .from('files')
    .select('*', { count: 'exact', head: true })
    .in('folder_id', yesterdayIds);

  let tFiles = 0;
  if (todayIds.length > 0) {
    const { count, error } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .in('folder_id', todayIds);
    tFiles = count;
  }

  console.log(`Files in Yesterday's Folders: ${yFiles}`);
  console.log(`Files in Today's Folders: ${tFiles}`);

  console.log('\n--- Sample Yesterday Folders (First 5) ---');
  console.log(JSON.stringify(yesterdayFolders.slice(0, 5), null, 2));
}

inspectDuplicates();
