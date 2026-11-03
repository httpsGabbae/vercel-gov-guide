import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function getServiceRoleKey() {
  // Support the name used by the existing Vercel project as well as the
  // documented Supabase-specific name. Neither is exposed to the browser.
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SERVICE_ROLE_KEY?.trim() || ''
  );
}

export function createServiceClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const serviceKey = getServiceRoleKey() || 'mock-service-role-key';

  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
