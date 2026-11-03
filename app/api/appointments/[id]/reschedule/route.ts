import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rescheduleAppointment } from '@/lib/appointments/booking';

const rescheduleSchema = z.object({
  citizenId: z.string().min(1),
  newSlotId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const json = await req.json();
    const parse = rescheduleSchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid reschedule payload', details: parse.error.format() },
        { status: 400 },
      );
    }

    const result = await rescheduleAppointment({
      appointmentId: id,
      citizenId: parse.data.citizenId,
      newSlotId: parse.data.newSlotId,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Reschedule failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
