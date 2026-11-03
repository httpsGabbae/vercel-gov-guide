import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cancelAppointment } from '@/lib/appointments/booking';

const cancelSchema = z.object({
  citizenId: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const json = await req.json();
    const parse = cancelSchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid cancellation payload', details: parse.error.format() },
        { status: 400 },
      );
    }

    const result = await cancelAppointment({
      appointmentId: id,
      citizenId: parse.data.citizenId,
      reason: parse.data.reason,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cancellation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
