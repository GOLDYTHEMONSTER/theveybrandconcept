const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load from .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      if (line && !line.startsWith('#')) {
        const [key, ...valParts] = line.split('=');
        const value = valParts.join('=');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = value?.trim();
        }
      }
    });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

// Create supabase client - use anon key with JWT as bearer for admin operations
const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: {
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`
    }
  }
});

async function seed() {
  try {
    console.log('Creating auth user test@example.com via signup...');
    let authUserId = null;
    
    try {
      // Try using public sign-up (works with anon key)
      const { data, error: signupError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
      
      if (signupError) {
        console.log('  Signup error:', signupError.message);
        if (!signupError.message?.includes('already exists')) {
          throw signupError;
        }
      } else if (data?.user?.id) {
        authUserId = data.user.id;
        console.log('  ✓ Auth user created via signup:', authUserId);
      }
    } catch (err) {
      console.log('  Signup failed:', err.message);
      // Fallback: try to get existing auth user
      console.log('  Attempting to fetch existing user...');
    }

    console.log('Seeding organization...');
    await supabase.from('organizations').upsert([
      { id: 'org-test-001', name: 'Test Organization', slug: 'test-org', status: 'active' }
    ]);

    console.log('Seeding profiles...');
    // Use fetched authUserId or default
    if (!authUserId) {
      authUserId = 'user-test-001';
      console.log('  Using default ID:', authUserId);
    }
    
    await supabase.from('profiles').upsert([
      { id: authUserId, email: 'test@example.com', full_name: 'Test User', status: 'active' }
    ]);

    console.log('Seeding organization_members...');
    await supabase.from('organization_members').upsert([
      { id: 'member-test-001', organization_id: 'org-test-001', profile_id: authUserId, status: 'active' }
    ]);

    console.log('Seeding roles...');
    await supabase.from('roles').upsert([
      { id: 'role-admin-001', organization_id: 'org-test-001', code: 'admin', name: 'Administrator', status: 'active' }
    ]);

    console.log('Assigning role to member...');
    await supabase.from('member_roles').upsert([
      { id: 'member-role-001', member_id: 'member-test-001', role_id: 'role-admin-001' }
    ]);

    console.log('Granting permissions to admin role (if permissions table exists)...');
    // Try to grant all existing permissions to the admin role
    const { data: perms } = await supabase.from('permissions').select('id');
    if (perms && perms.length) {
      const inserts = perms.map((p) => ({ role_id: 'role-admin-001', permission_id: p.id }));
      await supabase.from('role_permissions').upsert(inserts);
    }

    console.log('Seeding complete. Test user: test@example.com');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  }
}

seed();
