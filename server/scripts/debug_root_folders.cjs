const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function check() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('folders').select('*').is('parent_id', null).eq('user_id', 'a1a613d2-47d2-460f-b22f-40167335d380');
    if (error) {
        console.error(error);
        return;
    }
    console.log('Roots for a1a613d2...:', data);
}

check();
