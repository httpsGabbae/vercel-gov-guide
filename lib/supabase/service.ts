import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createServiceClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key';

  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
