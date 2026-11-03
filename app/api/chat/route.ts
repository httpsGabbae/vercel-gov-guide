import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchCharterTool, getServiceRequirementsTool } from '@/lib/ai/tools';
import { getGeminiClient, GEMINI_FLASH_MODEL } from '@/lib/ai/models';
import { createServiceClient } from '@/lib/supabase/service';

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  language: z.enum(['fil', 'en']).default('fil'),
  sessionId: z.string().optional(),
});

const OFFICIAL_FALLBACKS: Record<string, { agency: string; hotline: string; email: string }> = {
  NBI: {
    agency: 'National Bureau of Investigation (NBI)',
    hotline: '(02) 8523-8231 / 0961-734-7222',
    email: 'clearance@nbi.gov.ph',
  },
  PSA: {
    agency: 'Philippine Statistics Authority (PSA)',
    hotline: '(02) 8461-0500 / 0917-872-7722',
    email: 'info@psa.gov.ph',
  },
  PHILHEALTH: {
    agency: 'Philippine Health Insurance Corporation (PhilHealth)',
    hotline: '(02) 8441-7442',
    email: 'actioncenter@philhealth.gov.ph',
  },
};

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parseResult = chatRequestSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid chat request body', details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { messages, language, sessionId = 'anon-session' } = parseResult.data;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Step 1: Detect intent and run read-only agent tools
    let serviceCode: string | null = null;
    const lower = lastUserMessage.toLowerCase();
    if (lower.includes('nbi') || lower.includes('clearance')) {
      serviceCode = 'NBI_CLEARANCE';
    } else if (lower.includes('psa') || lower.includes('birth') || lower.includes('secpa')) {
      serviceCode = 'PSA_BIRTH_CERT';
    } else if (lower.includes('philhealth') || lower.includes('pmrf') || lower.includes('mdr')) {
      serviceCode = 'PHILHEALTH_REGISTRATION';
    }

    const toolSearchResults = await searchCharterTool({
      query: lastUserMessage,
      agency_code: serviceCode ? (serviceCode.startsWith('NBI') ? 'NBI' : serviceCode.startsWith('PSA') ? 'PSA' : 'PHILHEALTH') : undefined,
    });

    const serviceInfo = serviceCode ? await getServiceRequirementsTool({ service_code: serviceCode }) : null;

    // Stream Setup using Server-Sent Events (SSE)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Notify client of tool execution
        sendEvent({
          type: 'tool_call',
          tool: 'search_charter',
          query: lastUserMessage,
          resultsFound: toolSearchResults.count,
        });

        // Fallback condition: No chunks pass 0.65 similarity threshold
        if (toolSearchResults.count === 0) {
          const fallbackContact = serviceCode?.startsWith('PSA')
            ? OFFICIAL_FALLBACKS.PSA
            : serviceCode?.startsWith('PHILHEALTH')
              ? OFFICIAL_FALLBACKS.PHILHEALTH
              : OFFICIAL_FALLBACKS.NBI;

          // Asynchronously log unanswered query
          try {
            const supabase = createServiceClient();
            await (supabase as unknown as { from: (table: string) => { insert: (data: unknown) => Promise<unknown> } })
              .from('chat_unanswered')
              .insert({
                session_id: sessionId,
                user_query: lastUserMessage,
                reason: 'LOW_CONFIDENCE_BELOW_0.65',
                metadata: { language, serviceCode },
              });
          } catch {
            // safe ignore in offline test
          }

          sendEvent({
            type: 'fallback',
            contact: fallbackContact,
          });

          const fallbackText =
            language === 'en'
              ? `I apologize, but the official Citizen's Charter does not contain certified provisions matching your specific query. To avoid misinformation or repeat queues ("balik-pila"), please reach out directly to the official Public Assistance Desk.`
              : `Paumanhin, ngunit walang opisyal na probisyon sa Citizen's Charter ukol sa iyong katanungan. Upang maiwasan ang maling impormasyon at 'balik-pila' sa counter, mangyaring sumangguni sa opisyal na Public Assistance Desk ng ahensya.`;

          sendEvent({ type: 'token', content: fallbackText });
          sendEvent({ type: 'done' });
          controller.close();
          return;
        }

        // Send sources and structured checklist
        sendEvent({
          type: 'sources',
          sources: toolSearchResults.results.map((r) => ({
            agency: r.agency,
            service: r.service,
            section: r.section,
            breadcrumb: r.breadcrumb,
            similarity: r.similarity,
          })),
        });

        if (serviceInfo?.found && serviceInfo.service) {
          sendEvent({
            type: 'checklist',
            serviceName: serviceInfo.service.name,
            agencyName: serviceInfo.service.agencyName,
            requirements: serviceInfo.service.requirements,
            processingFee: serviceInfo.service.processingFee,
            convenienceFee: serviceInfo.service.convenienceFee,
            counterReadyTips: serviceInfo.service.counterReadyTips,
          });
        }

        // Stream answer from Gemini Flash (or deterministic streamer in offline mode)
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey !== 'your_gemini_api_key_here') {
          try {
            const ai = getGeminiClient();
            const contextText = toolSearchResults.results
              .map((r, i) => `[Source ${i + 1}: ${r.breadcrumb}]\n${r.content}`)
              .join('\n\n---\n\n');

            const langInstruction =
              language === 'fil'
                ? 'Answer in warm, clear, reassuring Filipino/Taglish. Greet the citizen respectfully.'
                : 'Answer in professional, clear, reassuring Philippine civic English.';

            const prompt = `You are GovGuide PH, the official AI Citizen's Charter assistant for Philippine Government transactions.
${langInstruction}

Strict Grounding Rules:
1. ONLY state facts, requirements, fees, and procedures explicitly present in the Official Context below.
2. Cite sources with square brackets (e.g. [NBI Clearance Charter > Documentary Requirements]).
3. Warn against common counter rejection mistakes (e.g., lack of photocopies, unreadable SECPA barcodes, expired IDs).

Citizen Question: "${lastUserMessage}"

Official Context:
${contextText}

Assistant:`;

            const streamResult = await ai.models.generateContentStream({
              model: GEMINI_FLASH_MODEL,
              contents: prompt,
            });

            for await (const chunk of streamResult) {
              const text = chunk.text;
              if (text) {
                sendEvent({ type: 'token', content: text });
              }
            }

            sendEvent({ type: 'done' });
            controller.close();
            return;
          } catch (err) {
            console.warn('[api/chat] Gemini streaming error, falling back to deterministic stream:', err);
          }
        }

        // Deterministic stream for tests / offline mode
        const topResult = toolSearchResults.results[0];
        const lines = [
          language === 'fil'
            ? `Magandang araw! Batay sa opisyal na **${topResult.agency} Citizen's Charter** (${topResult.section}):`
            : `Good day! Based on the official **${topResult.agency} Citizen's Charter** (${topResult.section}):`,
          '',
          topResult.content
            .split('\n')
            .filter((l) => l.trim() && !l.startsWith('#'))
            .slice(0, 4)
            .join('\n'),
          '',
          `📌 **Opisyal na Pinagbatayan:** [${topResult.breadcrumb}]`,
          language === 'fil'
            ? `💡 *Paalala:* Tiyaking dalhin ang orihinal na dokumento at 2 malinaw na photocopy upang 100% Counter Ready ka na sa pila!`
            : `💡 *Reminder:* Bring the original document plus 2 clear photocopies so you are 100% Counter Ready!`,
        ];

        for (const line of lines) {
          sendEvent({ type: 'token', content: line + '\n' });
        }

        sendEvent({ type: 'done' });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
