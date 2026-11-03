import { afterEach, describe, expect, it, vi } from 'vitest';
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
import { createServiceClient } from '@/lib/supabase/service';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe('server-only Supabase credentials', () => {
  it('uses the service key name configured in Vercel', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('SERVICE_ROLE_KEY', '  vercel-secret  ');
    createServiceClient();
    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      'vercel-secret',
      expect.any(Object),
    );
  });
  it('prefers the documented key when both names are present', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'supabase-secret');
    vi.stubEnv('SERVICE_ROLE_KEY', 'legacy-secret');
    createServiceClient();
    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      'supabase-secret',
      expect.any(Object),
    );
  });
});
