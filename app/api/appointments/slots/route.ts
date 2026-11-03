import { NextRequest, NextResponse } from 'next/server';
import { checkSlots } from '@/lib/appointments/booking';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceCode = searchParams.get('serviceCode') || 'NBI_CLEARANCE';
    const date = searchParams.get('date') || undefined;

    const slots = await checkSlots(serviceCode, date);
    return NextResponse.json(slots);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch slots';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
