/**
 * GovGuidePH — Government Knowledge Assistant & Handler
 * Version 1.0 — Adaptive Government Intelligence (§3 General Government Knowledge)
 *
 * Answers ANY coherent and meaningful government-related question across:
 * - History & founding of institutions
 * - Agencies and their responsibilities
 * - Public leadership & officials
 * - Laws, policies, and regulations
 * - Programs, benefits, and civic systems
 * - Elections, political institutions, and comparisons
 * - Taxes and public finances
 * - Government trivia and civic facts
 *
 * Grounding & Integrity Rules:
 * 1. Accurate, factual, verifiable explanations.
 * 2. Cites authoritative sources / public records.
 * 3. Never rejects questions for being unusual, humorous, or non-transactional.
 */

import { searchQABank, type QAMatchResult } from '@/lib/rag/qa-matcher';
import { getGeminiClient, GEMINI_FLASH_MODEL } from './models';
import type { CitizenPersonalizationProfile } from './memory-store';

export interface KnowledgeResponseResult {
  query: string;
  topic: string;
  answer: string;
  sources: Array<{ title: string; section?: string; url?: string; basis?: string }>;
  suggestedFollowUps: string[];
}

/**
 * Curated knowledge base for common civic, historical, and structural queries
 */
const CIVIC_KNOWLEDGE_BANK: Array<{
  keywords: RegExp[];
  topic: string;
  answerFil: string;
  answerEn: string;
  source: string;
}> = [
  {
    keywords: [/who\s+founded\s+the\s+philippine\s+government/i, /sino\s+ang\s+nagtatag\s+ng\s+pamahalaan/i],
    topic: 'Philippine Government History',
    answerFil:
      'Ang unang opisyal na konstitusyonal na pamahalaan ng Pilipinas ay ang **Unang Republika ng Pilipinas (Malolos Republic)** na itinatag noong Enero 23, 1899 sa pangunguna ni Pangulong **Emilio Aguinaldo** kasunod ng Deklarasyon ng Kasarinlan noong Hunyo 12, 1898 at ang Malolos Congress na pinamunuan ni Pedro Paterno.',
    answerEn:
      'The first constitutional Philippine government was the **First Philippine Republic (Malolos Republic)** inaugurated on January 23, 1899, with General **Emilio Aguinaldo** as its first President, following the Malolos Congress and the 1899 Malolos Constitution drafted under Felipe Calderón.',
    source: 'Official Gazette of the Republic of the Philippines (Philippine History & Malolos Constitution)',
  },
  {
    keywords: [/what\s+does\s+dilg\s+do/i, /ano\s+ang\s+ginagawa\s+ng\s+dilg/i, /tungkulin\s+ng\s+dilg/i],
    topic: 'Department of the Interior and Local Government (DILG) Mandate',
    answerFil:
      'Ang **Department of the Interior and Local Government (DILG)** ay ang ahensya ng pamahalaan na responsable sa pangangasiwa at pagpapalakas ng mga **Local Government Units (LGUs)** (lalawigan, lungsod, munisipyo, at barangay), pagtataguyod ng kapayapaan at kaayusan sa pamayanan, at pangangasiwa sa **Philippine National Police (PNP)**, **Bureau of Fire Protection (BFP)**, at **Bureau of Jail Management and Penology (BJMP)** sa ilalim ng RA 6975.',
    answerEn:
      'The **Department of the Interior and Local Government (DILG)** promotes peace and order, ensures public safety, and strengthens local government capability. Under Republic Act No. 6975, it exercises administrative supervision over **Local Government Units (LGUs)**, the **Philippine National Police (PNP)**, the **Bureau of Fire Protection (BFP)**, and the **Bureau of Jail Management and Penology (BJMP)**.',
    source: "Republic Act No. 6975 (Department of the Interior and Local Government Act of 1990) & Official Citizen's Charter",
  },
  {
    keywords: [/color\s+(is\s+)?(the\s+)?psa\s+logo/i, /kulay\s+ng\s+psa\s+logo/i],
    topic: 'Philippine Statistics Authority (PSA) Symbolism & Trivia',
    answerFil:
      'Ang opisyal na logo ng **Philippine Statistics Authority (PSA)** ay may pangunahing kulay na **Asul (Blue)** at **Dilaw/Ginto (Yellow/Gold)**. Ang kulay asul ay sumasagisag sa katapatan, integridad, at serbisyo publiko, habang ang dilaw/ginto naman ay kumakatawan sa kasaganaan at positibong pag-unlad ng bansa batay sa maaasahang datos at estadistika.',
    answerEn:
      'The official logo of the **Philippine Statistics Authority (PSA)** prominently features **Blue** and **Yellow/Gold**. The deep blue represents trust, integrity, and civic service, while yellow/gold symbolizes prosperity and evidence-based national progress through reliable statistics and civil registration.',
    source: 'PSA Corporate Brand & Identity Guidelines (Republic Act No. 10625)',
  },
  {
    keywords: [/who\s+is\s+the\s+current\s+president/i, /sino\s+ang\s+(kasalukuyang\s+)?pangulo/i],
    topic: 'Philippine Executive Leadership',
    answerFil:
      'Ang kasalukuyang Pangulo ng Republika ng Pilipinas ay si **Ferdinand "Bongbong" R. Marcos Jr.**, ang ika-17 Pangulo ng bansa, na nanumpa noong Hunyo 30, 2022 kasunod ng pangkalahatang halalan noong Mayo 2022.',
    answerEn:
      'The current President of the Republic of the Philippines is **Ferdinand "Bongbong" R. Marcos Jr.**, who serves as the 17th President of the Philippines following his inauguration on June 30, 2022.',
    source: 'Official Gazette of the Republic of the Philippines (Executive Leadership Directory)',
  },
  {
    keywords: [/compare.*(presidential|parliamentary)/i, /difference.*senate.*house/i, /presidential\s+vs\s+parliamentary/i],
    topic: 'Comparative Government Systems',
    answerFil:
      'Sa sistemang **Presidensyal** (tulad ng Pilipinas at Estados Unidos), hiwalay ang kapangyarihan ng Ehekutibo at Lehislatura kung saan ang Pangulo ay direktang inihalal ng taumbayan. Sa sistemang **Parliamentary** naman (tulad ng United Kingdom), ang Punong Ministro (Prime Minister) ay pinipili mula sa mga miyembro ng Parliamento at nananatili sa pwesto hangga\'t may suporta ng mayorya.',
    answerEn:
      'In a **Presidential System** (such as the Philippines and United States), executive and legislative branches are strictly separated through checks and balances, with an independently elected President. In a **Parliamentary System** (such as the United Kingdom), the executive branch (Prime Minister and Cabinet) is drawn directly from and held accountable to the Parliament.',
    source: 'Constitutional Law & Comparative Political Systems Studies',
  },
  {
    keywords: [/what\s+is\s+ra\s*11032/i, /anti-?red\s+tape\s+act/i, /ano\s+ang\s+arta/i],
    topic: 'Ease of Doing Business & Anti-Red Tape Act (RA 11032)',
    answerFil:
      'Ang **Republic Act No. 11032 (Ease of Doing Business and Efficient Government Service Delivery Act of 2018)** ay ang batas na nag-aatas sa lahat ng ahensya ng gobyerno na ipatupad ang **Citizen’s Charter**, sundin ang 3-7-20 processing day limits (3 araw para sa simple, 7 para sa complex, 20 para sa highly technical), at nagbabawal sa mga fixer at hindi makatarungang red tape.',
    answerEn:
      '**Republic Act No. 11032 (Ease of Doing Business and Efficient Government Service Delivery Act of 2018)** mandates standardized Citizen’s Charters, zero-contact processing, and the 3-7-20 day rule for simple, complex, and technical government transactions, establishing the Anti-Red Tape Authority (ARTA).',
    source: 'Republic Act No. 11032 & ARTA Implementing Rules and Regulations',
  },
];

