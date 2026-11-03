import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@/lib/supabase/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/service')>()),
  createServiceClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
import { GET, POST, DELETE } from '@/app/api/citizen/details/pin/route';
import {
  GET as readDetails,
  POST as saveDetails,
  DELETE as resetDetails,
} from '@/app/api/citizen/details/route';
import { hashUnlock } from '@/lib/auth/details-pin';

function request(
  method = 'GET',
  body?: unknown,
  token = 'access-token',
  unlock?: string,
  query = '',
) {
  return new NextRequest(`http://localhost/api/citizen/details${query}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(unlock ? { 'x-details-unlock': unlock } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  vi.stubEnv('SERVICE_ROLE_KEY', '');
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  mocks.rpc.mockResolvedValue({
    data: { ok: true, expiresAt: new Date(Date.now() + 900000).toISOString() },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('PIN setup and unlock API', () => {
  it('gets account-specific setup status without exposing secrets', async () => {
    mocks.rpc.mockResolvedValue({ data: { configured: false }, error: null });
    const res = await GET(request());
    expect(await res.json()).toEqual({ configured: false });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(mocks.rpc.mock.calls[0][1].p_user_id).toBe('owner');
  });
  it.each(['', 'demo-token:citizen-juan'])(
    'rejects missing or demo authentication: %s',
    async (token) => {
      expect((await GET(request('GET', undefined, token))).status).toBe(401);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it.each(['123', '12345', 'abcd', '12 3', 1234])('rejects malformed PIN: %s', async (pin) => {
    expect((await POST(request('POST', { action: 'setup', pin, confirmPin: pin }))).status).toBe(
      400,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('requires a matching confirmation during setup', async () => {
    expect(
      (await POST(request('POST', { action: 'setup', pin: '0123', confirmPin: '1234' }))).status,
    ).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('preserves leading zeros and returns a random token while storing only its hash', async () => {
    const res = await POST(
      request('POST', { action: 'setup', pin: '0123', confirmPin: '0123', userId: 'victim' }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.token).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
      p_user_id: 'owner',
      p_pin: '0123',
      p_token_hash: hashUnlock(data.token),
    });
    expect(data).not.toHaveProperty('pin');
  });
  it.each([
    ['WRONG_PIN', 403],
    ['ALREADY_CONFIGURED', 409],
    ['SETUP_REQUIRED', 409],
    ['LOCKED', 429],
  ])('does not grant access for %s', async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: { ok: false, code, retryAfter: 900 }, error: null });
    const res = await POST(request('POST', { action: 'unlock', pin: '1234' }));
    expect(res.status).toBe(status);
    expect(await res.json()).not.toHaveProperty('token');
    if (code === 'LOCKED') expect(res.headers.get('retry-after')).toBe('900');
  });
  it('revokes only the current account grant without deleting the PIN', async () => {
    expect(
      (await DELETE(request('DELETE', undefined, 'access-token', 'a'.repeat(64)))).status,
    ).toBe(200);
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
      p_user_id: 'owner',
      p_action: 'lock',
      p_pin: null,
    });
  });
  it('fails closed when storage is unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'database secret' } });
    const res = await POST(request('POST', { action: 'unlock', pin: '1234' }));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain('database secret');
  });
  it('identifies a missing production service key without calling the database', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('PIN_SERVER_NOT_CONFIGURED');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('loads PIN settings with the existing Vercel SERVICE_ROLE_KEY name', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('SERVICE_ROLE_KEY', 'vercel-service-key');
    mocks.rpc.mockResolvedValue({ data: { configured: true }, error: null });
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect((await res.json()).configured).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it.each([
    ['PGRST202', 404, 'PIN_DATABASE_NOT_READY'],
    ['42883', 404, 'PIN_DATABASE_NOT_READY'],
    ['42501', 403, 'PIN_SERVER_CREDENTIAL_ERROR'],
    ['PGRST301', 401, 'PIN_SERVER_CREDENTIAL_ERROR'],
  ])(
    'identifies deployment failure %s without exposing database details',
    async (code, status, expected) => {
      mocks.rpc.mockResolvedValue({
        data: null,
        status,
        error: { code, message: 'database secret' },
      });
      const res = await GET(request());
      const data = await res.json();
      expect(res.status).toBe(503);
      expect(data.code).toBe(expected);
      expect(data.message).not.toContain('database secret');
      expect(data.token).toBeUndefined();
    },
  );
});

describe('My Details API protection', () => {
  it.each([readDetails, saveDetails, resetDetails])(
    'rejects unauthenticated access before reading data',
    async (handler) => {
      expect((await handler(request('GET', undefined, ''))).status).toBe(401);
      expect(mocks.from).not.toHaveBeenCalled();
    },
  );
  it.each([readDetails, saveDetails, resetDetails])(
    'requires a PIN grant on every operation',
    async (handler) => {
      expect((await handler(request())).status).toBe(423);
      expect(mocks.from).not.toHaveBeenCalled();
    },
  );
  it('rejects expired or revoked grants', async () => {
    mocks.rpc.mockResolvedValue({ data: { ok: false }, error: null });
    expect(
      (await readDetails(request('GET', undefined, 'access-token', 'a'.repeat(64)))).status,
    ).toBe(423);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('rejects another account ID even after a valid unlock', async () => {
    const token = 'a'.repeat(64);
    expect(
      (await readDetails(request('GET', undefined, 'access-token', token, '?citizenId=victim')))
        .status,
    ).toBe(403);
    expect(
      (
        await saveDetails(
          request('POST', { citizenId: 'victim', applicant: {} }, 'access-token', token),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await saveDetails(
          request(
            'POST',
            { citizenId: 'owner', applicant: { id: 'victim' } },
            'access-token',
            token,
          ),
        )
      ).status,
    ).toBe(403);
    expect(
      (await resetDetails(request('DELETE', undefined, 'access-token', token, '?citizenId=victim')))
        .status,
    ).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('does not fall back to cached details when PIN validation fails', async () => {
    mocks.rpc.mockRejectedValue(new Error('offline'));
    expect(
      (await readDetails(request('GET', undefined, 'access-token', 'a'.repeat(64)))).status,
    ).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
