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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function seed() {
  try {
    console.log('Creating auth user test@example.com...');
    let authUserId = 'user-test-001'; // fallback
    try {
      const { data } = await supabase.auth.admin.createUser({
        email: 'test@example.com',
        password: 'TestPassword123!',
        email_confirm: true
      });
      if (data?.user?.id) {
        authUserId = data.user.id;
        console.log('  ✓ Auth user created:', authUserId);
      }
    } catch (err) {
      if (err.message?.includes('already exists')) {
        console.log('  ℹ Auth user already exists, fetching ID...');
        // Try to get existing user via profiles
        const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', 'test@example.com').limit(1).single();
        if (existingProfile?.id) {
          authUserId = existingProfile.id;
        }
      } else {
        throw err;
      }
    }

    console.log('Seeding organization...');
    await supabase.from('organizations').upsert([
      { id: 'org-test-001', name: 'Test Organization', slug: 'test-org', status: 'active' }
    ]);

    console.log('Seeding profiles...');
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
