import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proposeSubmitAction } from '@/lib/actions/pending';

const proposeSchema = z.object({
  citizenId: z.string().min(1),
  serviceCode: z.enum(['NBI_CLEARANCE', 'PSA_BIRTH_CERT', 'PHILHEALTH_REGISTRATION']),
  payload: z.record(z.unknown()),
  executionMode: z.enum(['assisted', 'agent']).default('assisted'),
  expiresInMinutes: z.number().optional().default(15),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parse = proposeSchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid propose payload', details: parse.error.format() },
        { status: 400 },
      );
    }

    const pendingAction = await proposeSubmitAction(parse.data);
    return NextResponse.json(pendingAction, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
