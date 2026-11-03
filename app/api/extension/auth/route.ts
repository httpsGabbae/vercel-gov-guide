import { NextResponse } from 'next/server';
import {
  extensionCorsHeaders as corsHeaders,
  getBearerToken,
  refreshExtensionSession,
  resolveExtensionUser,
  signInExtensionUser,
} from '@/lib/auth/extension';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/extension/auth
 * Verifies a bearer token (from extension login or a mirrored web chat session)
 * and returns the user's role + agency.
 */
export async function GET(request: Request) {
  const user = await resolveExtensionUser(getBearerToken(request));
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401, headers: corsHeaders }
    );
  }
  return NextResponse.json({ success: true, user }, { headers: corsHeaders });
}

/**
 * POST /api/extension/auth
 * Body: { email, password }   -> password sign-in
 *       { refreshToken }      -> refresh an expiring session
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof body.refreshToken === 'string' && body.refreshToken) {
      const result = await refreshExtensionSession(body.refreshToken);
      if ('error' in result) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 401, headers: corsHeaders }
        );
      }
      return NextResponse.json({ success: true, ...result }, { headers: corsHeaders });
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await signInExtensionUser(email, password);
    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401, headers: corsHeaders }
      );
    }
    return NextResponse.json({ success: true, ...result }, { headers: corsHeaders });
  } catch (error) {
    console.error('Extension auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during sign-in' },
      { status: 500, headers: corsHeaders }
    );
  }
}
