import { retrieveCharterChunks, type RetrievedChunk, type RetrieveOptions } from './retrieve';
import { getGeminiClient, GEMINI_FLASH_MODEL } from '../ai/models';
import { createServiceClient } from '../supabase/service';
import { searchQABank, detectServiceFromQuery, type QAMatchResult } from './qa-matcher';

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
  qaMatch?: {
    id: string;
    basis: string;
    reviewStatus: string;
  };
}

export const OFFICIAL_CONTACTS: Record<string, { agency: string; hotline: string; email: string }> = {
  NBI: {
    agency: 'National Bureau of Investigation (NBI)',
    hotline: '(02) 8523-8231 loc. 5440 / 0961-734-7222',
    email: 'clearance@nbi.gov.ph',
  },
  PSA: {
    agency: 'Philippine Statistics Authority (PSA)',
    hotline: '(02) 8461-0500 / 0917-872-7722',
    email: 'civilregistry@psa.gov.ph',
  },
  PHILHEALTH: {
    agency: 'Philippine Health Insurance Corporation (PhilHealth)',
    hotline: '(02) 8441-7442',
    email: 'actioncenter@philhealth.gov.ph',
  },
  SSS: {
    agency: 'Social Security System (SSS)',
    hotline: '1455 / (02) 81455',
    email: 'usssaptayo@sss.gov.ph',
  },
  PAGIBIG: {
    agency: 'Home Development Mutual Fund (Pag-IBIG)',
    hotline: '(02) 8724-4244',
    email: 'contactus@pagibigfund.gov.ph',
  },
  DFA: {
    agency: 'Department of Foreign Affairs (DFA)',
    hotline: '(02) 8234-3488',
    email: 'passportconcerns@dfa.gov.ph',
  },
  DTI: {
    agency: 'Department of Trade and Industry (DTI)',
    hotline: '1-384 / 0917-834-3330',
    email: 'bnrshelpdesk@dti.gov.ph',
  },
  BIR: {
    agency: 'Bureau of Internal Revenue (BIR)',
    hotline: '(02) 8538-3200',
    email: 'contact_us@bir.gov.ph',
  },
  PRC: {
    agency: 'Professional Regulation Commission (PRC)',
    hotline: '(02) 8735-1534',
    email: 'prc.recordsmanagement@gmail.com',
  },
  LTO: {
    agency: 'Land Transportation Office (LTO)',
    hotline: '(02) 8922-9061 to 66',
    email: 'clientcare@lto.gov.ph',
  },
  DSWD: {
    agency: 'Department of Social Welfare and Development (DSWD)',
    hotline: '(02) 8931-8101 loc. 10141',
    email: 'aics@dswd.gov.ph',
  },
  NATIONAL_ID: {
    agency: 'Philippine Identification System (PhilSys / PSA)',
    hotline: '1388 / (02) 8234-2228',
    email: 'info@philsys.gov.ph',
  },
  PWD_ID: {
    agency: 'National Council on Disability Affairs (NCDA)',
    hotline: '(02) 8951-6033',
    email: 'council@ncda.gov.ph',
  },
  DPWH: {
    agency: 'Department of Public Works and Highways (DPWH)',
    hotline: '165-02 / (02) 5304-3000',
    email: 'citizens_feedback@dpwh.gov.ph',
  },
  ARTA: {
    agency: 'Anti-Red Tape Authority (ARTA) & 8888 Citizens\' Hotline',
    hotline: '8888 / 1-ARTA (1-3842) / (02) 8478-5093',
    email: 'complaints@arta.gov.ph',
  },
  GENERAL: {
    agency: 'Anti-Red Tape Authority (ARTA) & 8888 Citizens\' Hotline',
    hotline: '8888 / 1-ARTA (1-3842) / (02) 8478-5093',
    email: 'complaints@arta.gov.ph',
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
 * Synthesizes a grounded answer based strictly on retrieved Citizen Charter chunks
 * or the GovGuide PH vetted Q&A research knowledge bank.
 */
export async function generateGroundedAnswer(
  query: string,
  options: RetrieveOptions = {},
): Promise<GroundedAnswerResult> {
  const retrieved = await retrieveCharterChunks(query, options);
  const qaMatches = searchQABank(query, {
    topK: 2,
    threshold: 0.35,
    serviceFilter: options.serviceCode,
  });

  // 1. If no charter chunks meet threshold, search the 1,000 Q&A Bank
  if (retrieved.length === 0) {
    if (qaMatches.length > 0 && qaMatches[0].score >= 0.35) {
      const topQA = qaMatches[0];
      const sourceList = topQA.sources.map((s) => ({
        agency: topQA.entry.service || 'GovGuide PH Knowledge Base',
        service: topQA.entry.service || topQA.entry.section,
        section: topQA.entry.section,
        breadcrumb: `${topQA.entry.section} > ${topQA.entry.id}`,
        similarity: topQA.score,
        snippet: s.title ? `${s.title} (${s.url})` : topQA.entry.answer.slice(0, 160),
      }));

      return {
        query,
        answer: topQA.entry.answer,
        isGrounded: true,
        sources: sourceList,
        checklist: [],
        fees: [],
        qaMatch: {
          id: topQA.entry.id,
          basis: topQA.entry.basis,
          reviewStatus: topQA.entry.review_status,
        },
      };
    }

    // Fallback if neither charter chunks nor vetted Q&A match
    const detected = detectServiceFromQuery(query);
    let agencyKey = options.agencyCode || 'NBI';
    if (detected) {
      if (detected.includes('PSA')) agencyKey = 'PSA';
      else if (detected.includes('PhilHealth')) agencyKey = 'PHILHEALTH';
      else if (detected.includes('SSS')) agencyKey = 'SSS';
      else if (detected.includes('Pag-IBIG')) agencyKey = 'PAGIBIG';
      else if (detected.includes('DFA')) agencyKey = 'DFA';
      else if (detected.includes('DTI')) agencyKey = 'DTI';
      else if (detected.includes('BIR')) agencyKey = 'BIR';
      else if (detected.includes('PRC')) agencyKey = 'PRC';
      else if (detected.includes('LTO')) agencyKey = 'LTO';
      else if (detected.includes('DSWD')) agencyKey = 'DSWD';
      else if (detected.includes('National ID')) agencyKey = 'NATIONAL_ID';
      else if (detected.includes('PWD')) agencyKey = 'PWD_ID';
    }

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

  // 3. Grounded Answer Synthesis with 4.5-second timeout for graceful fallback
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      const ai = getGeminiClient();
      const contextBlocks = retrieved
        .map((r, i) => `[Source ${i + 1}: ${r.chunk.fullBreadcrumb}]\n${r.chunk.content}`)
        .join('\n\n---\n\n');

      const qaBlocks = qaMatches
        .map((q, i) => `[Vetted Q&A ${i + 1}: ${q.entry.question}]\nAnswer: ${q.entry.answer}\nSource: ${q.entry.section} (${q.entry.id})`)
        .join('\n\n---\n\n');

      const fullContext = [contextBlocks, qaBlocks ? `### Vetted Citizen Q&A Knowledge:\n${qaBlocks}` : '']
        .filter(Boolean)
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
${fullContext}

Answer:`;

      const generatePromise = ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
      });

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));
      const response = await Promise.race([generatePromise, timeoutPromise]);

      if (response && response.text && response.text.trim().length > 20) {
        return {
          query,
          answer: response.text.trim(),
          isGrounded: true,
          sources,
          checklist,
          fees,
          qaMatch: qaMatches[0]
            ? {
                id: qaMatches[0].entry.id,
                basis: qaMatches[0].entry.basis,
                reviewStatus: qaMatches[0].entry.review_status,
              }
            : undefined,
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

  let deterministicAnswer =
    `Ayon sa opisyal na **${top.chunk.agencyName} Citizen's Charter** (${top.chunk.sectionTitle}):\n\n` +
    `${summarySnippet}\n\n` +
    `📌 **Pinagbatayan:** [${top.chunk.fullBreadcrumb}]\n` +
    `💡 Tiyaking dalhin ang mga orihinal na ID at kinakailangang dokumento upang maging handang-handa sa pila.`;

  if (qaMatches.length > 0 && qaMatches[0].score >= 0.45) {
    const topQA = qaMatches[0];
    deterministicAnswer += `\n\n📚 **Vetted Guidance (${topQA.entry.id}):** ${topQA.entry.answer}`;
  }

  return {
    query,
    answer: deterministicAnswer,
    isGrounded: true,
    sources,
    checklist,
    fees,
    qaMatch: qaMatches[0]
      ? {
          id: qaMatches[0].entry.id,
          basis: qaMatches[0].entry.basis,
          reviewStatus: qaMatches[0].entry.review_status,
        }
      : undefined,
  };
}
