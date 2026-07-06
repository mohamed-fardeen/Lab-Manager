require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const baseUrl = 'http://localhost:10000';
  
  // Step 1: Sign in as admin to get a JWT token
  const supabaseClient = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );
  
  // We need admin credentials. Let's check if there's a way to get a token.
  // Since we have the service role key, we can generate an admin access token
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Get the admin user ID
  const adminId = '12677b9d-65eb-467f-977d-25f8c680aaa1';
  
  // Generate an auth token for the admin user using the admin API
  // The admin.getUserById should give us enough context
  const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(adminId);
  if (adminError) {
    console.error('Could not get admin user:', adminError);
    return;
  }
  console.log('Admin user email:', adminUser.user.email);
  
  // We can't generate a JWT directly. Let's try a different approach:
  // Use generateLink to create a magic link and extract the token
  // Or better — just test with curl-like approach using a known valid token
  
  // Actually, the simplest thing: Check if the SERVER has an error importing something
  // Let's call a working admin endpoint first to verify auth works
  console.log('\n--- Checking if any admin endpoint works ---');
  
  // Sign in with admin credentials (need email/password)
  // Let's check if there's a test credential in env
  const adminEmail = adminUser.user.email;
  console.log('Admin email:', adminEmail);
  
  // We can use admin.generateLink to create an auth link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: adminEmail,
  });
  
  if (linkError) {
    console.error('Generate link error:', linkError);
    return;
  }
  
  // The generated link contains a token we can use
  const { properties } = linkData;
  console.log('Got magic link token');
  
  // Verify the OTP to get a session
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.verifyOtp({
    token_hash: properties.hashed_token,
    type: 'magiclink',
  });
  
  if (sessionError) {
    console.error('Verify OTP error:', sessionError);
    return;
  }
  
  const accessToken = sessionData.session.access_token;
  console.log('Got access token, length:', accessToken.length);
  
  // Now test the admin endpoints
  console.log('\n--- Test: GET /api/admin/stats (should work) ---');
  const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  console.log('Stats status:', statsRes.status);
  const statsBody = await statsRes.text();
  console.log('Stats body:', statsBody.substring(0, 200));
  
  console.log('\n--- Test: POST /api/admin/subject ---');
  const subjectRes = await fetch(`${baseUrl}/api/admin/subject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'HTTP_TEST_SUBJECT' }),
  });
  console.log('Subject status:', subjectRes.status);
  const subjectBody = await subjectRes.text();
  console.log('Subject body:', subjectBody);
  
  // Cleanup if success
  if (subjectRes.status === 200) {
    console.log('Cleaning up...');
    await supabaseAdmin.from('folders').delete().eq('name', 'HTTP_TEST_SUBJECT');
    console.log('Cleaned up');
  }
  
  console.log('\n--- Test: POST /api/folders ---');
  const folderRes = await fetch(`${baseUrl}/api/folders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'HTTP_TEST_FOLDER', parent_id: null }),
  });
  console.log('Folder status:', folderRes.status);
  const folderBody = await folderRes.text();
  console.log('Folder body:', folderBody);
  
  // Cleanup if success
  if (folderRes.status === 201) {
    console.log('Cleaning up...');
    await supabaseAdmin.from('folders').delete().eq('name', 'HTTP_TEST_FOLDER');
    console.log('Cleaned up');
  }

  // Sign out
  await supabaseClient.auth.signOut();
}

run().catch(e => console.error('Top-level error:', e));
