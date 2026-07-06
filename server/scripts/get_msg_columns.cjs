const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function getColumns() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'messages' });

  if (error) {
     // Fallback: Use a direct query to information_schema if enabled, 
     // but usually we can't do that via JS client unless we have a specific RPC.
     // Let's try to fetch a single row to see what happens, or just guess based on App.tsx interfaces.
     console.log('RPC failed, trying fallback...');
     const { data: cols, error: err2 } = await supabase.from('messages').select().limit(0);
     console.log('Columns:', Object.keys(cols?.[0] || {}));
     console.error('Error:', error.message);
  } else {
    console.log('Columns:', data);
  }
}

getColumns();
