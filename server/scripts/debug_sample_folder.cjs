const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function check() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('folders').select('*').limit(1);
    if (error) {
        console.error(error);
        return;
    }
    console.log('Sample Folder:', data);
}

check();
