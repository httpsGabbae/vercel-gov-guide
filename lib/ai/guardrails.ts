import type { ApplicantProfile, SavedVaultFile } from '@/lib/services/charter-sources';
import { parseNameParts, formatFullName } from '@/lib/services/charter-sources';
import { SERVICES_REGISTRY } from '@/lib/services/registry';

export type GuardrailCategory =
  | 'ALLOWED'
  | 'PROMPT_INJECTION'
  | 'ILLEGAL_FIXER_FORGERY'
  | 'PRIVACY_VIOLATION'
  | 'OUT_OF_SCOPE';

export interface GuardrailCardData {
  category: Exclude<GuardrailCategory, 'ALLOWED'>;
  severity: 'critical' | 'warning';
  policy_code: string;
  badge: string;
  title: string;
  summary: string;
  explanation: string;
  law_citation: string;
  blocked_input_excerpt: string;
  official_guidance: string;
  safe_alternative: string;
  official_hotline: string;
  hotline?: string;
}

export interface GuardrailEvaluation {
  blocked: boolean;
  category: GuardrailCategory;
  steps: string[];
  replyText: string;
  guardrailCard?: GuardrailCardData;
  suggestedNext: {
    id: string;
    label: string;
    hint: string;
    action: 'message' | 'attach' | 'demo_file' | 'view';
    text?: string;
    view?: 'chat' | 'referrals' | 'tasks' | 'log';
    file?: { path: string; name: string; type: string };
  }[];
}

export function isFilipinoQuery(text: string, language = 'Auto'): boolean {
  const lower = text.toLowerCase();
  const tagalogRegex =
    /\b(ano|paano|saan|kailan|sino|bakit|magkano|pwede|puwede|ba|po|opo|ang|mga|para|sa|ng|ko|akin|mo|iyo|natin|namin|kanila|naman|lang|kailangan|bayad|libre|pila|kuha|kumuha|ayos|ayusin|paki|pakisuyo|meron|mayroon|wala|walang|ito|nito|dito|dyan|diyan|doon|kamusta|kumusta|salamat|asawa|anak|tatay|nanay|bata|magulang|taga|lahat|tsek|dokumento|pirma|kasal|singleness|serbisyo|gabay|fixer|peke|bawal)\b/i;

  const englishRegex =
    /\b(what|how|why|when|where|who|is|are|can|could|would|should|do|does|did|will|my|the|this|that|please|requirements|checklist|fee|fees|cost|payment|process|steps|procedure|apply|register|appointment|valid|expired|mismatch|missing|help|birth|clearance|certificate|id|identity|passport|document|photo|review|bypass|ignore|delete|drop|table|system|prompt)\b/i;

  const hasTagalog = tagalogRegex.test(lower);
  const hasEnglish = englishRegex.test(lower);

  // If user asks in Tagalog, answer in Tagalog
  if (hasTagalog && !hasEnglish) return true;
  // If user asks in English, answer in English
  if (hasEnglish && !hasTagalog) return false;
  if (hasTagalog) return true;

  // Explicit user preference fallback
  if (language === 'Filipino' || language === 'fil') return true;
  if (language === 'English' || language === 'en') return false;

  return false;
}

/**
 * Actively learns personal profile information from user chat messages to update My Details.
 */
