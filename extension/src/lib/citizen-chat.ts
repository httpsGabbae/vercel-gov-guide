/**
 * GovGuide PH — Citizen Mini Chatbot Engine
 *
 * Connects the Chrome Extension citizen popup to the GovGuide PH RAG API (/api/chat),
 * enforcing Philippine government security guardrails (RA 11032 Anti-Fixer Policy,
 * Anti-Forgery, Prompt Injection) with real-time SSE streaming and offline charter fallback.
 */

export interface ChatMessageSource {
  agency: string;
  service: string;
  section?: string;
  breadcrumb?: string;
}

export interface CitizenChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatMessageSource[];
  guardrailBlocked?: boolean;
  guardrailCategory?: 'ILLEGAL_FIXER_FORGERY' | 'PROMPT_INJECTION' | 'PRIVACY_VIOLATION' | 'OUT_OF_SCOPE';
  timestamp: string;
}

export const CITIZEN_CHAT_STORAGE_KEY = 'govguide_citizen_chat_history';

export const INITIAL_GREETING_MESSAGE: CitizenChatMessage = {
  id: 'welcome-1',
  role: 'assistant',
  content:
    'Kamusta! Ako ang iyong GovGuide AI Assistant. Magtanong tungkol sa requirements ng DFA Passport, NBI Clearance, PSA Birth Certificate, PhilHealth, o mga proseso sa counter.',
  timestamp: new Date().toISOString(),
};

/**
 * Pre-flight client guardrails check for immediate protection before hitting the API.
 * Matches backend guardrail categories defined in lib/ai/guardrails.ts.
 */
export function evaluateClientGuardrail(query: string): {
  blocked: boolean;
  category?: 'ILLEGAL_FIXER_FORGERY' | 'PROMPT_INJECTION' | 'PRIVACY_VIOLATION';
  replyText?: string;
} {
  const q = query.trim().toLowerCase();

  // 1. Anti-Fixer, Bribery & Fake Documents Guardrail (RA 11032)
  if (
    /\b(fixer|fixers|peke|fake\s*id|fake\s*document|bypass\s*counter|suhol|lagay|under\s*the\s*table|skip\s*pila|magkano\s*lakad|palakad|forgery|forge)\b/i.test(
      q
    )
  ) {
    return {
      blocked: true,
      category: 'ILLEGAL_FIXER_FORGERY',
      replyText:
        '⚠️ **BABALA: ANTI-FIXER & INTEGRITY POLICY (RA 11032)**\n\n' +
        'Mariing ipinagbabawal ng GovGuide PH at ng pamahalaan ang paggamit ng fixer, pekeng dokumento, o pagbabayad para sa "palakad" o pag-bypass sa opisyal na pila.\n\n' +
        'Ayon sa **Republic Act No. 11032** (Ease of Doing Business and Efficient Government Service Delivery Act of 2018), ang pakikipagtransaksyon sa fixer ay may kaparusahang pagkakakulong at mabibigat na multa.\n\n' +
        '**Ligtas na Aksyon:**\n' +
        '• Magsumite lamang sa opisyal na counter o lehitimong portal ng ahensya.\n' +
        '• Para mag-ulat ng fixer, tumawag sa **ARTA Hotline 8888** o mag-email sa complaints@arta.gov.ph.',
    };
  }

  // 2. Prompt Injection / Jailbreak Guardrail
  if (
    /(ignore\s+(all\s+)?(previous|system)\s+instructions|system\s+prompt|jailbreak|disregard\s+prior|pretend\s+you\s+are\s+dan|developer\s+mode)/i.test(
      q
    )
  ) {
    return {
      blocked: true,
      category: 'PROMPT_INJECTION',
      replyText:
        '🛡️ **SECURITY GUARDRAIL TRIGGERED**\n\n' +
        "Hindi pinahihintulutan ang tangkang pag-override sa system instructions o guardrails ng GovGuide PH. Gumagana ang AI na ito alinsunod lamang sa mga opisyal na Citizen's Charter ng Republika ng Pilipinas.",
    };
  }

  return { blocked: false };
}

/**
 * Offline grounded answer generator when the Next.js local server is unreachable.
 * Ensures the citizen always gets an accurate Citizen's Charter answer.
 */
