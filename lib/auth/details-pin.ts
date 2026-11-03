import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceClient, getServiceRoleKey } from '@/lib/supabase/service';

export const privateHeaders = { 'Cache-Control': 'no-store' };
export function pinError(message: string, status: number, code: string) {
  return NextResponse.json({ ok: false, message, code }, { status, headers: privateHeaders });
}
class PinServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function pinServiceUnavailable(error: unknown) {
  const failure =
    error instanceof PinServiceError
      ? error
      : new PinServiceError(
          'PIN_SERVICE_UNAVAILABLE',
          'The vault security service could not be reached. Please retry shortly.',
        );
  // Never log PINs, access tokens, user IDs, or raw database/provider errors.
  console.error('[details-pin]', { code: failure.code });
  return pinError(failure.message, 503, failure.code);
}
export function hashUnlock(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export async function authenticatedDetailsUser(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token || token.startsWith('demo-token:')) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return !error && data.user ? data.user.id : null;
}
export interface PinResult {
  ok?: boolean;
  configured?: boolean;
  code?: string;
  expiresAt?: string;
  retryAfter?: number;
}
export async function pinGate(
  userId: string,
  action: string,
  pin?: string,
  token?: string,
): Promise<PinResult> {
  const serviceKey = getServiceRoleKey();
  if (
    !serviceKey ||
    serviceKey === 'your_service_role_key_here' ||
    serviceKey === 'mock-service-role-key'
  ) {
    throw new PinServiceError(
      'PIN_SERVER_NOT_CONFIGURED',
      'Vault protection is not configured on this deployment. Set SUPABASE_SERVICE_ROLE_KEY in the server environment and redeploy.',
    );
  }
  // Narrow RPC adapter until generated Database types include the new migration.
  const db = createServiceClient() as unknown as {
    rpc(
      name: string,
      args: Record<string, unknown>,
    ): Promise<{
      data: PinResult | null;
      error: { code?: string; message?: string } | null;
      status?: number;
    }>;
  };
  const { data, error, status } = await db.rpc('details_pin_gate', {
    p_user_id: userId,
    p_action: action,
    p_pin: pin ?? null,
    p_token_hash: token ? hashUnlock(token) : null,
  });
  if (error?.code === 'PGRST202' || error?.code === '42883' || error?.code === '42P01') {
    throw new PinServiceError(
      'PIN_DATABASE_NOT_READY',
      'Vault security is not installed correctly on this database. Apply the details PIN migration to the Supabase project used by this deployment.',
    );
  }
  if (
    status === 401 ||
    status === 403 ||
    error?.code === '42501' ||
    error?.code === 'PGRST301' ||
    /invalid api key/i.test(error?.message || '')
  ) {
    throw new PinServiceError(
      'PIN_SERVER_CREDENTIAL_ERROR',
      'The vault database rejected its server credential. Check that SUPABASE_SERVICE_ROLE_KEY belongs to this deployment’s Supabase project, then redeploy.',
    );
  }
  if (error || !data) throw new Error('PIN verification unavailable');
  return data;
}
export async function requireDetailsUnlock(
  req: Request,
): Promise<{ userId: string } | { response: NextResponse }> {
  try {
    const userId = await authenticatedDetailsUser(req);
    if (!userId)
      return {
        response: pinError('Please sign in to access My Details.', 401, 'SIGN_IN_REQUIRED'),
      };
    const token = req.headers.get('x-details-unlock');
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return { response: pinError('Unlock My Details with your PIN.', 423, 'PIN_REQUIRED') };
    }
    if (!(await pinGate(userId, 'validate', undefined, token)).ok) {
      return {
        response: pinError('My Details is locked. Enter your PIN again.', 423, 'PIN_REQUIRED'),
      };
    }
    return { userId };
  } catch (error) {
    return { response: pinServiceUnavailable(error) };
  }
}
