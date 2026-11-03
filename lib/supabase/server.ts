import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Creates a server-side Supabase client using anon key.
 * For administrative / backend service tasks, use createServiceClient() from service.ts instead.
 */
export function createServerSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}
