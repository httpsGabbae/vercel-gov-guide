import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const privateHeaders = { 'Cache-Control': 'no-store' };
export function pinError(message: string, status: number, code: string) {
  return NextResponse.json({ ok: false, message, code }, { status, headers: privateHeaders });
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
  // Narrow RPC adapter until generated Database types include the new migration.
  const db = createServiceClient() as unknown as {
    rpc(
      name: string,
      args: Record<string, unknown>,
    ): Promise<{ data: PinResult | null; error: unknown }>;
  };
  const { data, error } = await db.rpc('details_pin_gate', {
    p_user_id: userId,
    p_action: action,
    p_pin: pin ?? null,
    p_token_hash: token ? hashUnlock(token) : null,
  });
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
  } catch {
    return {
      response: pinError(
        'My Details verification is unavailable. Please try again.',
        503,
        'UNAVAILABLE',
      ),
    };
  }
}
