const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function check() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('folders').select('user_id').limit(5);
    if (error) {
        console.error(error);
        return;
    }
    console.log('Folder user_ids:', data);

    const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(5);
    console.log('Profile IDs:', users);
}

check();