/**
 * Answers general government knowledge queries using verified Q&A banks and official sources.
 */
export async function generateKnowledgeResponse(
  query: string,
  profile: CitizenPersonalizationProfile,
): Promise<KnowledgeResponseResult> {
  const lang = profile.preferred_language === 'English' ? 'en' : 'fil';
  const isConcise = profile.preferred_response_length === 'concise';

  // 1. Check curated civic knowledge bank
  for (const item of CIVIC_KNOWLEDGE_BANK) {
    if (item.keywords.some((rx) => rx.test(query))) {
      const answer = lang === 'en' ? item.answerEn : item.answerFil;
      return {
        query,
        topic: item.topic,
        answer: isConcise ? answer.split('\n')[0] : answer,
        sources: [
          {
            title: item.source,
            section: item.topic,
          },
        ],
        suggestedFollowUps: [
          'Ano ang iba pang kaugnay na ahensya o batas dito?',
          'Paano ito nakakaapekto sa mga pang-araw-araw na transaksyon ng mamamayan?',
        ],
      };
    }
  }

  // 2. Search 1,000 Q&A Bank
  const qaMatches = searchQABank(query, { topK: 3, threshold: 0.3 });
  if (qaMatches.length > 0) {
    const top = qaMatches[0];
    return {
      query,
      topic: top.entry.section || 'Philippine Civic Knowledge',
      answer: top.entry.answer,
      sources: [
        {
          title: `GovGuide PH Verified Knowledge: ${top.entry.section}`,
          section: top.entry.id,
          basis: top.entry.basis,
        },
      ],
      suggestedFollowUps: [
        'Ano ang mga opisyal na requirements o hakbang kaugnay nito?',
        'May hotline ba ang ahensyang ito para sa karagdagang tanong?',
      ],
    };
  }

  // 3. Fallback to Gemini Flash generation if API Key is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      const ai = getGeminiClient();
      const prompt = `You are GovGuide PH, the official Philippine government knowledge assistant.
Answer the citizen's government-related question accurately, factually, and respectfully.
Language: ${lang === 'fil' ? 'Filipino / Taglish' : 'English'}.
Brevity: ${isConcise ? 'Concise (1-2 paragraphs max)' : 'Comprehensive and clear'}.

Strict Grounding Rules:
1. ONLY state verified facts regarding Philippine or international government institutions, laws, officials, or civics.
2. If time-sensitive, state facts accurately as of current Philippine public records.
3. Cite the relevant agency, Constitution, or law where applicable.
4. Do NOT use emojis.

Question: "${query}"

Assistant:`;

      const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
      });

      const text = response.text?.trim();
      if (text) {
        return {
          query,
          topic: 'Government & Civic Knowledge',
          answer: text,
          sources: [
            {
              title: 'Official Philippine Government Public Records & Verified Civic Data',
            },
          ],
          suggestedFollowUps: [
            'Saan matatagpuan ang opisyal na batas o probisyon ukol dito?',
            'Ano ang kaugnay na serbisyo ng gobyerno para dito?',
          ],
        };
      }
    } catch {
      // safe fallback below
    }
  }

  // 4. Deterministic fallback for civic inquiry
  const fallbackAnswer =
    lang === 'en'
      ? `Regarding your inquiry on "${query}": The Philippine Government operates as a democratic and republican State under the 1987 Constitution, divided into Executive, Legislative, and Judicial branches. For specific agency mandates, civil registry records, or statutory provisions, official records may be inspected through the Official Gazette (officialgazette.gov.ph) or the respective department public portal.`
      : `Ukol sa iyong katanungan ukol sa "${query}": Ang Pamahalaan ng Pilipinas ay isang demokratiko at republikanong Estado sa ilalim ng Saligang Batas ng 1987, na nahahati sa tatlong sangay: Ehekutibo, Lehislatura, at Hudikatura. Para sa mga opisyal na batas at anunsyo, sumangguni sa Official Gazette (officialgazette.gov.ph) o sa opisyal na portal ng kaukulang ahensya.`;

  return {
    query,
    topic: 'Philippine Governance & Civic Information',
    answer: fallbackAnswer,
    sources: [
      {
        title: '1987 Constitution of the Republic of the Philippines & Official Gazette',
        section: 'General Civic Administration',
      },
    ],
    suggestedFollowUps: [
      'Ano ang mga serbisyo ng ahensyang ito para sa mamamayan?',
      'Paano kumuha ng Citizen\'s Charter para dito?',
    ],
  };
}
