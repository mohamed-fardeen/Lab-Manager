const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkSupabase() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { count: fileCount, error: fileError } = await supabase
    .from('files')
    .select('*', { count: 'exact', head: true });

  const { count: folderCount, error: folderError } = await supabase
    .from('folders')
    .select('*', { count: 'exact', head: true });

  if (fileError || folderError) {
    console.error(fileError || folderError);
    return;
  }

  console.log(`Supabase Files: ${fileCount}`);
  console.log(`Supabase Folders: ${folderCount}`);
}

checkSupabase();
