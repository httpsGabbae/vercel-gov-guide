import { NextRequest, NextResponse } from 'next/server';
import { getMyAppointments } from '@/lib/appointments/booking';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const citizenId = searchParams.get('citizenId') || 'user-juan-001';

    const appointments = await getMyAppointments(citizenId);
    return NextResponse.json(appointments);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch appointments';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
