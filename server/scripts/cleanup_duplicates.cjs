const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function cleanup() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('--- Phase 1: Identifying Yesterday\'s Folders ---');
  const { data: yesterdayFolders, error: yError } = await supabase
    .from('folders')
    .select('id, name, user_id')
    .gte('created_at', '2026-04-19T00:00:00Z')
    .lt('created_at', '2026-04-20T00:00:00Z');

  if (yError) {
    console.error(yError);
    return;
  }
  console.log(`Found ${yesterdayFolders.length} folders from yesterday.`);

  console.log('--- Phase 2: Checking for orphan files in these folders ---');
  const yesterdayIds = yesterdayFolders.map(f => f.id);
  
  // We can't do a single large IN if it's too big, so we'll chunk it
  let filesInYesterday = [];
  const chunkSize = 100;
  for (let i = 0; i < yesterdayIds.length; i += chunkSize) {
    const chunk = yesterdayIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('files')
      .select('id, name, folder_id')
      .in('folder_id', chunk);
    
    if (error) {
       console.error(`Error checking chunk ${i}:`, error);
       continue;
    }
    if (data) filesInYesterday.push(...data);
  }

  console.log(`Found ${filesInYesterday.length} files attached to yesterday's folders.`);

  if (filesInYesterday.length > 0) {
    console.log('⚠️ WARNING: Some files are attached to the folders you want to delete.');
    console.log('I will attempt to move them to the "Today" counterparts if they exist.');
    
    const { data: todayFolders } = await supabase
      .from('folders')
      .select('id, name, user_id')
      .gte('created_at', '2026-04-20T00:00:00Z');

    const todayMap = new Map(); // "user_id:name" -> today_folder_id
    todayFolders.forEach(f => todayMap.set(`${f.user_id}:${f.name}`, f.id));

    for (const file of filesInYesterday) {
        const folder = yesterdayFolders.find(f => f.id === file.folder_id);
        const todayFolderId = todayMap.get(`${folder.user_id}:${folder.name}`);

        if (todayFolderId) {
            console.log(`Moving file ${file.name} to today's folder...`);
            await supabase.from('files').update({ folder_id: todayFolderId }).eq('id', file.id);
        } else {
            console.log(`❌ Could not find today's counterpart for folder ${folder.name} (User: ${folder.user_id}). Skipping deletion for this folder.`);
            // Remove this folder from deletion list
            const index = yesterdayIds.indexOf(folder.id);
            if (index > -1) yesterdayIds.splice(index, 1);
        }
    }
  }

  console.log(`--- Phase 3: Deleting ${yesterdayIds.length} folders ---`);
  if (yesterdayIds.length === 0) {
      console.log('Nothing to delete.');
      return;
  }

  const deleteBatchSize = 50;
  let deletedCount = 0;
  for (let i = 0; i < yesterdayIds.length; i += deleteBatchSize) {
    const chunk = yesterdayIds.slice(i, i + deleteBatchSize);
    const { error } = await supabase
      .from('folders')
      .delete()
      .in('id', chunk);
    
    if (error) {
      console.error(`Error deleting chunk: ${error.message}`);
    } else {
      deletedCount += chunk.length;
      process.stdout.write(`Deleted ${deletedCount}/${yesterdayIds.length} folders...\r`);
    }
  }
  console.log(`\nSuccessfully deleted ${deletedCount} duplicate folders from yesterday.`);
}

cleanup();
