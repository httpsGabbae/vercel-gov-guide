import { NextResponse } from 'next/server';
import {
  getAgencyRequests,
  findRequestById,
  updateRequestStatusBar,
  UpdateStatusBarParams,
} from '@/lib/citizen/requests';

// Standard CORS headers for Chrome Extension cross-origin access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-agency-key, x-extension-id',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/agency/requests
 * Used by Chrome Extension & Agency Officer Portals
 * Query parameters:
 *  - agencyCode: 'DFA' | 'DPWH' | 'PSA' | 'PHILHEALTH' | 'ALL'
 *  - id: specific request ID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const agencyCode = searchParams.get('agencyCode') || 'ALL';

    if (id) {
      const single = findRequestById(id);
      if (!single) {
        return NextResponse.json(
          { success: false, error: `Request with ID '${id}' not found` },
          { status: 404, headers: corsHeaders }
        );
      }
      return NextResponse.json({ success: true, data: single }, { headers: corsHeaders });
    }

    const list = getAgencyRequests(agencyCode);
    return NextResponse.json(
      {
        success: true,
        agencyCode,
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
 * Used by Chrome Extension to edit/advance the Status Bar of any citizen request.
 * Payload:
 * {
 *   requestId: "REQ-DFA-2026-8921",
 *   currentStep: 4, // 1 to 5
 *   status?: "processing_production" | "ready_released" | ...,
 *   statusLabel?: "Passport Booklet Printed & Ready for Pick-Up",
 *   officerName?: "Consular Officer M. Gomez",
 *   officerNotes?: "Your passport is ready. Present claim stub at Counter 7.",
 *   appointmentSchedule?: "Nov 5, 2026 10:00 AM",
 *   actionRequiredNotice?: "Bring 2 valid IDs"
 * }
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.requestId || typeof body.currentStep !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: 'requestId' (string) and 'currentStep' (number 1-5).",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const params: UpdateStatusBarParams = {
      requestId: body.requestId,
      currentStep: body.currentStep,
      status: body.status,
      statusLabel: body.statusLabel,
      statusBadgeColor: body.statusBadgeColor,
      officerName: body.officerName,
      officerRole: body.officerRole,
      officerNotes: body.officerNotes,
      appointmentSchedule: body.appointmentSchedule,
      actionRequiredNotice: body.actionRequiredNotice,
      stepTimestamps: body.stepTimestamps,
    };

    const updated = updateRequestStatusBar(params);
    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: `Request '${body.requestId}' was not found.`,
        },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Status bar for request ${updated.id} successfully updated to Step ${updated.currentStep}/${updated.totalSteps}`,
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
