const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkColumns() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('--- Testing Messages Table Columns ---');
  
  const columnsToTest = ['sender_id', 'content', 'files', 'sender_name', 'receiver_id'];
  
  for (const col of columnsToTest) {
    const { error } = await supabase.from('messages').select(col).limit(1);
    if (error) {
      console.log(`❌ Column '${col}': MISSING (${error.message})`);
    } else {
      console.log(`✅ Column '${col}': EXISTS`);
    }
  }

  // Also check if there's a separate joint table
  const { error: tableError } = await supabase.from('message_files').select('*').limit(1);
  if (tableError) {
    console.log(`❌ Table 'message_files': MISSING (${tableError.message})`);
  } else {
    console.log(`✅ Table 'message_files': EXISTS`);
  }
}

checkColumns();
