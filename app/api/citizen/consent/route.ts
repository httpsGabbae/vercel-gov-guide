import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-citizen-id',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// In-memory cache for fast local responses / mock sessions
const consentCache: Record<
  string,
  {
    accepted: boolean;
    consentedAt: string;
    version: string;
    details?: Record<string, boolean>;
  }
> = {};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Check in-memory cache first
    if (consentCache[userId]?.accepted) {
      return NextResponse.json(
        {
          ok: true,
          accepted: true,
          consentedAt: consentCache[userId].consentedAt,
          version: consentCache[userId].version,
          details: consentCache[userId].details,
        },
        { headers: corsHeaders }
      );
    }

    // 2. Query Supabase profiles
    try {
      const supabase = createServiceClient();
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('consent_settings')
        .eq('id', userId)
        .maybeSingle();

      if (!error && profile?.consent_settings) {
        const settings = profile.consent_settings as Record<string, unknown>;
        const termsAccepted = !!settings.terms_accepted;
        const consentedAt = (settings.terms_accepted_at as string) || null;
        const version = (settings.terms_version as string) || null;

        if (termsAccepted) {
          consentCache[userId] = {
            accepted: true,
            consentedAt: consentedAt || new Date().toISOString(),
            version: version || '2026.11-v1',
          };
        }

        return NextResponse.json(
          {
            ok: true,
            accepted: termsAccepted,
            consentedAt,
            version,
          },
          { headers: corsHeaders }
        );
      }
    } catch {
      // Supabase query failed (e.g. offline/mock environment)
    }

    return NextResponse.json(
      {
        ok: true,
        accepted: false,
        consentedAt: null,
        version: null,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve consent status';
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      termsAccepted = true,
      version = '2026.11-v1',
      details,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { ok: false, error: 'Terms and conditions must be accepted' },
        { status: 400, headers: corsHeaders }
      );
    }

    const consentedAt = new Date().toISOString();

    // Cache immediately
    consentCache[userId] = {
      accepted: true,
      consentedAt,
      version,
      details: details || {
        data_privacy_act_10173: true,
        ephemeral_biometrics: true,
        ai_assisted_guidance: true,
        confirmation_gated_actions: true,
      },
    };

    // Persist to Supabase if available
    try {
      const supabase = createServiceClient();
      const { data: existing } = await supabase
        .from('profiles')
        .select('consent_settings')
        .eq('id', userId)
        .maybeSingle();

      const prevSettings = (existing?.consent_settings as Record<string, unknown>) || {};
      const newSettings = {
        ...prevSettings,
        terms_accepted: true,
        terms_accepted_at: consentedAt,
        terms_version: version,
        data_privacy_consent: true,
        ephemeral_biometrics: true,
        audit_logging: true,
        ai_assisted: true,
        details: consentCache[userId].details,
      };

      await supabase
        .from('profiles')
        .update({
          consent_settings: newSettings,
          updated_at: consentedAt,
        } as any)
        .eq('id', userId);
    } catch {
      // Non-fatal if Supabase connection is offline
    }

    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        consentedAt,
        version,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save consent';
    return NextResponse.json({ ok: false, error: message }, { status: 500, headers: corsHeaders });
  }
}