export function extractLearnedDetails(text: string): Partial<ApplicantProfile> {
  const result: Partial<ApplicantProfile> = {};
  const lower = text.toLowerCase();

  // 1. Explicit name fields (First Name, Middle Name, Last Name, Suffix)
  const fnMatch = text.match(/(?:first name|unang pangalan):\s*([^.,\n;]+)/i);
  if (fnMatch) result.first_name = fnMatch[1].trim();

  const mnMatch = text.match(/(?:middle name|gitnang pangalan):\s*([^.,\n;]+)/i);
  if (mnMatch) result.middle_name = mnMatch[1].trim();

  const lnMatch = text.match(/(?:last name|surname|apelyido):\s*([^.,\n;]+)/i);
  if (lnMatch) result.last_name = lnMatch[1].trim();

  const sufMatch = text.match(/(?:suffix):\s*([^,\n;]+)/i);
  if (sufMatch) result.suffix = sufMatch[1].trim();

  // General Full Name Extraction ("My name is...", "Ako si...", "Pangalan ko ay...", "Full name:...")
  const nameMatch = text.match(
    /(?:my name is|ako si|pangalan ko ay|full name:\s*)\s+([^.,\n;!?]+)/i,
  );
  if (nameMatch) {
    const rawName = nameMatch[1].trim().replace(/\b(po|nga|lang|naman)\b/gi, '').trim();
    if (rawName.split(/\s+/).length >= 2 && !rawName.toLowerCase().includes('jobseeker')) {
      result.display_name = rawName;
      const parsed = parseNameParts(rawName);
      if (!result.first_name) result.first_name = parsed.first_name;
      if (!result.middle_name) result.middle_name = parsed.middle_name;
      if (!result.last_name) result.last_name = parsed.last_name;
      if (!result.suffix) result.suffix = parsed.suffix;

      const parts = rawName.split(/\s+/);
      result.initials = (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
    }
  }

  // If display_name is not yet set but individual name fields were provided
  if (!result.display_name && (result.first_name || result.last_name)) {
    result.display_name = formatFullName(
      result.first_name,
      result.middle_name,
      result.last_name,
      result.suffix,
    );
    if (result.display_name) {
      const parts = result.display_name.split(/\s+/);
      result.initials = (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
    }
  }

  // 2. Dynamic AI Category Learning
  // Match explicit "Category: ...", "Kategorya: ..."
  const catMatch = text.match(/(?:category|kategorya):\s*([^.,\n;]+)/i);
  if (catMatch && catMatch[1].trim().length > 1) {
    result.title = catMatch[1].trim();
  } else if (/\b(solo parent|single mom|single dad|single mother|single father)\b/i.test(lower)) {
    result.title = 'Solo Parent (RA 11861)';
  } else if (/\b(first-time jobseeker|first time jobseeker|bagong aplikante|fresh grad|fresh graduate)\b/i.test(lower)) {
    result.title = 'First-Time Jobseeker (RA 11261)';
  } else if (/\b(senior citizen|senior|pensioner|senior na)\b/i.test(lower)) {
    result.title = 'Senior Citizen (RA 10645)';
  } else if (/\b(pwd|person with disability|may kapansanan|differently abled)\b/i.test(lower)) {
    result.title = 'Person with Disability (PWD · RA 7277)';
  } else if (/\b(student|estudyante|college student|high school student)\b/i.test(lower)) {
    result.title = 'Student';
  } else if (/\b(freelancer|self-employed|self employed|gig worker|virtual assistant)\b/i.test(lower)) {
    result.title = 'Freelancer / Self-Employed';
  } else if (/\b(ofw|overseas filipino worker|balikbayan|migrant worker)\b/i.test(lower)) {
    result.title = 'OFW / Returning Migrant';
  } else {
    // Pattern "I am a [category]" / "Isa akong [category]"
    const roleStatement = text.match(/(?:i am an?|isa akong|ako ay isang?)\s+([A-Za-z\s-]{3,30})/i);
    if (roleStatement) {
      const stated = roleStatement[1].trim();
      const forbidden = ['citizen', 'applicant', 'tao', 'pilipino', 'filipino', 'user', 'person'];
      if (!forbidden.includes(stated.toLowerCase())) {
        result.title = stated.charAt(0).toUpperCase() + stated.slice(1);
      }
    }
  }

  // 3. Date of Birth Extraction (YYYY-MM-DD or Month DD, YYYY)
  const isoDobMatch = text.match(/\b(19\d{2}|20[0-2]\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoDobMatch) {
    result.birth_date = isoDobMatch[0];
  } else {
    const verbalDobMatch = text.match(/(?:born on|pinanganak noong|birthday(?: ko)? ay|dob:\s*)\s*([A-Za-z]+ \d{1,2},? \d{4}|\d{1,2} [A-Za-z]+ \d{4})/i);
    if (verbalDobMatch) {
      try {
        const parsed = new Date(verbalDobMatch[1]);
        if (!isNaN(parsed.getTime())) {
          result.birth_date = parsed.toISOString().split('T')[0];
        }
      } catch {
        // ignore invalid date parse
      }
    }
  }

  // 4. Civil Status Extraction
  if (/\b(married|may asawa|kasal)\b/i.test(lower)) {
    result.civil_status = 'Married';
  } else if (/\b(single|dalaga|binata|walang asawa)\b/i.test(lower)) {
    result.civil_status = 'Single';
  } else if (/\b(widowed|biyudo|biyuda)\b/i.test(lower)) {
    result.civil_status = 'Widowed';
  } else if (/\b(separated|hiwalay)\b/i.test(lower)) {
    result.civil_status = 'Separated';
  }

  // 5. Address Extraction
  const brgyMatch = text.match(/\b(Brgy\.?\s+[A-Za-z0-9\s.-]+?)(?:,|\s+sa|\s+city|\s+lungsod|$)/i);
  if (brgyMatch) {
    result.barangay = brgyMatch[1].trim();
  }
  const cityMatch = text.match(/\b([A-Za-z\s.-]+?(?:City|Lungsod|Manila|Quezon City|Makati|Cebu|Davao|Taguig|Pasig|Caloocan))/i);
  if (cityMatch) {
    result.city = cityMatch[1].trim();
  }

  // 6. Maiden Name (if married applicant)
  const maidenMatch = text.match(/(?:maiden name|dalagang apelyido)(?:\s+ay|\s+ko)?\s+([A-Za-z\s.-]+)/i);
  if (maidenMatch) {
    result.maiden_name = maidenMatch[1].trim();
  }

  // 7. Contact info (Email & Phone)
  const emailMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) {
    result.email = emailMatch[1];
  }
  const phoneMatch = text.match(/\b(09\d{9}|\+639\d{9})\b/);
  if (phoneMatch) {
    result.phone = phoneMatch[1];
    result.contact_number = phoneMatch[1];
  }

  // 8. Father's Name (Civil Registry / PSA / NBI)
  const fatherMatch = text.match(/(?:father(?:'s)?(?:\s+full)?(?:\s+name)?(?:\s+is|\s*[:=]|\s+ay)?|pangalan ng ama|tatay(?: ko)?(?:\s+ay)?|ama(?:\s*[:=]|\s+ay)?)\s+([^.,\n;]+)/i);
  if (fatherMatch) {
    const fName = fatherMatch[1].trim();
    if (!/^(?:na|po|ay)$/i.test(fName) && fName.length > 2) {
      result.father_name = fName;
      const parts = parseNameParts(fName);
      result.father_first_name = parts.first_name;
      result.father_middle_name = parts.middle_name;
      result.father_last_name = parts.last_name;
      result.father_suffix = parts.suffix;
    }
  }

  // 9. Mother's Maiden Name (Civil Registry / PSA / NBI)
  const motherMatch = text.match(/(?:mother(?:'s)?(?:\s+maiden)?(?:\s+name)?(?:\s+is|\s*[:=]|\s+ay)?|pangalan ng ina(?:\s+sa\s+dalaga)?|ina(?:\s*[:=]|\s+ay)?|nanay(?: ko)?(?:\s+ay)?|mother maiden(?:\s*[:=]|\s+is)?)\s+([^.,\n;]+)/i);
  if (motherMatch) {
    const mName = motherMatch[1].trim();
    if (!/^(?:na|po|ay)$/i.test(mName) && mName.length > 2) {
      result.mother_maiden_name = mName;
      const parts = parseNameParts(mName);
      result.mother_first_name = parts.first_name;
      result.mother_middle_name = parts.middle_name;
      result.mother_last_name = parts.last_name;
      result.mother_suffix = parts.suffix;
    }
  }

  // 10. Philippine Identifiers
  const philsysMatch = text.match(/(?:philsys|national\s*id)(?:\s*(?:card|number|id|no\.?))?(?:\s*[:=]|\s+is|\s+ay)?\s*([0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}|[0-9]{16})/i);
  if (philsysMatch) {
    result.philsys_id = philsysMatch[1].trim();
    result.philsys_card_number = philsysMatch[1].trim();
  }

  const philhealthMatch = text.match(/(?:philhealth|pin)(?:\s*(?:card|number|id|pin|no\.?))?(?:\s*[:=]|\s+is|\s+ay)?\s*([0-9]{2}-[0-9]{9}-[0-9]{1}|[0-9]{12})/i);
  if (philhealthMatch) {
    result.philhealth_number = philhealthMatch[1].trim();
  }

  const tinMatch = text.match(/(?:tin|tax\s*id)(?:\s*(?:number|id|no\.?))?(?:\s*[:=]|\s+is|\s+ay)?\s*([0-9]{3}-[0-9]{3}-[0-9]{3}(?:-[0-9]{3})?|[0-9]{9,12})/i);
  if (tinMatch) {
    result.tin = tinMatch[1].trim();
    result.tin_number = tinMatch[1].trim();
  }

  const sssMatch = text.match(/(?:sss|crn)(?:\s*(?:number|id|no\.?))?(?:\s*[:=]|\s+is|\s+ay)?\s*([0-9]{2}-[0-9]{7}-[0-9]{1}|[0-9]{10})/i);
  if (sssMatch) {
    result.sss_number = sssMatch[1].trim();
  }

  const pagibigMatch = text.match(/(?:pag-?ibig|mid)(?:\s*(?:number|id|mid|no\.?))?(?:\s*[:=]|\s+is|\s+ay)?\s*([0-9]{4}-[0-9]{4}-[0-9]{4}|[0-9]{12})/i);
  if (pagibigMatch) {
    result.pagibig_number = pagibigMatch[1].trim();
  }

  const passportMatch = text.match(/(?:passport)(?:\s*(?:number|id|no\.?))?(?:\s*[:=]|\s+is|\s+ay)?\s*([A-Za-z][0-9]{7,8}[A-Za-z]?)/i);
  if (passportMatch) {
    result.passport_number = passportMatch[1].trim().toUpperCase();
  }

  // 11. Address Details (Street, Province, Zip)
  const streetMatch = text.match(/(?:street|house no\.?|residential address|tirahan):\s*([^.,\n;]+)/i);
  if (streetMatch) {
    result.street_address = streetMatch[1].trim();
    result.residential_address = streetMatch[1].trim();
  }
  const provMatch = text.match(/(?:province|lalawigan):\s*([^.,\n;]+)/i);
  if (provMatch) {
    result.province = provMatch[1].trim();
  }
  const zipMatch = text.match(/(?:zip(?: code)?|postal code):\s*(\d{4})/i);
  if (zipMatch) {
    result.zip_code = zipMatch[1].trim();
  }

  return result;
}

/**
 * Redacts API keys, JWTs, environment secrets, and sensitive 16-digit ID numbers
 * so secrets are never echoed or exposed in UI cards, chat messages, or audit logs.
 */
export function redactSecrets(input: string): string {
  if (!input) return '';
  return input
    .replace(/AIza[0-9A-Za-z\-_]{16,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/AQ\.[0-9A-Za-z\-_]{16,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/eyJ[0-9A-Za-z\-_]+\.[0-9A-Za-z\-_]+\.[0-9A-Za-z\-_]+/g, '[REDACTED_JWT_SECRET]')
    .replace(/\b(sk|sbp|rk|pk)_[0-9A-Za-z\-_]{12,}\b/g, '[REDACTED_SECRET_KEY]')
    .replace(/\bsk-[0-9A-Za-z\-_]{12,}\b/g, '[REDACTED_SECRET_KEY]')
    .replace(
      /\b(GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|API_KEY|SECRET_KEY|PRIVATE_KEY|PASSWORD|ACCESS_TOKEN)\s*([:=])\s*\S+/gi,
      '$1$2[REDACTED]',
    )
    .replace(/\b(\d{4})-\d{4}-\d{4}-(\d{4})\b/g, '$1-••••-••••-$2');
}

/**
 * Evaluates user input against multi-layer civic-tech guardrails:
 * 1. Prompt Injection / Jailbreak / Verification Bypass / Audit Tampering
 * 2. Illegal Fixer / Bribery / Document Forgery / Fake ID / Duplicate PIN
 * 3. RA 10173 Data Privacy Violation / Unauthorized Third-Party Record Lookup
 * 4. Out-of-Scope / Non-Government / Unverified Domain Queries
 */
export function evaluateGuardrails(
  rawText: string,
  applicant: ApplicantProfile,
  language = 'Auto',
): GuardrailEvaluation {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const isFil = isFilipinoQuery(text, language);

  // 1. Prompt Injection / System Override / Audit Tampering / Secret & API Key Exfiltration
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|your)\s+(instructions|rules|prompts)/i,
    /delete\s+(this\s+|all\s+)?(record|log|audit|database|table)/i,
    /drop\s+table/i,
    /system\s+prompt/i,
    /developer\s+mode/i,
    /\bdan\s+mode\b/i,
    /jailbreak/i,
    /bypass\s+(verification|check|security|charter|rules|guardrail)/i,
    /override\s+(the\s+)?(rules|charter|status|expired)/i,
    /pretend\s+(you\s+are|to\s+be)\s+(not|an?\s+unrestricted)/i,
    /mark\s+my\s+expired\s+id\s+as\s+valid/i,
    /force\s+approve/i,
    /\b(gemini_api_key|supabase_service_role_key|supabase_anon_key|service_role_key|api_key|secret_key|private_key|process\.env|\.env)\b/i,
    /\b(show|reveal|print|expose|leak|give|tell|display|output|dump)\b.*\b(secret|secrets|api\s*key|token|tokens|credential|credentials|password|passwords|env|environment\s+variable|private\s+key)\b/i,
    /\bwhat\s+(is|are)\s+(your|the)\s+(secret|secrets|api\s*key|system\s+prompt|hidden\s+prompt|env|credentials|tokens)\b/i,
    /AIza[0-9A-Za-z\-_]{16,}/,
    /AQ\.[0-9A-Za-z\-_]{16,}/,
    /eyJ[0-9A-Za-z\-_]+\.[0-9A-Za-z\-_]+\.[0-9A-Za-z\-_]+/,
  ];

  if (injectionPatterns.some((rx) => rx.test(text))) {
    const isSecretAttempt =
      /\b(secret|secrets|api\s*key|api_key|gemini_api_key|supabase|service_role|token|credential|password|process\.env|\.env)\b/i.test(
        text,
      ) ||
      /AIza|AQ\.|eyJ/.test(text);

    return {
      blocked: true,
      category: 'PROMPT_INJECTION',
      steps: [
        'Running input safety, secret-protection & prompt-injection guardrails',
        isSecretAttempt
          ? 'Detected attempt to access or expose protected API keys / environment secrets'
          : 'Detected attempt to override Citizen’s Charter rules or tamper with system state',
        'Redacted sensitive tokens, blocked request, and recorded event to Audit Log',
      ],
      replyText: isSecretAttempt
        ? isFil
          ? `**Guardrail Alert (Secret & Credential Protection):** Mahigpit na ipinagbabawal ang paglalabas o pagpapakita ng anumang **API keys, environment variables (\`.env\`), system secrets, JWT tokens, o database credentials**. Lahat ng sensitibong kredensyal ay nananatiling naka-isolate sa server at awtomatikong nire-redact.`
          : `**Guardrail Alert (Secret & Credential Protection):** I cannot reveal, display, or process **API keys, environment variables (\`.env\`), system secrets, JWT tokens, or service-role credentials**. All sensitive keys are strictly isolated on the server and automatically redacted from chat and audit logs.`
        : isFil
          ? `**Guardrail Alert (Security & Rule Integrity):** Hindi ko maaaring balewalain ang mga patakaran ng Citizen's Charter, baguhin ang resulta ng beripikasyon ng expired/mismatched na ID, o burahin ang Audit Log. Lahat ng pagsusuri sa GovGuidePH ay sumusunod sa opisyal na alituntunin ng NBI, PSA, at PhilHealth.`
          : `**Guardrail Alert (Security & Rule Integrity):** I cannot ignore Citizen's Charter rules, bypass document verification for expired or mismatched IDs, or delete entries from the hash-chained Audit Log. Every check in GovGuidePH strictly enforces official agency rules.`,
      guardrailCard: {
        category: 'PROMPT_INJECTION',
        severity: 'critical',
        policy_code: 'GRD-SEC-001',
        badge: isSecretAttempt ? 'SECRET PROTECTION GUARDRAIL' : 'SECURITY GUARDRAIL',
        title: isSecretAttempt
          ? 'Blocked: Secret, API Key, or Credential Exposure Attempt'
          : 'Blocked: System Rule Override / Prompt Injection Attempt',
        summary: isSecretAttempt
          ? 'Server-side secrets (GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT tokens) are strictly isolated and automatically redacted.'
          : 'GovGuidePH enforces immutable Citizen’s Charter verification rules and append-only cryptographic audit logging. System instructions and document checks cannot be bypassed.',
        explanation: isSecretAttempt
          ? 'Server-side secrets, environment variables, and raw personal identification numbers are protected by zero-leakage redaction filters and cannot be queried or echoed.'
          : 'GovGuidePH enforces immutable Citizen’s Charter verification rules and append-only cryptographic audit logging. System instructions and document checks cannot be bypassed.',
        law_citation: 'DICT Cybersecurity Policy & RA 10173 Security Safeguards (Sec. 20)',
        blocked_input_excerpt: redactSecrets(text.slice(0, 120)),
        official_guidance:
          'Use legitimate valid Primary IDs or update your civil registry records through official NBI, PSA, or PhilHealth channels.',
        safe_alternative:
          'Ask about official NBI, PSA, or PhilHealth documentary requirements, or attach a requirement document for pre-flight inspection.',
        official_hotline: 'NPC Hotline: (02) 8234-2228 · NBI: (02) 8523-8231',
      },
      suggestedNext: [
        {
          id: 'view_log',
          label: 'Open Audit & Privacy Log',
          hint: 'Verify hash-chain integrity of all recorded actions',
          action: 'view',
          view: 'log',
        },
        {
          id: 'legit_checklist',
          label: 'View legitimate NBI Clearance requirements',
          hint: 'See official accepted Primary IDs and RA 11261 rules',
          action: 'message',
          text: 'What are the official requirements for NBI Clearance?',
        },
      ],
    };
  }

  // 2. Illegal Fixer, Bribery, Fake ID / Forgery, Editing Expired Dates
  const forgeryOrFixerPatterns = [
    /\bfixer\b/i,
    /\bpa-?fixer\b/i,
    /\blagay\b|\bpadulas\b|\bunder\s+the\s+table\b|\bbribe\b|\bsuhol\b/i,
    /\b(fake|peke|pekeng|forged|counterfeit|recto)\s+(id|birth\s+cert|nbi|psa|philhealth|barangay\s+cert|dry\s+seal|signature)/i,
    /\b(photoshop|edit|tamper|alter|change)\s+(the\s+)?(expir|date|birth\s*date|name|dry\s+seal|id\s+photo)\b/i,
    /paano\s+(dayain|pekein|i-?edit\s+ang\s+id)/i,
    /how\s+to\s+(fake|forge|falsify)/i,
    /dalawang\s+philhealth\s+pin|two\s+philhealth\s+(pin|numbers)|second\s+philhealth\s+pin/i,
  ];

  if (forgeryOrFixerPatterns.some((rx) => rx.test(text))) {
    const isDuplicatePin = /philhealth\s+(pin|numbers)/i.test(text);
    return {
      blocked: true,
      category: 'ILLEGAL_FIXER_FORGERY',
      steps: [
        'Running legal compliance & anti-fixer guardrails (RA 11032 / RPC Art. 171)',
        isDuplicatePin
          ? 'Detected request for prohibited duplicate PhilHealth PIN'
          : 'Detected request involving fixers, document tampering, or falsification',
        'Blocked illegal pathway and surfaced official legal procedure',
      ],
      replyText: isDuplicatePin
        ? isFil
          ? `️ **Guardrail Alert (Bawal ang Dalawang PhilHealth PIN):** Mahigpit na ipinagbabawal sa ilalim ng **RA 11223 (Universal Health Care Act)** at PhilHealth Citizen's Charter ang pagkakaroon ng higit sa isang (1) PhilHealth Identification Number (PIN). Kung nakalimutan mo ang iyong PIN, huwag mag-rehistro ulit—mag-request lamang ng **LIBRENG PIN Verification** sa LHIO counter.`
          : `️ **Guardrail Alert (Single Lifetime PIN Rule):** Registering for a second or duplicate PhilHealth Identification Number (PIN) is strictly prohibited under **RA 11223 (Universal Health Care Act)** and the PhilHealth Citizen's Charter. Each citizen is assigned one lifetime PIN. If you lost or forgot your PIN, request a **FREE PIN Verification** at any PhilHealth LHIO or Express counter.`
        : isFil
          ? `**Guardrail Alert (Anti-Fixer & Anti-Forgery Policy):** Mahigpit na ipinagbabawal ang paggamit ng **fixer**, pagbibigay ng *lagay/padulas*, o pag-edit/pamemeke ng expired na ID, petsa ng kapanganakan, o Barangay Dry Seal. Ito ay krimen sa ilalim ng **RA 11032 (Anti-Red Tape Act)** at **Article 171/172 ng Revised Penal Code (Falsification of Public Documents)**.`
          : `**Guardrail Alert (Anti-Fixer & Anti-Forgery Policy):** I cannot assist with fixers, under-the-table facilitation fees, or editing/falsifying expired IDs, birth dates, signatures, or Barangay Dry Seals. These acts violate **Republic Act No. 11032 (Ease of Doing Business / Anti-Red Tape Act)** and **Articles 171–172 of the Revised Penal Code (Falsification of Public Documents)**.`,
      guardrailCard: {
        category: 'ILLEGAL_FIXER_FORGERY',
        severity: 'critical',
        policy_code: 'GRD-LAW-002',
        badge: 'ANTI-FIXER & ANTI-FORGERY',
        title: isDuplicatePin
          ? 'Blocked: Prohibited Duplicate PhilHealth PIN Registration'
          : 'Blocked: Fixer, Bribery, or Document Tampering Request',
        summary: isDuplicatePin
          ? 'Citizens are only allowed one (1) lifetime PhilHealth PIN. Duplicate registrations cause contribution splitting and claim holds.'
          : 'Presenting altered IDs, fake dry seals, or dealing with fixers leads to immediate counter confiscation, permanent record flagging, and criminal liability.',
        explanation: isDuplicatePin
          ? 'Citizens are only allowed one (1) lifetime PhilHealth PIN. Duplicate registrations cause contribution splitting and claim holds.'
          : 'Presenting altered IDs, fake dry seals, or dealing with fixers leads to immediate counter confiscation, permanent record flagging, and criminal liability.',
        law_citation: isDuplicatePin
          ? 'RA 11223 (Universal Health Care Act) & PhilHealth Charter'
          : 'RA 11032 (Anti-Red Tape Act of 2018) & RPC Art. 171–172',
        blocked_input_excerpt: redactSecrets(text.slice(0, 120)),
        official_guidance: isDuplicatePin
          ? 'Bring 1 Valid ID to any PhilHealth LHIO counter for free Member Static Information / PIN Verification.'
          : 'First-Time Jobseekers can get NBI Clearance, PSA Birth Certificate, and Barangay Certifications 100% FREE (₱0.00) legally under RA 11261.',
        safe_alternative: isDuplicatePin
          ? 'Bring 1 Valid ID to any PhilHealth LHIO counter for free Member Static Information / PIN Verification.'
          : 'First-Time Jobseekers can get NBI Clearance, PSA Birth Certificate, and Barangay Certifications 100% FREE (₱0.00) legally under RA 11261.',
        official_hotline: 'ARTA Complaints Hotline: 1-3842 / (02) 8478-5093',
        hotline: 'ARTA Complaints Hotline: 1-3842 / 8478-5093',
      },
      suggestedNext: [
        {
          id: 'free_jobseeker',
          label: 'How to get FREE NBI & Barangay Cert legally (RA 11261)',
          hint: '₱0.00 official fee for First-Time Jobseekers—no fixer needed',
          action: 'message',
          text: 'How do I avail the free NBI Clearance for First-Time Jobseekers under RA 11261?',
        },
        {
          id: 'fix_mismatch_legally',
          label: 'How to legally fix a birth date or name mismatch',
          hint: 'Official PSA RA 9048 / RA 10172 and Marriage Certificate rules',
          action: 'message',
          text: 'What is the legal process if my birth date or surname on my ID does not match my PSA Birth Certificate?',
        },
      ],
    };
  }

  // 3. RA 10173 Data Privacy Violation / Unauthorized Third-Party Lookup
  const privacyPatterns = [
    /check\s+(the\s+)?(criminal\s+record|nbi\s+hit|background)\s+of\s+(my\s+neighbor|another\s+person|someone\s+else|boyfriend|girlfriend|employee)/i,
    /(get|give\s+me|leak|access|view)\s+(someone\s+else's|another\s+(person's|citizen's)|my\s+(friend's|neighbor's|cousin's|sibling's))\s+(psa|birth\s+cert|nbi|mdr|record)/i,
    /without\s+(authorization|spa|consent|permission).*(psa|birth\s+cert|nbi|mdr|record)/i,
    /(psa|birth\s+cert|nbi|mdr|record).*without\s+(authorization|spa|consent|permission)/i,
    /walang\s+(authorization\s+letter|spa|paalam)\s+pero\s+kukunin\s+ko/i,
    /show\s+me\s+all\s+(citizens|applicants|users|passwords|database\s+records)/i,
    /dump\s+(all\s+)?(pii|personal\s+data|users)/i,
  ];

  if (privacyPatterns.some((rx) => rx.test(text))) {
    return {
      blocked: true,
      category: 'PRIVACY_VIOLATION',
      steps: [
        'Running RA 10173 Data Privacy Act & PD 603 confidentiality guardrails',
        'Detected unauthorized third-party record access request without consent/SPA',
        'Blocked disclosure and returned legal representative requirements',
      ],
      replyText: isFil
        ? `**Guardrail Alert (RA 10173 Data Privacy Act):** Hindi pinahihintulutan ang pagtingin o pagkuha ng NBI record, PSA Birth Certificate, o PhilHealth MDR ng ibang tao nang walang opisyal na pahintulot. Sa ilalim ng **RA 10173 (Data Privacy Act of 2012)** at **PD 603**, tanging ang may-ari (o awtorisadong kinatawan na may **Signed Authorization Letter / Notarized SPA** at orihinal na ID ng may-ari at kinatawan) ang maaaring kumuha ng dokumento.`
        : `**Guardrail Alert (RA 10173 Data Privacy Act):** I cannot look up another person's confidential NBI clearance status, PSA civil registry document, or PhilHealth MDR without authorization. Under **Republic Act No. 10173 (Data Privacy Act of 2012)** and **Article 7 of PD 603**, civil registry and clearance records are strictly confidential.`,
      guardrailCard: {
        category: 'PRIVACY_VIOLATION',
        severity: 'critical',
        policy_code: 'GRD-PRV-003',
        badge: 'RA 10173 DATA PRIVACY',
        title: 'Blocked: Unauthorized Third-Party Personal Data Request',
        summary:
          'Civil registry documents (PSA SECPA), criminal record clearances (NBI), and health records (PhilHealth MDR) are protected personal information.',
        explanation:
          'Civil registry documents (PSA SECPA), criminal record clearances (NBI), and health records (PhilHealth MDR) are protected personal information.',
        law_citation: 'RA 10173 (Data Privacy Act of 2012) & PD 603 (Child & Youth Welfare Code)',
        blocked_input_excerpt: redactSecrets(text.slice(0, 120)),
        official_guidance:
          'If you are claiming a PSA document as an authorized representative, you must present: (1) Notarized SPA or Signed Authorization Letter, (2) Original + Photocopy of the Document Owner’s Primary ID, and (3) Original + Photocopy of the Representative’s Primary ID.',
        safe_alternative:
          'If you are claiming a PSA document as an authorized representative, you must present: (1) Notarized SPA or Signed Authorization Letter, (2) Original + Photocopy of the Document Owner’s Primary ID, and (3) Original + Photocopy of the Representative’s Primary ID.',
        official_hotline: 'National Privacy Commission (NPC): (02) 8234-2228',
        hotline: 'National Privacy Commission (NPC): (02) 8234-2228',
      },
      suggestedNext: [
        {
          id: 'rep_rules',
          label: 'View Authorized Representative & SPA Checklist for PSA',
          hint: 'Exact requirements when claiming for a relative',
          action: 'message',
          text: 'What are the exact requirements if an authorized representative claims a PSA Birth Certificate?',
        },
      ],
    };
  }

  // 4. Out-of-Scope / Unrelated Non-Government Queries or Isolated Numbers
  const isPureNumberOrSymbols = /^[\d\s.,#\-_+]+$/.test(text);

  const civicOrSystemKeywords =
    /\b(nbi|psa|philhealth|clearance|birth|marriage|cenomar|secpa|pmrf|mdr|pin|id|ids|passport|dfa|lto|license|sss|umid|pag-?ibig|tin|bir|postal|philsys|national\s+id|barangay|brgy|oath|undertaking|jobseeker|jobseekers|ra\s*11261|ra\s*10173|ra\s*10645|ra\s*9048|ra\s*10172|requirement|requirements|checklist|checklists|expire|expired|expiration|mismatch|mismatched|missing|document|documents|form|forms|certificate|certificates|cert|fee|fees|bayad|presyo|magkano|free|libre|schedule|appointment|appointments|walk-?in|online|hit|renewal|renew|representative|representatives|spa|authorization|senior|indigent|dependent|dependents|spouse|child|children|married|maiden|surname|middle\s+name|birth\s*date|dob|signature|pirma|dry\s+seal|selyo|photocopy|xerox|laminated|blurry|counter|pila|balik-?pila|govguideph|govguide|kaagapai|kaagap|audit|log|logs|inspect|inspection|check|verify|verification|status|profile|service|services|agency|agencies|valid|primary|secondary|dpwh|infrastructure|kalsada|tulay|bridge|tunnel|expressway|flood\s+control|bataan|samal|panguil|hello|hi|hey|good\s+morning|good\s+afternoon|good\s+evening|kumusta|kamusta|tulong|help|salamat|thank|thanks|ano|paano|saan|kailan|pwede|puwede|what\s+can\s+you|how\s+does|president|mayor|governor|senator|congress|dilg|doh|deped|dswd|dole|dti|bsp|gov|government|gobyerno|batas|law|laws|constitution|saligang\s+batas)\b/i;

  const obviousOutOfScopePatterns = [
    /\b(write\s+a\s+(poem|song|essay|python|javascript|react|sql)|solve\s+this\s+math|bitcoin|crypto|stock\s+market|forex|recipe|cook|adobo|sinigang|halo-?halo|regalo|pasko|eleksyon\s+sa\s+amerika|kantahan|gawan\s+ng\s+tula|fix\s+my\s+car|car\s+engine|scrape\s+facebook|capital\s+of\s+france|nba\s+championship|nba\s+score|movie\s+review|horoscope|zodiac|videogame|valorant|dota|minecraft)\b/i,
  ];

  const isGreeting =
    /^(hi|hello|hey|good\s+(morning|afternoon|evening)|kumusta|kamusta)(\s+(po|govguide|kaagapai|there|friend)|\s*[!?.])*$/i.test(text) ||
    (text.split(/\s+/).length <= 4 && /^(hi|hello|hey|kumusta|kamusta)\b/i.test(text));

  const isOutOfScope =
    isPureNumberOrSymbols ||
    obviousOutOfScopePatterns.some((rx) => rx.test(text)) ||
    (!isGreeting && !civicOrSystemKeywords.test(text));

  if (isOutOfScope) {
    return {
      blocked: true,
      category: 'OUT_OF_SCOPE',
      steps: [
        'Checking query against GovGuidePH Citizen’s Charter domain scope',
        isPureNumberOrSymbols
          ? 'Isolated numbers or symbols without prior conversational request'
          : 'Query falls outside verified Philippine government pre-flight services',
        'Activated domain guardrail to prevent ungrounded hallucination',
      ],
      replyText: isPureNumberOrSymbols
        ? 'Out of scope.'
        : isFil
          ? `[Scope Guardrail: Labas sa Saklaw ng Citizen's Charter] Ang GovGuidePH ay nakatuon lamang sa Philippine Government Pre-Flight Requirements, Checklists, at AI Document Inspection (partikular sa NBI Clearance, PSA Birth/Marriage Certificate, PhilHealth Registration, at mga kaugnay na Valid Primary IDs). Upang maiwasan ang maling impormasyon, hindi ako sumasagot sa mga tanong na labas sa opisyal na Citizen's Charter.`
          : `[Scope Guardrail: Outside Verified Citizen's Charter Scope] GovGuidePH is strictly scoped to Philippine Government Pre-Flight Requirements, Checklists, and AI Document Inspection (covering NBI Clearance, PSA Civil Registry Certificates, PhilHealth Registration, and Valid Primary IDs). To prevent hallucination, I only answer questions grounded in official Citizen's Charters.`,
      guardrailCard: {
        category: 'OUT_OF_SCOPE',
        severity: 'warning',
        policy_code: 'GRD-SCP-004',
        badge: 'DOMAIN SCOPE GUARDRAIL',
        title: 'Out-of-Scope Query: Grounded to Official Citizen’s Charters Only',
        summary:
          'This assistant only answers questions regarding Philippine government documentary requirements, fees, turnaround times, and ID/document discrepancy checks.',
        explanation:
          'This assistant only answers questions regarding Philippine government documentary requirements, fees, turnaround times, and ID/document discrepancy checks.',
        law_citation: 'GovGuidePH Grounding Policy (Threshold >= 0.65 Similarity)',
        blocked_input_excerpt: redactSecrets(text.slice(0, 120)),
        official_guidance:
          'Ask about NBI Clearance, PSA Birth/Marriage Certificates, PhilHealth PMRF/MDR, First-Time Jobseeker (RA 11261) benefits, or upload your ID/document for inspection.',
        safe_alternative:
          'Ask about NBI Clearance, PSA Birth/Marriage Certificates, PhilHealth PMRF/MDR, First-Time Jobseeker (RA 11261) benefits, or upload your ID/document for inspection.',
        official_hotline: 'NBI: (02) 8523-8231 · PSA: (02) 8461-0500 · PhilHealth: (02) 8441-7442',
        hotline: 'NBI: (02) 8523-8231 · PSA: (02) 8461-0500 · PhilHealth: (02) 8441-7442',
      },
      suggestedNext: [
        {
          id: 'nbi_req',
          label: 'Prepare NBI Clearance Requirements Checklist',
          hint: 'Includes RA 11261 First-Time Jobseeker & regular renewal rules',
          action: 'message',
          text: 'What are the requirements and fees for NBI Clearance?',
        },
        {
          id: 'psa_req',
          label: 'Prepare PSA Birth Certificate SECPA Checklist',
          hint: 'Walk-in CRS appointment, fees, and valid IDs',
          action: 'message',
          text: 'How do I get a PSA Birth Certificate and what IDs are accepted?',
        },
        {
          id: 'philhealth_req',
          label: 'Prepare PhilHealth Registration (PMRF / MDR) Checklist',
          hint: 'Free PIN registration, dependents, and senior citizen subsidy',
          action: 'message',
          text: 'What are the requirements for PhilHealth registration and adding dependents?',
        },
      ],
    };
  }

  return {
    blocked: false,
    category: 'ALLOWED',
    steps: [],
    replyText: '',
    suggestedNext: [],
  };
}

/**
 * Comprehensive Grounded Q&A Engine covering ALL possible legitimate questions in the system:
 * - Greetings & System Capabilities ("How does this work?", "What can you check?")
 * - Applicant Profile & Status ("Who am I?", "What is my current checklist status?")
 * - NBI Clearance (Requirements, Primary IDs, Fees, RA 11261 Free Jobseeker, HIT vs No HIT, Renewal, Online Ref, Payment)
 * - PSA Birth/Marriage/CENOMAR (Requirements, Fees, CRS Appointment, Representative/SPA, Maiden/Married Surname, Clerical Errors RA 9048/10172, Laminated SECPA)
 * - PhilHealth Registration (PMRF, Free PIN/MDR, Dependents, Senior Citizen RA 10645, Indigent, Single PIN Rule, Updating Status)
 * - Document Discrepancy Rules (Expired IDs, Mismatched Birth Date / Name, Missing Signature / Barangay Dry Seal)
 * - Other Philippine Primary IDs (DFA Passport, LTO Driver's License, SSS/UMID, Postal ID, PhilSys National ID)
 */
export function answerSystemQuestion(
  rawText: string,
  applicant: ApplicantProfile,
  language = 'Auto',
  detectedServiceCode?: string,
  savedFiles?: SavedVaultFile[],
): {
  replyText: string;
  serviceCode: string;
  includeChecklist: boolean;
  steps: string[];
} {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const isFil = isFilipinoQuery(text, language);
  const resolvedCode =
    detectedServiceCode ||
    (lower.includes('nbi') || lower.includes('clearance')
      ? 'NBI_CLEARANCE'
      : lower.includes('psa') || lower.includes('birth')
        ? 'PSA_BIRTH_CERT'
        : lower.includes('philhealth')
          ? 'PHILHEALTH_REGISTRATION'
          : 'GENERAL');
  const serviceDef = SERVICES_REGISTRY[resolvedCode] || SERVICES_REGISTRY.NBI_CLEARANCE;

  // 1. Greetings / General Help / System Overview
  if (
    /^(hi|hello|hey|good\s+(morning|afternoon|evening)|kumusta|kamusta|help|tulong|what\s+can\s+you\s+do|ano\s+ang\s+kaya\s+mong\s+gawin|how\s+does\s+this\s+work)\b/i.test(
      lower,
    ) &&
    text.split(/\s+/).length <= 10
  ) {
    return {
      serviceCode: 'NBI_CLEARANCE',
      includeChecklist: false,
      steps: [
        'Verified active citizen profile & Citizen’s Charter knowledge base',
        'Prepared overview of supported government services & AI document checks',
      ],
      replyText: isFil
        ? `Magandang araw, **${applicant.display_name}**! Ako ang **GovGuide PH**, ang iyong AI Pre-Flight Assistant para maiwasan ang *balik-pila* sa gobyerno. Maaari mo akong tanungin tungkol sa:\n\n1. **Requirements Checklists & Bayarin:** Opisyal na listahan para sa **NBI Clearance**, **PSA Birth/Marriage Certificate**, at **PhilHealth Registration (PMRF/MDR)**.\n2. **AI Document & ID Inspection:** I-upload o i-attach ang iyong ID, Barangay Certificate, o form at susuriin ko kung may **Expired Info** (hal. paso na ang ID o >90 araw na ang Barangay Cert), **Mismatched Info** (hal. hindi tugma ang birth date o apelyido sa PSA), o **Missing Info** (hal. walang pirma o walang Barangay Dry Seal).\n3. **Special Laws:** Libreng kuha para sa **First-Time Jobseekers (RA 11261)**, **Senior Citizens (RA 10645)**, at **Authorized Representatives (RA 10173)**.\n\nMaaari kang magtanong sa chat o mag-upload ng ID gamit ang **+** button!`
        : `Hello, **${applicant.display_name}**! I am **GovGuide PH**, your AI Pre-Flight Assistant designed to eliminate repeat queueing (*balik-pila*). I can help you with:\n\n1. **Official Checklists & Fees:** Complete requirements, fees, and turnaround times for **NBI Clearance**, **PSA Birth/Marriage Certificates**, and **PhilHealth Registration (PMRF/MDR)**.\n2. **AI Document & ID Inspection:** Attach photos or PDFs of your IDs, certificates, or forms, and I will check for **Expired Info** (expired IDs or >90-day Barangay Certs), **Mismatched Info** (birth date or maiden/married surname discrepancies), and **Missing Info** (missing signatures, missing Barangay Dry Seal, or missing 2nd ID).\n3. **Legal Exemptions & Rules:** **First-Time Jobseeker (RA 11261)** ₱0.00 fee exemptions, **Authorized Representative (RA 10173)** SPA rules, and **Clerical Error (RA 9048/10172)** procedures.\n\nAsk any question in chat or click **+** to upload a document for inspection!`,
    };
  }

  // 2. Questions about Expired, Mismatched, or Missing Info (How to fix discrepancies)
  if (
    /\b(mismatch|mismatched|wrong\s+(birth\s*date|dob|name|spelling|surname)|typo|clerical\s+error|ra\s*9048|ra\s*10172|maiden|married\s+name|magkaiba\s+ang\s+(pangalan|birthday|apelyido)|mali\s+ang\s+(spelling|birthday))\b/i.test(
      lower,
    )
  ) {
    return {
      serviceCode: lower.includes('nbi') ? 'NBI_CLEARANCE' : 'PSA_BIRTH_CERT',
      includeChecklist: true,
      steps: [
        'Searched PSA & NBI Citizen’s Charter Data Consistency & Civil Registry provisions',
        'Cross-checked RA 9048 / RA 10172 clerical error rules and married surname rules',
      ],
      replyText: isFil
        ? `**Paano Ayusin ang Mismatched Info (Pangalan, Apelyido, o Petsa ng Kapanganakan):**\n\n- **1. Kung Magkaiba ang Petsa ng Kapanganakan o Spelling sa ID vs. PSA Birth Certificate:** Ang **PSA Birth Certificate (SECPA)** ang kinikilalang pangunahing batayan (*primary source*). Kung mali ang nasa ID mo, gamitin muna ang ibang Valid Primary ID na tugma sa PSA Birth Certificate (gaya ng PhilSys National ID o Passport). Kung ang PSA Birth Certificate mismo ang may typo sa pangalan o araw/buwan ng kapanganakan, maghain ng **Petition for Clerical Error Correction (RA 9048 / RA 10172)** sa **Local Civil Registrar (LCR)** kung saan ka ipinanganak.\n- **2. Kung Maiden Name (Dalaga) ang nasa ID pero Married Name (May-Asawa) ang nasa Application Form:** Huwag mag-alala! Dalhin lamang ang orihinal at photocopy ng iyong **PSA Marriage Certificate** bilang supporting document upang patunayan ang pagbabago ng apelyido \`[PSA & NBI Citizen's Charter]\`.`
        : `**How to Resolve Mismatched Information (Name, Surname, or Birth Date Discrepancies):**\n\n- **1. Birth Date or Name Spelling Mismatch (ID vs. PSA Birth Certificate):** Government counters treat your **PSA Birth Certificate (SECPA)** as the master record. If one of your IDs has an incorrect birth date (e.g., \`1999-08-14\` instead of \`1999-05-14\`), do **not** present that ID at the counter—present an unexpired Primary ID that matches your PSA Birth Certificate (such as a PhilSys National ID or Passport). If the typo is on the PSA Birth Certificate itself, file an administrative correction petition under **RA 9048 / RA 10172** at your **Local Civil Registry Office (LCRO)**.\n- **2. Maiden Surname vs. Married Surname Mismatch:** If your Valid ID still bears your maiden surname (e.g., *Reyes*) while your application form uses your married surname (*Reyes-Santos*), bring your original **PSA Marriage Certificate** alongside your ID \`[PSA & NBI Citizen's Charter]\`.`,
    };
  }

  // 3. Questions about Accepted Valid Primary IDs vs Rejected Secondary IDs
  if (
    /\b(what\s+(are\s+the\s+)?valid\s+id|accepted\s+(primary\s+)?id|anong\s+(mga\s+)?valid\s+id|tinatanggap\s+ba\s+ang|philsys|national\s+id|postal\s+id|company\s+id|barangay\s+id|tin\s+id|philhealth\s+id|driver'?s\s+license|passport|umid)\b/i.test(
      lower,
    )
  ) {
    return {
      serviceCode: resolvedCode,
      includeChecklist: true,
      steps: [
        'Retrieved Official List of Accepted Primary Government IDs from Citizen’s Charters',
        'Verified ID expiration, signature, and secondary ID restrictions',
      ],
      replyText: isFil
        ? `🪪 **Opisyal na Listahan ng Tinatanggap na Valid Primary IDs \`[NBI / PSA / PhilHealth Citizen's Charter]\`:**\n\n- **Tinatanggap na Primary IDs (Kailangang Orihinal, Hindi Expired, at may Malinaw na Litrato/Pirma):**\n  1. **PhilSys National ID** (Physical Card, ePhilID printed copy, o Digital National ID — *Walang Expiration sa ilalim ng RA 11055*)\n  2. **DFA Philippine Passport**\n  3. **LTO Driver’s License**\n  4. **SSS / GSIS UMID Card**\n  5. **PRC Professional ID**\n  6. **Philippine Postal ID** (*Tiyaking hindi pa lampas sa expiration date*)\n  7. **COMELEC Voter’s ID o Voter’s Certification**\n  8. **Senior Citizen OSCA ID / PWD ID**\n\n- ️ **HINDI Tinatanggap bilang Primary ID sa NBI/PSA:** Company ID, School ID (maliban kung estudyante pa at may kasamang PSA Birth Cert), Barangay ID, Police Clearance, o lumang TIN card na walang security features.`
        : `🪪 **Official Accepted Valid Primary Government IDs \`[NBI / PSA / PhilHealth Citizen's Charter]\`:**\n\n- **Accepted Primary IDs (Must be Original, Unexpired, and Untampered):**\n  1. **PhilSys National ID** (Card, ePhilID paper format, or official Digital ID — *Non-expiring under RA 11055*)\n  2. **DFA Philippine Passport**\n  3. **LTO Driver’s License**\n  4. **SSS / GSIS UMID Card**\n  5. **PRC License ID**\n  6. **Philippine Postal ID** (*Must be unexpired at the time of presentation*)\n  7. **COMELEC Voter’s ID or Official Voter’s Certification**\n  8. **Senior Citizen (OSCA) ID / PWD ID**\n\n- ️ **Common Counter Rejections:** Expired IDs, unsigned IDs, laminated PSA certificates, Company IDs, and Barangay IDs (a Barangay ID is distinct from a **RA 11261 Barangay First-Time Jobseeker Certification**). Note that **NBI Clearance requires two (2) Valid Primary IDs**, while **PSA and PhilHealth require one (1) Primary ID**.`,
    };
  }

  // 4. First-Time Jobseeker (RA 11261) Questions
  if (
    /\b(first-?time\s+job\s*seeker|ra\s*11261|barangay\s+cert|oath\s+of\s+undertaking|dry\s+seal|90\s*days|libre\s+ba|free\s+nbi)\b/i.test(
      lower,
    )
  ) {
    return {
      serviceCode: 'NBI_CLEARANCE',
      includeChecklist: true,
      steps: [
        'Loaded Republic Act No. 11261 (First-Time Jobseekers Assistance Act) provisions',
        'Checked 90-day Barangay Certification validity, Dry Seal, and Oath of Undertaking rules',
      ],
      replyText: isFil
        ? `**Gabay sa First-Time Jobseekers Act (RA 11261) — 100% LIBRE (₱0.00):**\n\n- **Benepisyo:** Libre (₱0.00) ang pagkuha ng **NBI Clearance**, **PSA Birth Certificate**, **Police Clearance**, at **Barangay Certification** para sa mga unang beses maghahanap ng trabaho (isang beses lamang magagamit).\n- **Mga Kailangang Dalhin:**\n  1. **Orihinal na Barangay Certification (RA 11261 Form):** Kailangang nakatira ka sa barangay nang hindi bababa sa 6 na buwan, **may bisa lamang sa loob ng 90 araw mula nang ma-issue**, at may **Official Embossed Barangay Dry Seal**.\n  2. **Nilagdaang Oath of Undertaking:** Kailangang may pirma mo at ng Barangay Official.\n  3. **Dalawang (2) Valid Government IDs** (o 1 Primary ID + PSA Birth Certificate).\n  4. **Online Appointment Reference Number** sa \`clearance.nbi.gov.ph\` (piliin ang *First-Time Jobseeker* option).`
        : `**First-Time Jobseekers Assistance Act (RA 11261) — 100% FREE (₱0.00):**\n\n- **Fee Exemption:** Under **RA 11261**, First-Time Jobseekers are 100% exempt from paying the \`₱130.00\` NBI fee and \`₱25.00\` e-payment fee (Total: **₱0.00**, valid for one-time availment per agency).\n- **Mandatory Requirements (Strict Counter Checks):**\n  1. **Original Barangay Certification (RA 11261):** Must certify at least 6 months residency, must be **within 90 days of its issuance date** (expired after 90 days), and must bear the **Official Embossed Barangay Dry Seal**.\n  2. **Signed Oath of Undertaking:** Must be signed by the applicant.\n  3. **Two (2) Valid Primary Government IDs** (or 1 Primary ID + Original PSA Birth Certificate).\n  4. **Online Registration Reference Number** via \`https://clearance.nbi.gov.ph\` under the First-Time Jobseeker portal.`,
    };
  }

  // 5. NBI "HIT", Processing Time, Fees, Payment, or Renewal Questions
  if (
    resolvedCode === 'NBI_CLEARANCE' ||
    (/\b(nbi|hit|with\s+hit|no\s+hit|quality\s+control|magkano\s+ang\s+nbi|nbi\s+fee|nbi\s+renewal|gcash|7-?eleven|bayad\s+center)\b/i.test(
      lower,
    ) && resolvedCode !== 'GENERAL')
  ) {
    const asksHit = /\bhit\b|ilang\s+araw|how\s+long|processing\s+time|gaano\s+katagal/i.test(lower);
    const asksFee = /\b(fee|magkano|price|cost|bayad|payment|gcash|maya|7-?eleven)\b/i.test(lower);

    return {
      serviceCode: 'NBI_CLEARANCE',
      includeChecklist: true,
      steps: [
        "Retrieved NBI Clearance Citizen's Charter 2025 (Schedule of Fees, Processing Time & HIT Verification)",
        'Prepared complete NBI Clearance requirements & counter-ready tips',
      ],
      replyText: isFil
        ? `**Opisyal na Gabay sa NBI Clearance \`[NBI Citizen's Charter 2025]\`:**\n\n- **Mga Requirements:** **2 Valid Primary Government IDs** (orihinal at hindi expired) + **NBI Online Reference Number** mula sa \`https://clearance.nbi.gov.ph\`.\n- **Bayarin (Fees):** **₱130.00** (Processing Fee) + **₱25.00** (E-Payment System Fee) = **₱155.00** sa GCash, Maya, Bayad Center, o 7-Eleven (*Walang cash payment sa mismong NBI counter*). **LIBRE (₱0.00)** para sa First-Time Jobseekers (RA 11261).\n- **Gaano Katagal (No HIT vs. With HIT):**\n  - **Walang HIT (No Namesake Match):** Makukuha agad sa loob ng **15–30 minuto** (Same-Day Release).\n  - **May HIT (Kapangalan sa Derogatory Database):** Kailangan ng **5 hanggang 10 working days** para sa manual *Quality Control Verification*. Bumalik lamang sa petsang nakatatak sa iyong resibo.\n- **Opisyal na Hotline:** \`(02) 8523-8231 loc. 5440\` / \`0961-734-7222\` | Email: \`clearance@nbi.gov.ph\`.`
        : `**Official NBI Clearance Guide \`[NBI Citizen's Charter 2025]\`:**\n\n- **Documentary Requirements:** **Two (2) Valid Primary Government IDs** (original, unexpired, with clear photo & signature) + **NBI Online Reference Number** booked at \`https://clearance.nbi.gov.ph\`.\n- **Official Fees & Payment:** **₱130.00** clearance fee + **₱25.00** e-payment service fee = **₱155.00 total** paid via GCash, Maya, Bayad Center, Over-the-Counter Banks, or 7-Eleven (*cash is not accepted at the NBI biometric counter*). **FREE (₱0.00)** for First-Time Jobseekers under RA 11261.\n- **Turnaround Time (${asksHit ? 'With HIT vs. No HIT' : 'Processing Time'}):**\n  - **No HIT:** Released on the **same day within 15–30 minutes** after biometrics.\n  - **With HIT (Namesake Match):** Requires **5 to 10 working days** for manual Quality Control verification to confirm you are not the person with a pending case.${asksFee ? '\n- **Reminder:** Never pay fixers outside the NBI office.' : ''}\n- **Official Hotline:** \`(02) 8523-8231 loc. 5440\` / \`0961-734-7222\` | Email: \`clearance@nbi.gov.ph\`.`,
    };
  }

  // 5.5. PSA Helpline Online Delivery & Status Tracking
  if (
    detectedServiceCode === 'PSA_HELPLINE' ||
    /\b(psahelpline|helpline|doorstep|delivery|track\s+(my\s+)?order)\b/i.test(lower)
  ) {
    return {
      serviceCode: 'PSA_HELPLINE',
      includeChecklist: true,
      steps: [
        "Retrieved PSAHelpline.ph Authorized Delivery Citizen's Charter",
        'Loaded door-to-door ordering procedure, courier timelines & fees',
        'Prepared Letter of Authorization (LOA) delivery acceptance guidelines',
      ],
      replyText: isFil
        ? `**Opisyal na Gabay sa PSAHelpline.ph (Online Ordering & Doorstep Delivery):**\n\n- **Opisyal na Website:** \`https://psahelpline.ph\`\n- **Order Tracking:** Maaari mong i-track ang iyong order gamit ang iyong Reference Number sa \`https://orders.psahelpline.ph/check-status\`.\n- **Bayarin:** **₱365.00** bawat kopya ng Birth, Marriage, o Death Certificate, at **₱420.00** para sa CENOMAR (kasama na ang nationwide courier delivery at e-payment fee).\n- **Delivery Turnaround:** 3–4 working days sa Metro Manila; 4–8 working days sa mga probinsya.\n- **Pagtanggap ng Dokumento:** Ikaw mismo ang dapat tumanggap. Kung wala ka, mag-iwan ng **Letter of Authorization (LOA)** at photocopy ng iyong Valid Primary ID sa tatanggap.\n- **Hotline:** \`(02) 8737-1111\` | Email: \`help@psahelpline.ph\`.`
        : `**Official PSAHelpline.ph Guide (Online Ordering & Nationwide Doorstep Delivery):**\n\n- **Official Portal:** Order online 24/7 at \`https://psahelpline.ph\`.\n- **Order Tracking:** Check real-time dispatch and delivery status at \`https://orders.psahelpline.ph/check-status\` using your 10-digit order reference.\n- **Official Fees:** **₱365.00** per copy for Birth, Marriage, or Death Certificates, and **₱420.00** for CENOMAR (inclusive of nationwide courier delivery and convenience fee).\n- **Delivery SLA:** 3–4 working days within Metro Manila; 4–8 working days for provincial addresses.\n- **Courier Receiving Rules:** The document owner must personally receive the package. If unavailable, provide a signed **Letter of Authorization (LOA)** and a photocopy of your valid Primary Government ID to the authorized receiver.\n- **Helpline Hotline:** \`(02) 8737-1111\` | Email: \`help@psahelpline.ph\`.`,
    };
  }

  // 6. PSA Birth Certificate / Marriage / CENOMAR / Authorized Representative Questions
  if (
    detectedServiceCode === 'PSA_BIRTH_CERT' ||
    /\b(psa|birth\s+cert|secpa|cenomar|marriage\s+cert|crs|yellow\s+form|representative|authorization\s+letter|spa|kinatawan)\b/i.test(
      lower,
    )
  ) {
    return {
      serviceCode: 'PSA_BIRTH_CERT',
      includeChecklist: true,
      steps: [
        "Retrieved PSA Civil Registry Citizen's Charter (SECPA Issuance, CRS Appointment & RA 10173 Rules)",
        'Prepared PSA Birth Certificate checklist & representative rules',
      ],
      replyText: isFil
        ? `**Opisyal na Gabay sa PSA Birth / Marriage Certificate (SECPA) \`[PSA Citizen's Charter 2025]\`:**\n\n- **Mga Requirements (Walk-in sa CRS Outlet):**\n  1. **CRS Online Appointment Slip** (Mag-book nang libre sa \`https://appointment.psa.gov.ph\`).\n  2. **PSA Application Form (Yellow Form)**.\n  3. **Isang (1) Orihinal at Unexpired na Primary Government ID** na tugma ang pangalan sa Birth Certificate.\n- **Bayarin at Oras ng Pagkuha:** **₱155.00 bawat kopya** (Birth/Marriage Certificate) o **₱210.00** (CENOMAR) sa CRS Outlet; makukuha sa loob ng **30–60 minuto** sa araw ng appointment. Kung online delivery (\`PSAHelpline.ph\` / \`PSASerbilis.com.ph\`), **₱330.00–₱365.00**.\n- **Kung Kinatawan (Authorized Representative — RA 10173 & PD 603):** Kung hindi ang may-ari, magulang, asawa, o anak na nasa hustong gulang ang kukuha, kailangang magdala ng: (1) **Signed Authorization Letter o Notarized SPA**, (2) **Orihinal + Photocopy ng Valid ID ng May-ari**, at (3) **Orihinal + Photocopy ng Valid ID ng Kinatawan**.\n- **Opisyal na Hotline:** \`(02) 8461-0500 loc. 603\` / \`0917-872-7722\` | Email: \`civilregistry@psa.gov.ph\`.`
        : `**Official PSA Birth / Marriage Certificate (SECPA) Guide \`[PSA Citizen's Charter 2025]\`:**\n\n- **Walk-in CRS Outlet Requirements:**\n  1. **Confirmed CRS Online Appointment** (booked free at \`https://appointment.psa.gov.ph\`).\n  2. **Accomplished PSA Application Form (Yellow Form)**.\n  3. **One (1) Original Unexpired Primary Government ID** matching the name on the document.\n- **Official Fees & Turnaround:** **₱155.00 per copy** for Birth/Marriage Certificates (**₱210.00** for CENOMAR) at CRS outlets, released **same-day within 30–60 minutes**. Online courier delivery via \`psaserbilis.com.ph\` / \`psahelpline.ph\` costs **₱330.00–₱365.00**.\n- **Authorized Representative Rules (RA 10173 & PD 603):** Under the Data Privacy Act, only the owner, parent, legal spouse, or direct adult child may claim directly. Any other representative must present: (1) **Signed Authorization Letter or Notarized SPA**, (2) **Original + Photocopy of the Owner's Primary ID**, and (3) **Original + Photocopy of the Representative's Primary ID**.\n- **Official Hotline:** \`(02) 8461-0500 loc. 603\` / \`0917-872-7722\` | Email: \`civilregistry@psa.gov.ph\`.`,
    };
  }

  // 7. PhilHealth Registration / PMRF / MDR / PIN / Dependents / Senior Citizen Questions
  if (
    detectedServiceCode === 'PHILHEALTH_REGISTRATION' ||
    /\b(philhealth|pmrf|mdr|pin|dependent|senior\s+citizen|ra\s*10645|indigent|osca)\b/i.test(lower)
  ) {
    return {
      serviceCode: 'PHILHEALTH_REGISTRATION',
      includeChecklist: true,
      steps: [
        "Retrieved PhilHealth Citizen's Charter 2025 (Member Registration, PMRF/MDR & RA 10645 Subsidy)",
        'Prepared PhilHealth requirements checklist',
      ],
      replyText: isFil
        ? `**Opisyal na Gabay sa PhilHealth Registration, PIN at MDR \`[PhilHealth Citizen's Charter 2025]\`:**\n\n- **Bayarin:** **100% LIBRE (₱0.00)** ang pagpaparehistro, pagkuha ng PhilHealth Identification Number (PIN), at pagpapa-print ng Member Data Record (MDR) sa lahat ng Local Health Insurance Offices (LHIO) at PhilHealth Express counters (**15–30 minuto**).\n- **Mga Requirements:**\n  1. **Dalawang (2) kopya ng PhilHealth Member Registration Form (PMRF)** na kumpleto at may pirma.\n  2. **Isang (1) Valid Primary ID** o **PSA Birth Certificate**.\n  3. **Dalawang (2) pirasong 1x1 ID Picture** (puting background).\n- **Pagdagdag ng Dependents (Walang Dagdag na Bayad):**\n  - **Legal na Asawa:** PSA Marriage Certificate.\n  - **Mga Anak (wala pang 21 taong gulang, walang asawa at trabaho):** PSA Birth Certificate ng bata.\n  - **Magulang na 60+ o Anak na PWD:** PSA Birth Certificate + PWD ID.\n- **Senior Citizens (RA 10645) at Indigents:** Awtomatikong **100% subsidized / libre** ang lifetime PhilHealth coverage ng lahat ng Senior Citizens (60+) gamit ang OSCA ID.\n- **Opisyal na Hotline:** \`(02) 8441-7442\` | Email: \`actioncenter@philhealth.gov.ph\`.`
        : `**Official PhilHealth Member Registration (PMRF / PIN / MDR) Guide \`[PhilHealth Citizen's Charter 2025]\`:**\n\n- **Official Fee & Turnaround:** **100% FREE (₱0.00)** for registration, lifetime PIN issuance, and MDR printing at any Local Health Insurance Office (LHIO) or PhilHealth Express counter (**15–30 minutes**).\n- **Documentary Requirements:**\n  1. **Two (2) duly accomplished and signed copies of the PhilHealth Member Registration Form (PMRF)**.\n  2. **One (1) Valid Primary ID** or **PSA Birth Certificate**.\n  3. **Two (2) pieces 1x1 ID photos** (white background).\n- **Declaring Qualified Dependents (No Extra Cost):**\n  - **Legal Spouse:** PSA Marriage Certificate.\n  - **Children below 21 years old (unmarried & unemployed):** Child's PSA Birth Certificate.\n  - **Parents aged 60+ or Children with Disability (PWD):** Birth Certificate + PWD ID.\n- **Senior Citizens (RA 10645) & Indigent Members:** All Filipino Senior Citizens (60+) receive mandatory, **100% government-subsidized lifetime coverage** upon presenting their OSCA Senior Citizen ID.\n- **Official Hotline:** \`(02) 8441-7442\` | Email: \`actioncenter@philhealth.gov.ph\`.`,
    };
  }

  // 8. Default Grounded Response for any other civic question
  if (resolvedCode === 'GENERAL') {
    return {
      serviceCode: 'GENERAL',
      includeChecklist: false,
      steps: [
        'Checked general Philippine civic information & government services',
        'Prepared overview of supported government agencies',
      ],
      replyText: isFil
        ? 'Maaari kitang tulungan sa mga opisyal na transaksyon sa gobyerno tulad ng NBI Clearance, PSA Birth/Marriage Certificate, PhilHealth, DFA Passport, at iba pa. Anong partikular na ahensya o serbisyo ang kailangan mo?'
        : 'I can assist you with official Philippine government transactions such as NBI Clearance, PSA Birth/Marriage Certificates, PhilHealth, DFA Passport, and more. Which specific agency or service do you need guidance on?',
    };
  }

  return {
    serviceCode: serviceDef.code,
    includeChecklist: true,
    steps: [
      `Matched query to ${serviceDef.name} (${serviceDef.agencyName})`,
      "Retrieved official Citizen's Charter requirements, fees, and counter-ready rules",
    ],
    replyText: isFil
      ? `Narito ang opisyal na gabay at **Requirements Checklist** para sa **${serviceDef.name}** (\`${serviceDef.agencyName} Citizen's Charter\`).\n\n- **Opisyal na Bayad:** ${serviceDef.processingFee === 0 ? 'LIBRE (₱0.00)' : `₱${serviceDef.processingFee.toFixed(2)}${serviceDef.convenienceFee ? ` + ₱${serviceDef.convenienceFee.toFixed(2)} online fee` : ''} (Libre para sa First-Time Jobseekers sa ilalim ng RA 11261)`}\n- **Opisyal na Portal:** \`${serviceDef.officialPortal}\`\n- **Hotline:** \`${serviceDef.hotline}\` | Email: \`${serviceDef.email}\`\n\nMaaari mong lagyan ng tsek ang bawat requirement sa ibaba o i-upload ang iyong ID/dokumento upang masuri ko kung may **expired**, **mismatched**, o **missing** na detalye.`
      : `Here is the official guide and **Requirements Checklist** for **${serviceDef.name}** (\`${serviceDef.agencyName} Citizen's Charter\`).\n\n- **Official Processing Fee:** ${serviceDef.processingFee === 0 ? 'FREE (₱0.00)' : `₱${serviceDef.processingFee.toFixed(2)}${serviceDef.convenienceFee ? ` + ₱${serviceDef.convenienceFee.toFixed(2)} convenience fee` : ''} (₱0.00 Free for First-Time Jobseekers under RA 11261)`}\n- **Official Portal:** \`${serviceDef.officialPortal}\`\n- **Agency Hotline:** \`${serviceDef.hotline}\` | Email: \`${serviceDef.email}\`\n\nYou can track your requirements using the interactive checklist below, or attach your IDs and forms so I can check for **expired dates**, **mismatched details**, or **missing fields**.`,
  };
}
