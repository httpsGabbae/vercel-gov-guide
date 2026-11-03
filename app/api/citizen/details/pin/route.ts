import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  authenticatedDetailsUser,
  pinError,
  pinGate,
  privateHeaders,
} from '@/lib/auth/details-pin';

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedDetailsUser(req);
    if (!userId) return pinError('Please sign in to secure My Details.', 401, 'SIGN_IN_REQUIRED');
    return NextResponse.json(await pinGate(userId, 'status'), { headers: privateHeaders });
  } catch {
    return pinError('PIN settings are unavailable. Please try again.', 503, 'UNAVAILABLE');
  }
}
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticatedDetailsUser(req);
    if (!userId) return pinError('Please sign in to secure My Details.', 401, 'SIGN_IN_REQUIRED');
    let body;
    try {
      body = await req.json();
    } catch {
      return pinError('Invalid request.', 400, 'INVALID_INPUT');
    }
    if (
      !body ||
      !['setup', 'unlock'].includes(body.action) ||
      typeof body.pin !== 'string' ||
      !/^\d{4}$/.test(body.pin)
    ) {
      return pinError('Enter exactly four digits.', 400, 'INVALID_INPUT');
    }
    if (body.action === 'setup' && body.pin !== body.confirmPin) {
      return pinError('The PINs do not match.', 400, 'INVALID_INPUT');
    }
    const token = randomBytes(32).toString('hex');
    const result = await pinGate(userId, body.action, body.pin, token);
    if (!result.ok) {
      const locked = result.code === 'LOCKED';
      const message = locked
        ? 'Too many attempts. Try again after the waiting period.'
        : result.code === 'WRONG_PIN'
          ? 'Incorrect PIN. Please try again.'
          : result.code === 'ALREADY_CONFIGURED'
            ? 'A PIN already exists. Unlock with your existing PIN.'
            : 'Please set up your PIN first.';
      const response = pinError(
        message,
        locked ? 429 : result.code === 'WRONG_PIN' ? 403 : 409,
        result.code || 'INVALID_INPUT',
      );
      if (locked) response.headers.set('Retry-After', String(result.retryAfter || 900));
      return response;
    }
    return NextResponse.json(
      { ok: true, token, expiresAt: result.expiresAt },
      { headers: privateHeaders },
    );
  } catch {
    return pinError('PIN verification is unavailable. Please try again.', 503, 'UNAVAILABLE');
  }
}
export async function DELETE(req: NextRequest) {
  try {
    const userId = await authenticatedDetailsUser(req);
    if (!userId) return pinError('Please sign in.', 401, 'SIGN_IN_REQUIRED');
    const token = req.headers.get('x-details-unlock');
    if (token) await pinGate(userId, 'lock', undefined, token);
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch {
    return pinError('Unable to revoke access. It will expire automatically.', 503, 'UNAVAILABLE');
  }
}
