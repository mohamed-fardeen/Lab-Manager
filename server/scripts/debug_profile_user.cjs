const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function check() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', 'a1a613d2-47d2-460f-b22f-40167335d380');
    if (error) {
        console.error(error);
        return;
    }
    console.log('Profile a1a613d2...:', data);
}

check();