export function getOfflineCharterAnswer(query: string): { content: string; sources: ChatMessageSource[] } {
  const q = query.toLowerCase();

  if (q.includes('passport') || q.includes('dfa')) {
    return {
      content:
        '**DFA Passport Application / Renewal Requirements:**\n\n' +
        '1. **Confirmed Online Appointment:** Book via passport.gov.ph.\n' +
        '2. **Original PSA Birth Certificate:** Printed on Security Paper (SECPA) with clear Local Civil Registrar (LCR) seal.\n' +
        '3. **Valid Government-Issued ID:** (PhilSys National ID, SSS/GSIS UMID, Driver’s License, Postal ID, PRC ID) with 1 clear photocopy.\n' +
        '4. **Old Passport (for renewal):** Original booklet + photocopy of data page.\n' +
        '5. **Fees:** Regular (12 working days): ₱950 | Expedited (6 working days): ₱1,200.\n\n' +
        '*(Ref: DFA Consular Affairs Citizen’s Charter 2024)*',
      sources: [
        {
          agency: 'Department of Foreign Affairs (DFA)',
          service: 'ePassport Issuance & Renewal',
          section: "Consular Services Citizen's Charter 2024",
        },
      ],
    };
  }

  if (q.includes('nbi') || q.includes('clearance')) {
    return {
      content:
        '**NBI Clearance Application Guidelines:**\n\n' +
        '1. **Online Registration:** Fill up online via clearance.nbi.gov.ph and secure reference code.\n' +
        '2. **Two (2) Valid Government IDs:** Original + photocopy (e.g. PhilSys ID, Passport, Driver’s License, UMID, PSA Birth Cert, Postal ID).\n' +
        '3. **Personal Appearance:** Required for biometrics (photo, fingerprint, signature) at chosen clearance center.\n' +
        '4. **Fees:** ₱130 clearance fee + ₱30 system fee (Total: ₱160).\n' +
        '5. **Hit Status:** If with "HIT", releasing takes 5–10 working days for verification.\n\n' +
        '*(Ref: NBI Citizen’s Charter 2024 · RA 10867)*',
      sources: [
        {
          agency: 'National Bureau of Investigation (NBI)',
          service: 'Issuance of NBI Clearance',
          section: "NBI Citizen's Charter 2024",
        },
      ],
    };
  }

  if (q.includes('psa') || q.includes('birth') || q.includes('marriage') || q.includes('cenomar')) {
    return {
      content:
        '**PSA Civil Registry Document (Birth, Marriage, CENOMAR):**\n\n' +
        '1. **Official Ordering:** Request via PSAHelpline.ph or PSA Serbilis for nationwide home delivery, or visit a PSA CRS Outlet.\n' +
        '2. **Requirements:** 1 Valid ID of applicant/requestor + Authorization letter if claiming on behalf of a direct family member.\n' +
        '3. **Fees (Doorstep Delivery):** Birth/Marriage: ₱365 per copy | CENOMAR: ₱420 per copy.\n' +
        '4. **Delivery Lead Time:** Metro Manila: 3–4 working days | Provincial: 4–8 working days.\n\n' +
        '*(Ref: Philippine Statistics Authority Civil Registration Charter 2024)*',
      sources: [
        {
          agency: 'Philippine Statistics Authority (PSA)',
          service: 'Civil Registry Copy Issuance',
          section: "PSA CRS Citizen's Charter 2024",
        },
      ],
    };
  }

  if (q.includes('philhealth') || q.includes('health')) {
    return {
      content:
        '**PhilHealth Member Registration Requirements:**\n\n' +
        '1. **PhilHealth Member Registration Form (PMRF):** Duly accomplished.\n' +
        '2. **Valid Identification:** 1 primary ID (PhilSys ID, Passport, UMID) or 2 secondary IDs.\n' +
        '3. **Supporting Records:** PSA Birth Certificate, PSA Marriage Contract (for married women).\n' +
        '4. **For Employed:** Handled by employer HR; Self-employed / Direct Contributors may pay online via PhilHealth Member Portal.\n\n' +
        '*(Ref: PhilHealth Universal Health Care Charter · RA 11223)*',
      sources: [
        {
          agency: 'Philippine Health Insurance Corporation (PhilHealth)',
          service: 'Member Registration & PIN Issuance',
          section: "PhilHealth Citizen's Charter 2024",
        },
      ],
    };
  }

  return {
    content:
      'Ayon sa **Republic Act No. 11032 (Ease of Doing Business and Anti-Red Tape Act of 2018)**, lahat ng ahensya ng gobyerno ay may standardized Citizen’s Charter na nagtatakda ng mga sumusunod:\n\n' +
      '• **Tiyak na Requirements:** Bawal humingi ng dokumentong wala sa opisyal na checklist.\n' +
      '• **Processing Time:** 3 araw para sa Simple, 7 araw para sa Complex, 20 araw para sa Highly Technical transactions.\n' +
      '• **Opisyal na Resibo:** Lahat ng bayarin ay dapat may Official Receipt (OR).\n\n' +
      'Para sa karagdagang tulong, maaari kang magtanong tungkol sa DFA Passport, PSA Birth Certificate, NBI Clearance, o PhilHealth.',
    sources: [],
  };
}

