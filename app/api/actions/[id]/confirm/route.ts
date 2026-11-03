import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmPendingAction } from '@/lib/actions/pending';

const confirmSchema = z.object({
  declarationConfirmed: z.boolean(),
  agentModeConsent: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const json = await req.json();
    const parse = confirmSchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid confirmation payload', details: parse.error.format() },
        { status: 400 },
      );
    }

    const result = await confirmPendingAction(id, parse.data);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
