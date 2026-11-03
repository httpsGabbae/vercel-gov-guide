import { NextRequest, NextResponse } from 'next/server';
import {
  DFA_CONSULAR_OFFICES,
  DFA_APPLICATION_CATEGORIES,
  getDfaSlotsForSiteAndDate,
  createDfaAppointmentBooking,
  rescheduleDfaAppointment,
  cancelDfaAppointment,
  listDfaAppointments,
  calculateDfaFees,
  type DfaApplicationType,
  type DfaProcessingSpeed,
} from '@/lib/dfa/appointments';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteCode = searchParams.get('siteCode') || 'DFA-ASEANA';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = searchParams.get('date') || tomorrow.toISOString().split('T')[0];
    const citizenId = searchParams.get('citizenId') || undefined;

    const slots = getDfaSlotsForSiteAndDate(siteCode, date);
    const appointments = listDfaAppointments(citizenId);

    return NextResponse.json({
      success: true,
      offices: DFA_CONSULAR_OFFICES,
      categories: Object.values(DFA_APPLICATION_CATEGORIES),
      selectedSite: siteCode,
      selectedDate: date,
      slots,
      appointments,
    });
  } catch (err) {
    console.error('[GET /api/dfa/appointments] Error:', err);
    return NextResponse.json({ error: 'Failed to load DFA appointment data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action || 'book';

    if (action === 'cancel') {
      if (!body.appointmentId) {
        return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
      }
      const cancelled = cancelDfaAppointment(String(body.appointmentId));
      return NextResponse.json({ success: true, appointment: cancelled });
    }

    if (action === 'reschedule') {
      if (!body.appointmentId || !body.newSlotId) {
        return NextResponse.json(
          { error: 'appointmentId and newSlotId are required' },
          { status: 400 },
        );
      }
      // Ensure slots exist for target date if provided
      if (body.siteCode && body.date) {
        getDfaSlotsForSiteAndDate(String(body.siteCode), String(body.date));
      }
      const updated = rescheduleDfaAppointment({
        appointmentId: String(body.appointmentId),
        newSlotId: String(body.newSlotId),
        newSiteCode: body.siteCode ? String(body.siteCode) : undefined,
      });
      return NextResponse.json({ success: true, appointment: updated });
    }

    // Default action: 'book'
    const {
      citizenId = 'applicant-jobseeker',
      applicantName,
      birthDate,
      email,
      phone,
      siteCode = 'DFA-ASEANA',
      date,
      slotId,
      applicationType = 'NEW_ADULT',
      processingSpeed = 'REGULAR',
      primaryIdPresented = 'PhilSys National ID',
      dressCodeAcknowledged = false,
    } = body ?? {};

    if (!applicantName || !slotId) {
      return NextResponse.json(
        { error: 'applicantName and slotId are required to book a DFA appointment.' },
        { status: 400 },
      );
    }

    if (date) {
      getDfaSlotsForSiteAndDate(String(siteCode), String(date));
    }

    const booking = createDfaAppointmentBooking({
      citizenId: String(citizenId),
      applicantName: String(applicantName),
      birthDate: String(birthDate || '2001-05-14'),
      email: String(email || 'citizen@govguide.ph'),
      phone: String(phone || '0917-555-0192'),
      siteCode: String(siteCode),
      slotId: String(slotId),
      applicationType: applicationType as DfaApplicationType,
      processingSpeed: processingSpeed as DfaProcessingSpeed,
      primaryIdPresented: String(primaryIdPresented),
      dressCodeAcknowledged: Boolean(dressCodeAcknowledged),
    });

    return NextResponse.json(
      {
        success: true,
        appointment: booking,
        feeSummary: calculateDfaFees(
          applicationType as DfaApplicationType,
          processingSpeed as DfaProcessingSpeed,
        ),
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process DFA appointment';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
