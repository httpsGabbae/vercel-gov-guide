import { retrieveCharterChunks, type RetrievedChunk, type RetrieveOptions } from './retrieve';
import { getGeminiClient, GEMINI_FLASH_MODEL } from '../ai/models';
import { createServiceClient } from '../supabase/service';

export interface GroundedAnswerResult {
  query: string;
  answer: string;
  isGrounded: boolean;
  sources: {
    agency: string;
    service: string;
    section: string;
    breadcrumb: string;
    similarity: number;
    snippet: string;
  }[];
  checklist: string[];
  fees: string[];
  fallbackContact?: {
    agency: string;
    hotline: string;
    email: string;
  };
}

const OFFICIAL_CONTACTS: Record<string, { agency: string; hotline: string; email: string }> = {
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

/**
 * Extracts bulleted items and fees from chunks for quick structured UI cards.
 */
function extractChecklistAndFees(chunks: RetrievedChunk[]) {
  const checklist: string[] = [];
  const fees: string[] = [];
  const primaryAgency = chunks[0]?.chunk.agencyCode;

  for (const { chunk } of chunks) {
    // Only extract checklist and fees for the relevant primary agency if multiple are retrieved
    if (primaryAgency && chunk.agencyCode !== primaryAgency) continue;

    const lines = chunk.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        (trimmed.includes('₱') ||
          trimmed.toLowerCase().includes('fee') ||
          trimmed.toLowerCase().includes('free') ||
          trimmed.toLowerCase().includes('cost')) &&
        !trimmed.startsWith('#')
      ) {
        if (trimmed.length > 5 && trimmed.length < 120) {
          const cleaned = trimmed.replace(/^[-*•]\s*/, '');
          if (!fees.includes(cleaned)) {
            fees.push(cleaned);
          }
        }
      }
      if (/^(\d+\.|\*|-)\s+/.test(trimmed) && trimmed.length > 8 && trimmed.length < 140) {
        const item = trimmed.replace(/^(\d+\.|\*|-)\s+/, '');
        if (!checklist.includes(item) && checklist.length < 6) {
          checklist.push(item);
        }
      }
    }
  }

  return { checklist, fees };
}

/**
 * Synthesizes a grounded answer based strictly on retrieved Citizen Charter chunks.
 */
export async function generateGroundedAnswer(
  query: string,
  options: RetrieveOptions = {},
): Promise<GroundedAnswerResult> {
  const retrieved = await retrieveCharterChunks(query, options);

  // 1. Fallback if no chunks meet the confidence threshold
  if (retrieved.length === 0) {
    const agencyKey = options.agencyCode || 'NBI';
    const contact = OFFICIAL_CONTACTS[agencyKey] || OFFICIAL_CONTACTS.NBI;

    // Asynchronously log to chat_unanswered in Supabase
    try {
      const supabase = createServiceClient();
      await (supabase as unknown as { from: (table: string) => { insert: (data: unknown) => Promise<unknown> } })
        .from('chat_unanswered')
        .insert({
          session_id: 'rag-query-session',
          user_query: query,
          reason: 'LOW_CONFIDENCE_THRESHOLD_BELOW_0.65',
          metadata: { threshold: options.threshold ?? 0.65 },
        });
    } catch {
      // safe ignore in offline test
    }

    return {
      query,
      answer:
        `Paumanhin, walang sapat o opisyal na probisyon sa kasalukuyang Citizen's Charter ukol sa katanungang ito. ` +
        `Upang maiwasan ang maling impormasyon at 'balik-pila' sa counter, mangyaring makipag-ugnayan sa opisyal na Public Assistance Desk:\n\n` +
        `🏛️ **Ahensya:** ${contact.agency}\n` +
        `📞 **Hotline:** ${contact.hotline}\n` +
        `✉️ **Email:** ${contact.email}`,
      isGrounded: false,
      sources: [],
      checklist: [],
      fees: [],
      fallbackContact: contact,
    };
  }

  // 2. Format Sources
  const sources = retrieved.map(({ chunk, similarity }) => ({
    agency: chunk.agencyName,
    service: chunk.serviceName,
    section: chunk.sectionTitle,
    breadcrumb: chunk.fullBreadcrumb,
    similarity,
    snippet: chunk.content.slice(0, 280) + '...',
  }));

  const { checklist, fees } = extractChecklistAndFees(retrieved);

  // 3. Grounded Answer Synthesis
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      const ai = getGeminiClient();
      const contextBlocks = retrieved
        .map((r, i) => `[Source ${i + 1}: ${r.chunk.fullBreadcrumb}]\n${r.chunk.content}`)
        .join('\n\n---\n\n');

      const prompt = `You are GovGuide PH, an authoritative, warm, and helpful Philippine Government AI Assistant.
Answer the citizen's question strictly and exclusively based on the official Citizen's Charter excerpts provided below.

Grounding Rules:
1. ONLY state facts and requirements explicitly found in the excerpts.
2. If any detail is not mentioned, clearly say "Hindi ito partikular na nabanggit sa Citizen's Charter."
3. Always cite the exact source section in brackets, e.g. [NBI Citizen's Charter > Documentary Requirements].
4. Answer in friendly, reassuring Taglish/Filipino.
5. Provide clear bullet points for requirements and exact fees.

Citizen Query: "${query}"

Official Citizen's Charter Context:
${contextBlocks}

Answer:`;

      const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
      });

      const responseText = response.text || '';
      if (responseText.trim().length > 20) {
        return {
          query,
          answer: responseText.trim(),
          isGrounded: true,
          sources,
          checklist,
          fees,
        };
      }
    } catch (err) {
      console.warn('[generateGroundedAnswer] Gemini API error, falling back to deterministic synthesis:', err);
    }
  }

  // 4. Deterministic Grounded Synthesis (Test mode / Offline fallback)
  const top = retrieved[0];
  const summarySnippet = top.chunk.content
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .slice(0, 3)
    .join(' ');

  const deterministicAnswer =
    `Ayon sa opisyal na **${top.chunk.agencyName} Citizen's Charter** (${top.chunk.sectionTitle}):\n\n` +
    `${summarySnippet}\n\n` +
    `📌 **Pinagbatayan:** [${top.chunk.fullBreadcrumb}]\n` +
    `💡 Tiyaking dalhin ang mga orihinal na ID at kinakailangang dokumento upang maging handang-handa sa pila.`;

  return {
    query,
    answer: deterministicAnswer,
    isGrounded: true,
    sources,
    checklist,
    fees,
  };
}
