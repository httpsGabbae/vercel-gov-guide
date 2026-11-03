import dotenv from 'dotenv';
dotenv.config();
import { createServiceClient } from '../lib/supabase/service';

async function main() {
  const emailToConfirm = process.argv[2] || 'psa@gov.ph';
  console.log(`Checking Supabase user for email: ${emailToConfirm}...`);

  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) {
    console.error('List users error:', error);
    process.exit(1);
  }

  const user = data.users.find(u => u.email?.toLowerCase() === emailToConfirm.toLowerCase());
  if (!user) {
    console.log(`User ${emailToConfirm} not found in auth.users.`);
    console.log('Registered users:', data.users.map(u => u.email));
    return;
  }

  console.log(`Found user ID: ${user.id}, confirmed: ${!!user.email_confirmed_at}`);

  // Confirm email
  const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });

  if (updateErr) {
    console.error('Failed to confirm email:', updateErr);
  } else {
    console.log(`Successfully confirmed email for ${emailToConfirm}! Confirmed at: ${updated.user.email_confirmed_at}`);
  }

  // Find agency
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('code', 'PSA')
    .maybeSingle();

  // Set profile to agency_admin
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email || emailToConfirm,
    full_name: user.user_metadata?.full_name || 'PSA Officer',
    role: 'agency_admin',
    agency_id: agency?.id || null,
    updated_at: new Date().toISOString(),
  });

  if (profErr) {
    console.error('Failed to update profile to agency_admin:', profErr);
  } else {
    console.log(`Successfully updated profile to agency_admin (Agency: PSA)!`);
  }
}

main().catch(console.error);
