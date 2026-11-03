import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proposeDraft } from '@/lib/ai/propose-draft';

const proposeDraftSchema = z.object({
  serviceCode: z.enum(['NBI_CLEARANCE', 'PSA_BIRTH_CERT', 'PHILHEALTH_REGISTRATION']),
  conversationText: z.string().min(5, 'Conversation text is required'),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parse = proposeDraftSchema.safeParse(json);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid propose draft payload', details: parse.error.format() },
        { status: 400 },
      );
    }

    const { serviceCode, conversationText } = parse.data;
    const result = await proposeDraft(serviceCode, conversationText);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Propose Draft API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
