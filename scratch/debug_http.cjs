require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
  // We'll try hitting the endpoints directly to see what error we get
  const baseUrl = 'http://localhost:10000';

  // First, let's test without auth to confirm 401
  console.log('--- Test 1: POST /api/admin/subject without auth ---');
  try {
    const res1 = await fetch(`${baseUrl}/api/admin/subject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'HTTP_TEST' }),
    });
    const body1 = await res1.text();
    console.log(`Status: ${res1.status}`);
    console.log(`Body: ${body1}`);
  } catch (e) {
    console.error('Fetch error:', e.message);
  }

  // Now get a real admin token
  console.log('\n--- Test 2: Get admin session ---');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // List admin users from profiles
  const { data: admins } = await sb.from('profiles').select('id, name, role').eq('role', 'admin');
  console.log('Admin profiles:', admins);

  // We can't easily sign in as admin without password. Let's test the auth middleware
  // by generating a token from the service role
  // Actually let's check: does the admin middleware verify with supabaseClient (anon key)?
  // Let's check if supabaseClient config exists
  console.log('\n--- Test 3: Check supabaseClient config ---');
  try {
    const supabaseClient = require('./server/config/supabaseClient.cjs');
    console.log('supabaseClient loaded OK');
  } catch (e) {
    console.error('supabaseClient load error:', e.message);
  }
}

run().catch(e => console.error('Top-level error:', e));