/**
 * Sends a message to the GovGuide PH /api/chat RAG backend with SSE streaming,
 * or gracefully falls back to local charter knowledge if the server is offline.
 */
export async function streamCitizenChat({
  messages,
  apiBaseUrl = 'http://localhost:3000',
  onToken,
  onSources,
  onGuardrailBlocked,
  onDone,
  onError,
}: {
  messages: CitizenChatMessage[];
  apiBaseUrl?: string;
  onToken: (token: string) => void;
  onSources?: (sources: ChatMessageSource[]) => void;
  onGuardrailBlocked?: (category: string, reply: string) => void;
  onDone: () => void;
  onError: (err: any) => void;
}) {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg) {
    onDone();
    return;
  }

  // 1. Client-Side Guardrail Pre-Check
  const clientGuardrail = evaluateClientGuardrail(lastUserMsg.content);
  if (clientGuardrail.blocked && clientGuardrail.replyText) {
    if (onGuardrailBlocked && clientGuardrail.category) {
      onGuardrailBlocked(clientGuardrail.category, clientGuardrail.replyText);
    }
    onToken(clientGuardrail.replyText);
    onDone();
    return;
  }

  // 2. Stream from Backend /api/chat
  try {
    const payload = {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      language: 'fil',
      sessionId: 'extension-citizen',
    };

    const res = await fetch(`${apiBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Chat API responded with status ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const rawJson = line.slice(6).trim();
        if (!rawJson) continue;

        try {
          const event = JSON.parse(rawJson);
          if (event.type === 'token' && typeof event.content === 'string') {
            onToken(event.content);
          } else if (event.type === 'sources' && Array.isArray(event.sources) && onSources) {
            onSources(event.sources);
          } else if (event.type === 'guardrail_blocked' && onGuardrailBlocked) {
            onGuardrailBlocked(event.category, event.reply || '');
            if (event.reply) onToken(event.reply);
          } else if (event.type === 'done') {
            onDone();
            return;
          }
        } catch {
          // ignore malformed SSE line
        }
      }
    }

    onDone();
  } catch (err: any) {
    // 3. Graceful Offline Grounded Fallback
    const fallback = getOfflineCharterAnswer(lastUserMsg.content);
    if (onSources) onSources(fallback.sources);
    onToken(fallback.content);
    onDone();
  }
}

/**
 * Storage helpers to persist the citizen chat thread across popup closes
 */
export async function loadStoredCitizenChat(): Promise<CitizenChatMessage[]> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([CITIZEN_CHAT_STORAGE_KEY], (res) => {
        if (res && res[CITIZEN_CHAT_STORAGE_KEY] && Array.isArray(res[CITIZEN_CHAT_STORAGE_KEY])) {
          resolve(res[CITIZEN_CHAT_STORAGE_KEY]);
        } else {
          resolve([INITIAL_GREETING_MESSAGE]);
        }
      });
    } catch {
      resolve([INITIAL_GREETING_MESSAGE]);
    }
  });
}

export async function saveStoredCitizenChat(messages: CitizenChatMessage[]): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [CITIZEN_CHAT_STORAGE_KEY]: messages.slice(-20) }, () => resolve());
    } catch {
      resolve();
    }
  });
}
