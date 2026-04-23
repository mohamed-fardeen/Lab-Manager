const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkMessagesTable() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  if (error) {
    if (error.code === '42P01') {
      console.log('Messages table does NOT exist.');
    } else {
      console.error(error);
    }
  } else {
    console.log('Messages table exists.');
    console.log('Sample:', data[0]);
  }
}

checkMessagesTable();
