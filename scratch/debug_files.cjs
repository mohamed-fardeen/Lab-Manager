require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('--- Test Insert Empty File Without Status ---');
  const { data, error } = await sb.from('files').insert([{
    name: 'test_empty_file.txt',
    file_type: 'text/plain',
    size: 0,
    folder_id: '7de17205-275b-42cc-a256-24fe5269d5f3', // the folder we created
    user_id: '753e73a4-4998-4fe1-84ab-6af29be90918',
    url: null,
    public_id: null
  }]).select();

  console.log('Result:', data);
  console.log('Error:', JSON.stringify(error, null, 2));

  if (data && data.length > 0) {
    await sb.from('files').delete().eq('id', data[0].id);
    console.log('Cleaned up');
  }
}

run().catch(e => console.error(e));
