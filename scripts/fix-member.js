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

const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: {
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`
    }
  }
});

async function fixMember() {
  try {
    const actualUserId = '68e0ef02-d3c2-4c4d-a8b6-4b297f563658';
    
    console.log('Updating organization_members with actual user ID...');
    const { data, error } = await supabase
      .from('organization_members')
      .update({ profile_id: actualUserId })
      .eq('organization_id', 'org-test-001');
    
    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }
    
    console.log('✓ Updated organization_members record');
    console.log('  Organization: org-test-001');
    console.log('  User ID: ' + actualUserId);
    
    // Verify
    const { data: verify, error: verifyError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', 'org-test-001');
    
    if (!verifyError && verify && verify.length > 0) {
      console.log('\n✓ Verification successful:');
      console.log(JSON.stringify(verify[0], null, 2));
    }
    
    console.log('\nNow try logging in again!');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

fixMember();
