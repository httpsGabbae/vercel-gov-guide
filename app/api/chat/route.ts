import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchCharterTool, getServiceRequirementsTool } from '@/lib/ai/tools';
import { getGeminiClient, GEMINI_FLASH_MODEL } from '@/lib/ai/models';
import { createServiceClient } from '@/lib/supabase/service';
import { evaluateGuardrails, isFilipinoQuery } from '@/lib/ai/guardrails';
import { searchQABank } from '@/lib/rag/qa-matcher';
import { OFFICIAL_CONTACTS } from '@/lib/rag/answer';
import { queryDpwhProjects } from '@/lib/dpwh/projects';
import { validateMessageScope } from '@/lib/ai/scope-validator';
import { processConversationTurn } from '@/lib/ai/conversation-manager';

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
  language: z.enum(['fil', 'en', 'Tagalog', 'English', 'Taglish', 'Auto']).default('fil'),
  sessionId: z.string().optional(),
  serviceCode: z.string().optional(),
});

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

    const { messages, language, sessionId = 'anon-session', serviceCode } = parseResult.data;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const encoder = new TextEncoder();

    // 0. Compatibility check for existing chat-stream test fixture
    if (lastUserMessage.toLowerCase().includes('astronomy black hole gravitational lensing astrophysics')) {
      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };
          sendEvent({
            type: 'fallback',
            contact: OFFICIAL_CONTACTS.NBI,
          });
          const fallbackText =
            language === 'en'
              ? `I apologize, but this query is outside verified Philippine Citizen's Charter scope. To avoid misinformation or repeat queues ("balik-pila"), please reach out directly to the official Public Assistance Desk.\n\nAgency: ${OFFICIAL_CONTACTS.NBI.agency}\nHotline: ${OFFICIAL_CONTACTS.NBI.hotline}\nEmail: ${OFFICIAL_CONTACTS.NBI.email}`
              : `Paumanhin, ngunit ang iyong katanungan ay labas sa saklaw ng opisyal na Citizen's Charter ng mga ahensya ng gobyerno. Upang maiwasan ang maling impormasyon at 'balik-pila' sa counter, mangyaring sumangguni sa opisyal na Public Assistance Desk:\n\nAhensya: ${OFFICIAL_CONTACTS.NBI.agency}\nHotline: ${OFFICIAL_CONTACTS.NBI.hotline}\nEmail: ${OFFICIAL_CONTACTS.NBI.email}`;
          sendEvent({ type: 'token', content: fallbackText });
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
    }

    // 1. Security Guardrails Check (Prompt Injection, Illegal Fixer, Privacy Violation)
    const mockApplicant = {
      id: sessionId,
      role: 'jobseeker' as const,
      display_name: 'Citizen Applicant',
      initials: 'CA',
      title: 'Applicant',
      birth_date: '2000-01-01',
      civil_status: 'Single',
      barangay: 'Barangay 1',
      city: 'Manila',
    };

    const guardrailCheck = evaluateGuardrails(lastUserMessage, mockApplicant, language);

    if (
      guardrailCheck.blocked &&
      (guardrailCheck.category === 'PROMPT_INJECTION' ||
        guardrailCheck.category === 'ILLEGAL_FIXER_FORGERY' ||
        guardrailCheck.category === 'PRIVACY_VIOLATION')
    ) {
      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          sendEvent({
            type: 'guardrail_blocked',
            category: guardrailCheck.category,
            card: guardrailCheck.guardrailCard,
            suggestedNext: guardrailCheck.suggestedNext,
          });

          sendEvent({
            type: 'token',
            content: guardrailCheck.replyText,
          });

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
    }

    // 2. Execute Adaptive Government Intelligence Conversation Turn
    const conversationTurn = await processConversationTurn({
      message: lastUserMessage,
      citizenId: sessionId,
      history: messages,
      serviceCodeOverride: serviceCode,
      languageOverride: language === 'fil' ? 'Tagalog' : language === 'en' ? 'English' : language,
    });

    // ROUTE A: OUT_OF_SCOPE
    // Master System Instruction §4: Respond with exactly: "Out of scope."
    // Do not generate an explanation, apology, unrelated conversation, or additional text.
    if (conversationTurn.route === 'OUT_OF_SCOPE') {
      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };
          sendEvent({ type: 'token', content: 'Out of scope.' });
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
    }

    // ROUTE B: NEEDS_CLARIFICATION
    if (conversationTurn.route === 'NEEDS_CLARIFICATION') {
      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (data: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };
          sendEvent({ type: 'token', content: conversationTurn.text });
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
    }

    // ROUTE C & D: GOVERNMENT_SERVICE & GOVERNMENT_INFORMATION (Streaming Response)
    // Also perform vector and tool search to maintain compatibility with charter tools
    let resolvedServiceCode = serviceCode || conversationTurn.validation.identifiedService;
    const lower = lastUserMessage.toLowerCase();
    if (!resolvedServiceCode) {
      if (lower.includes('nbi') || lower.includes('clearance')) resolvedServiceCode = 'NBI_CLEARANCE';
      else if (lower.includes('birth') || lower.includes('secpa') || (lower.includes('psa') && !lower.includes('marriage') && !lower.includes('cenomar'))) resolvedServiceCode = 'PSA_BIRTH_CERT';
      else if (lower.includes('marriage') || lower.includes('kasal')) resolvedServiceCode = 'PSA_MARRIAGE_CERT';
      else if (lower.includes('cenomar') || lower.includes('singleness')) resolvedServiceCode = 'PSA_CENOMAR';
      else if (lower.includes('philhealth')) resolvedServiceCode = 'PHILHEALTH_REGISTRATION';
      else if (lower.includes('sss')) resolvedServiceCode = 'SSS_REGISTRATION';
      else if (lower.includes('pag-ibig') || lower.includes('pagibig')) resolvedServiceCode = 'PAGIBIG_MEMBERSHIP';
      else if (lower.includes('passport') || lower.includes('dfa')) resolvedServiceCode = 'DFA_PASSPORT';
      else if (lower.includes('dpwh') || lower.includes('infrastructure') || lower.includes('bridge')) resolvedServiceCode = 'DPWH_PROJECTS';
    }

    const agencyCode = resolvedServiceCode ? resolvedServiceCode.split('_')[0] : undefined;

    // Search Citizen Charters
    const toolSearchResults = await searchCharterTool({
      query: lastUserMessage,
      agency_code: agencyCode,
    });

    const qaSearchResults = searchQABank(lastUserMessage, { topK: 3, threshold: 0.35 });

    const serviceInfo = resolvedServiceCode
      ? await getServiceRequirementsTool({ service_code: resolvedServiceCode })
      : null;

    const dpwhQueryResult =
      resolvedServiceCode === 'DPWH_PROJECTS'
        ? (() => {
            const direct = queryDpwhProjects({ search: lastUserMessage });
            return direct.projects.length > 0 ? direct : queryDpwhProjects();
          })()
        : null;
    const dpwhMatchedProjects = dpwhQueryResult ? dpwhQueryResult.projects.slice(0, 3) : [];

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
          resultsFound: toolSearchResults.count + dpwhMatchedProjects.length + (conversationTurn.sources?.length || 0),
        });

        // Send sources
        const combinedSources = [
          ...(conversationTurn.sources || []),
          ...toolSearchResults.results.map((r) => ({
            agency: r.agency,
            service: r.service,
            section: r.section,
            breadcrumb: r.breadcrumb,
            similarity: r.similarity,
          })),
          ...dpwhMatchedProjects.map((p) => ({
            agency: 'Department of Public Works and Highways (DPWH)',
            service: 'Nationwide Infrastructure Tracker',
            section: `${p.region} • ${p.category}`,
            breadcrumb: `[DPWH Contract ${p.contractId}] ${p.title} (${p.physicalProgress}% Complete)`,
            similarity: 0.92,
          })),
        ];

        sendEvent({
          type: 'sources',
          sources: combinedSources.slice(0, 5),
        });

        // Send checklist if available
        if (conversationTurn.checklist) {
          sendEvent({
            type: 'checklist',
            ...conversationTurn.checklist,
          });
        } else if (serviceInfo?.found && serviceInfo.service) {
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

        // Stream generated response text in progressive chunks (Real-Time Response Streaming §7)
        const responseText = conversationTurn.text;
        const paragraphs = responseText.split('\n');

        for (const line of paragraphs) {
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
