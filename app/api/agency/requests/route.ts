import { NextResponse } from 'next/server';
import {
  searchAgencyRequests,
  findRequestById,
  updateRequestStatusBar,
  addRequestNote,
  UpdateStatusBarParams,
  ProcessStatus,
} from '@/lib/citizen/requests';
import {
  extensionCorsHeaders as corsHeaders,
  getBearerToken,
  isAgencyRole,
  resolveExtensionUser,
  type ExtensionAuthUser,
} from '@/lib/auth/extension';
import { createServiceClient } from '@/lib/supabase/service';

const PROCESS_STATUSES: ProcessStatus[] = ['on_process', 'missing_details', 'complete'];

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Resolves an authenticated agency_admin / platform_admin bearer token, or
 * falls back to the counter officer header used by the in-app simulator.
 */
async function requireAgencyUser(
  request: Request
): Promise<{ user: ExtensionAuthUser } | { response: NextResponse }> {
  const token = getBearerToken(request);
  const user = await resolveExtensionUser(token);
  if (user) {
    if (!isAgencyRole(user.role)) {
      return {
        response: NextResponse.json(
          { success: false, error: 'Forbidden: agency account required.' },
          { status: 403, headers: corsHeaders }
        ),
      };
    }
    return { user };
  }

  // Allow in-app simulator & counter officer header when no bearer token is sent
  const roleHeader = request.headers.get('x-agency-role');
  if (!token || roleHeader === 'counter_officer') {
    return {
      user: {
        userId: '00000000-0000-4000-8000-000000000a00',
        email: 'officer@govguide.ph',
        fullName: 'Consular Officer Maria Teresa Gomez',
        role: 'agency_admin',
        agencyCode: 'ALL',
        agencyName: 'All Agencies',
      },
    };
  }

  return {
    response: NextResponse.json(
      { success: false, error: 'Not authenticated. Please sign in with an agency account.' },
      { status: 401, headers: corsHeaders }
    ),
  };
}

/** Agency admins are scoped to their own agency; ALL / platform admins see everything. */
function scopeFor(user: ExtensionAuthUser, requested?: string | null): string {
  if (user.role === 'platform_admin' || !user.agencyCode || user.agencyCode.toUpperCase() === 'ALL') {
    return (requested || 'ALL').toUpperCase();
  }
  return user.agencyCode.toUpperCase();
}

function canTouch(user: ExtensionAuthUser, agencyCode: string): boolean {
  if (user.role === 'platform_admin') return true;
  if (!user.agencyCode || user.agencyCode.toUpperCase() === 'ALL') return true;
  return user.agencyCode.toUpperCase() === agencyCode.toUpperCase();
}

/**
 * GET /api/agency/requests
 * Used by Chrome Extension & Agency Officer Portals
 * Query parameters:
 *  - q: free-text search (request ID, reference number, citizen name/email/phone, service)
 *  - agencyCode: 'DFA' | 'DPWH' | 'PSA' | 'PHILHEALTH' | 'ALL'
 *  - id: specific request ID
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAgencyUser(request);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const q = searchParams.get('q') || searchParams.get('search') || '';
    const agencyCode = scopeFor(user, searchParams.get('agencyCode'));

    if (id) {
      const single = findRequestById(id);
      if (!single || !canTouch(user, single.agencyCode)) {
        return NextResponse.json(
          { success: false, error: `Request with ID '${id}' not found` },
          { status: 404, headers: corsHeaders }
        );
      }
      return NextResponse.json({ success: true, data: single }, { headers: corsHeaders });
    }

    const list = searchAgencyRequests(agencyCode, q);
    return NextResponse.json(
      {
        success: true,
        agencyCode,
        query: q,
        count: list.length,
        data: list,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Agency requests GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching agency requests' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/agency/requests
 * Used by Chrome Extension to update the Status Bar of a citizen request and/or add a note.
 * Payload:
 * {
 *   requestId: "REQ-DFA-2026-8921",
 *   processStatus?: "on_process" | "missing_details" | "complete",
 *   currentStep?: 4, // 1 to 5 (optional)
 *   statusLabel?: "On Process" | "Missing Details" | "Complete",
 *   officerName?: "Consular Officer M. Gomez",
 *   note?: "Please upload a clearer copy of your PSA Birth Certificate.",
 *   officerNotes?: "Optional direct replacement or note",
 *   appointmentSchedule?: "Nov 5, 2026 10:00 AM",
 *   actionRequiredNotice?: "Bring 2 valid IDs"
 * }
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireAgencyUser(request);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const body = await request.json().catch(() => null);
    if (!body || typeof body.requestId !== 'string' || !body.requestId) {
      return NextResponse.json(
        { success: false, error: "Missing required field: 'requestId' (string)." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (body.processStatus !== undefined && !PROCESS_STATUSES.includes(body.processStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid 'processStatus'. Use 'on_process', 'missing_details', or 'complete'.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const existing = findRequestById(body.requestId);
    if (!existing || !canTouch(user, existing.agencyCode)) {
      return NextResponse.json(
        { success: false, error: `Request '${body.requestId}' was not found.` },
        { status: 404, headers: corsHeaders }
      );
    }

    const officerName =
      typeof body.officerName === 'string' && body.officerName ? body.officerName : user.fullName;

    const hasStatusUpdate =
      body.processStatus !== undefined ||
      typeof body.currentStep === 'number' ||
      body.status !== undefined ||
      body.statusLabel !== undefined ||
      body.officerNotes !== undefined ||
      body.appointmentSchedule !== undefined ||
      body.actionRequiredNotice !== undefined;

    let updated = existing;

    if (hasStatusUpdate) {
      const params: UpdateStatusBarParams = {
        requestId: existing.id,
        currentStep: typeof body.currentStep === 'number' ? body.currentStep : undefined,
        processStatus: body.processStatus,
        status: body.status,
        statusLabel: body.statusLabel,
        statusBadgeColor: body.statusBadgeColor,
        officerName,
        officerRole: body.officerRole,
        officerNotes: body.officerNotes,
        appointmentSchedule: body.appointmentSchedule,
        actionRequiredNotice: body.actionRequiredNotice,
        stepTimestamps: body.stepTimestamps,
      };
      const result = updateRequestStatusBar(params);
      if (result) updated = result;
    }

    if (typeof body.note === 'string' && body.note.trim()) {
      const result = addRequestNote(existing.id, body.note, officerName);
      if (result) updated = result;
    }

    return NextResponse.json(
      {
        success: true,
        message: `Request ${updated.id} updated (${updated.statusLabel})`,
        data: updated,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Agency requests PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while updating status bar' },
      { status: 500, headers: corsHeaders }
    );
  }
}
