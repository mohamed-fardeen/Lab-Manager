const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Check profiles columns
  const { data: profiles, error: pe } = await supabaseAdmin.from('profiles').select('*').limit(10);
  if (pe) console.error('Profiles error:', pe);
  else console.log('Profiles count:', profiles.length, '\nProfile keys:', profiles[0] ? Object.keys(profiles[0]) : 'none', '\nProfiles:', JSON.stringify(profiles, null, 2));
  
  // Check all subfolders (categories)
  const { data: cats } = await supabaseAdmin
    .from('folders')
    .select('id, name, user_id, type, parent_id')
    .eq('type', 'category');
  console.log('\nCategory folders:', JSON.stringify(cats, null, 2));
}

check().catch(console.error);
