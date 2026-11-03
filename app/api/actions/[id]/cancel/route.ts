import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cancelPendingAction } from '@/lib/actions/pending';

const cancelSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let reason = 'Citizen cancelled action';

    try {
      const json = await req.json();
      const parse = cancelSchema.safeParse(json);
      if (parse.success && parse.data.reason) {
        reason = parse.data.reason;
      }
    } catch {
      // Body is optional
    }

    const result = await cancelPendingAction(id, reason);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
