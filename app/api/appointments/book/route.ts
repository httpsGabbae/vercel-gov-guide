import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { bookSlotAtomic } from '@/lib/appointments/booking';

const bookSchema = z.object({
  slotId: z.string().min(1),
  citizenId: z.string().min(1),
  serviceCode: z.string().min(1),
  requestId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parse = bookSchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid booking payload', details: parse.error.format() },
        { status: 400 },
      );
    }

    const result = await bookSlotAtomic(parse.data);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Booking failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
