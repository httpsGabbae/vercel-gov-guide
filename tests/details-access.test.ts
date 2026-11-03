import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { auth } }));
import {
  acceptDetailsAccess,
  clearDetailsAccess,
  detailsFetch,
  hasDetailsAccess,
  lockDetailsAccess,
} from '@/lib/citizen/details-access';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'owner' }, access_token: 'auth' } },
  });
  clearDetailsAccess();
});
afterEach(() => {
  clearDetailsAccess();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('In-memory My Details unlock grant', () => {
  it('expires without storing a persistent browser unlock flag', () => {
    acceptDetailsAccess('owner', 'a'.repeat(64), new Date(Date.now() + 1000).toISOString());
    expect(hasDetailsAccess('owner')).toBe(true);
    expect(hasDetailsAccess('other')).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(hasDetailsAccess('owner')).toBe(false);
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
  it('does not send a previous account grant after account switching', async () => {
    acceptDetailsAccess('other', 'a'.repeat(64), new Date(Date.now() + 1000).toISOString());
    await detailsFetch('/api/citizen/details');
    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer auth');
    expect(headers.has('x-details-unlock')).toBe(false);
  });
  it('clears the browser grant when the server says access is locked', async () => {
    acceptDetailsAccess('owner', 'a'.repeat(64), new Date(Date.now() + 1000).toISOString());
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 423 }));
    await detailsFetch('/api/citizen/details');
    expect(hasDetailsAccess('owner')).toBe(false);
  });
  it('locks locally immediately and asks the server to revoke the grant', async () => {
    acceptDetailsAccess('owner', 'a'.repeat(64), new Date(Date.now() + 1000).toISOString());
    const locking = lockDetailsAccess();
    expect(hasDetailsAccess('owner')).toBe(false);
    await locking;
    expect(fetch).toHaveBeenCalledWith(
      '/api/citizen/details/pin',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  it.each(['invalid', new Date(0).toISOString()])('rejects invalid expiry: %s', (expiry) => {
    expect(() => acceptDetailsAccess('owner', 'a'.repeat(64), expiry)).toThrow();
    expect(hasDetailsAccess('owner')).toBe(false);
  });
});
