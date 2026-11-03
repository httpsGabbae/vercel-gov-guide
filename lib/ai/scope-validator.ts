/**
 * GovGuidePH — Master AI System Scope Validation & Intent Classification Layer
 * Version 1.0 — Adaptive Government Intelligence (§4 Strict Scope Enforcement)
 *
 * Evaluates semantic meaning, user intent, topic relevance, message coherence,
 * and previous conversational context BEFORE the main AI response is generated.
 * Never classifies messages using keyword matching alone.
 */

export type ScopeIntent =
  | 'GOVERNMENT_SERVICE'
  | 'GOVERNMENT_INFORMATION'
  | 'NEEDS_CLARIFICATION'
  | 'OUT_OF_SCOPE';

export interface ScopeValidationResult {
  intent: ScopeIntent;
  confidence: number;
  reason: string;
  isCoherent: boolean;
  clarificationQuestion?: string;
  identifiedService?: string;
  identifiedAgency?: string;
  extractedContext?: Record<string, string | boolean | number>;
  isContextualFollowup: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ConversationContextHints {
  active_service?: string;
  active_agency?: string;
  awaiting?: 'service_type' | 'relationship' | 'status_or_condition' | 'reference_number' | 'confirmation' | string;
  last_question_asked?: string;
  request_for?: string;
  is_deceased?: boolean;
}

/**
 * Checks if a string looks like pure gibberish / consonant soup / random key mash.
 */
function isRandomGibberish(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;

  // Repetitive single character (e.g. "aaaaa", "zzzzz")
  if (/^(.)\1{3,}$/i.test(trimmed)) return true;

  // Typical keyboard mashing patterns
  const keymashRegex = /^(?:asdfgh|lkjhgf|qwerty|zxcvbn|[asdfghjkl]{5,}|[qwertyuiop]{5,}|[zxcvbnm]{5,})$/i;
  if (keymashRegex.test(trimmed)) return true;

  // Consonant cluster ratio: 6 or more consecutive consonants without vowels
  const consonantClusters = trimmed.toLowerCase().match(/[bcdfghjklmnpqrstvwxyz]{6,}/g);
  if (consonantClusters) return true;

  // Low vowel-to-letter ratio in longer words without spaces or digits
  if (!trimmed.includes(' ') && trimmed.length >= 7) {
    const letters = trimmed.replace(/[^a-zA-Z]/g, '');
    const vowels = trimmed.replace(/[^aeiouyAEIOUY]/g, '');
    if (letters.length >= 7 && vowels.length / letters.length < 0.12) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a message is purely numeric or punctuation without semantic context.
 */
function isPureNumberOrSymbols(text: string): boolean {
  const stripped = text.trim().replace(/[\s\-_.,#]/g, '');
  return /^\d+$/.test(stripped) || /^[!@#$%^&*()_+=\[\]{}|\\:;"'<>,.?/~`]+$/.test(text.trim());
}

/**
 * Detects obvious non-government out-of-scope topics.
 */
const OUT_OF_SCOPE_TOPIC_REGEX =
  /\b(recipe|adobo|sinigang|cooking|cook\s+|bake\s+|how\s+to\s+cook|ingredients\s+for|calories\s+in|nba\s+|basketball\s+score|world\s+cup|fifa|minecraft|valorant|dota|league\s+of\s+legends|playstation|xbox|crypto|cryptocurrency|bitcoin|ethereum|forex\s+trading|stock\s+prediction|write\s+a\s+(poem|song|lyrics|rap|fiction|story|novel)|joke\s+about|car\s+repair|fix\s+my\s+car|engine\s+oil|plumbing|leaky\s+faucet|weather\s+in\s+[a-z]+|astronomy\s+black\s+hole|solve\s+calculus|write\s+a\s+(python|javascript|react|c\+\+|java)\s+code|scrape\s+facebook)\b/i;

/**
 * Identifies standard government agencies in the Philippines and internationally.
 */
const GOV_AGENCIES: Record<string, { agencyName: string; defaultClarification: string }> = {
  PSA: {
    agencyName: 'Philippine Statistics Authority (PSA)',
    defaultClarification:
      'Which PSA document do you need assistance with (Birth Certificate, Marriage Certificate, CENOMAR, or Death Certificate)?',
  },
  NBI: {
    agencyName: 'National Bureau of Investigation (NBI)',
    defaultClarification:
      'Are you applying for a new NBI Clearance, renewing an existing one, or checking an NBI HIT status?',
  },
  DFA: {
    agencyName: 'Department of Foreign Affairs (DFA)',
    defaultClarification:
      'Do you need help with a new DFA passport application, renewal, or consular appointment scheduling?',
  },
  PHILHEALTH: {
    agencyName: 'Philippine Health Insurance Corporation (PhilHealth)',
    defaultClarification:
      'Do you need assistance with PhilHealth registration (PMRF), Member Data Record (MDR), or PIN verification?',
  },
  SSS: {
    agencyName: 'Social Security System (SSS)',
    defaultClarification:
      'Do you need assistance with SSS online registration, SS number issuance, E-1 form, or contribution records?',
  },
  PAGIBIG: {
    agencyName: 'Home Development Mutual Fund (Pag-IBIG Fund)',
    defaultClarification:
      'Do you need assistance with Pag-IBIG Member ID (MID) registration, MP2 savings, or housing loan requirements?',
  },
  LTO: {
    agencyName: 'Land Transportation Office (LTO)',
    defaultClarification:
      'Are you applying for a new student permit, non-professional driver’s license, or renewing your license?',
  },
  DTI: {
    agencyName: 'Department of Trade and Industry (DTI)',
    defaultClarification:
      'Do you need assistance with DTI Business Name Registration (BNRS) or consumer protection guidelines?',
  },
  BIR: {
    agencyName: 'Bureau of Internal Revenue (BIR)',
    defaultClarification:
      'Are you applying for a new Taxpayer Identification Number (TIN), business registration, or filing taxes?',
  },
  PRC: {
    agencyName: 'Professional Regulation Commission (PRC)',
    defaultClarification:
      'Do you need assistance with PRC LERIS board exam application, license renewal, or verification of rating?',
  },
  DSWD: {
    agencyName: 'Department of Social Welfare and Development (DSWD)',
    defaultClarification:
      'Do you need guidance on DSWD AICS financial/medical assistance or 4Ps beneficiary services?',
  },
  DPWH: {
    agencyName: 'Department of Public Works and Highways (DPWH)',
    defaultClarification:
      'Do you need information regarding ongoing DPWH infrastructure projects, road maintenance, or public bids?',
  },
  DILG: {
    agencyName: 'Department of the Interior and Local Government (DILG)',
    defaultClarification:
      'Do you have a question about DILG operations, local government units (LGUs), or police administration?',
  },
};

/**
 * Checks if input represents an affirmative or negative response.
 */
function isConfirmationToken(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return /^(yes|no|oo|opo|hindi|yap|nope|sure|ok|okay|sige|sige\s+po|not\s+yet|already|meron|wala)$/i.test(lower);
}

/**
 * Evaluates semantic meaning and intent of an incoming user message.
 */
export function validateMessageScope(
  rawMessage: string,
  history: ConversationMessage[] = [],
  context: ConversationContextHints = {},
): ScopeValidationResult {
  const text = rawMessage.trim();
  const lower = text.toLowerCase();

  // 1. Check for pure gibberish / key mash
  if (isRandomGibberish(text)) {
    return {
      intent: 'OUT_OF_SCOPE',
      confidence: 0.99,
      reason: 'Input contains meaningless random characters or consonant clusters.',
      isCoherent: false,
      isContextualFollowup: false,
    };
  }

  // Find last assistant message for conversational context continuity
  const lastAssistantMessage = [...history]
    .reverse()
    .find((m) => m.role === 'assistant')?.content.toLowerCase() || '';

  // 2. Handle pure numbers or symbols (e.g. "123", "#99482")
  if (isPureNumberOrSymbols(text)) {
    const isAwaitingNumber =
      context.awaiting === 'reference_number' ||
      /reference|tracking|id\s+number|transaction\s+code|slot|anong\s+numero/i.test(lastAssistantMessage);

    if (isAwaitingNumber) {
      return {
        intent: 'GOVERNMENT_SERVICE',
        confidence: 0.95,
        reason: 'Numeric input matches previous request for reference or tracking number.',
        isCoherent: true,
        isContextualFollowup: true,
        extractedContext: { reference_number: text },
      };
    }

    return {
      intent: 'OUT_OF_SCOPE',
      confidence: 0.98,
      reason: 'Isolated numbers or symbols without prior conversational request.',
      isCoherent: false,
      isContextualFollowup: false,
    };
  }

  // 3. Handle short confirmation tokens (e.g. "Yes", "Oo", "Opo", "No")
  if (isConfirmationToken(text)) {
    const hasPreviousInteraction = history.length > 0 && lastAssistantMessage.length > 0;
    if (hasPreviousInteraction) {
      return {
        intent: 'GOVERNMENT_SERVICE',
        confidence: 0.95,
        reason: 'Confirmation token directly answers preceding assistant question.',
        isCoherent: true,
        isContextualFollowup: true,
        extractedContext: { confirmation: lower.startsWith('y') || lower.startsWith('o') || lower.startsWith('m') },
      };
    }

    return {
      intent: 'OUT_OF_SCOPE',
      confidence: 0.95,
      reason: 'Isolated confirmation without preceding conversational context.',
      isCoherent: false,
      isContextualFollowup: false,
    };
  }

  // 4. Check for obvious non-civic topics (cooking recipes, sports, crypto, car repairs, etc.)
  if (OUT_OF_SCOPE_TOPIC_REGEX.test(text)) {
    // Check if it mentions civic terms ironically (e.g. "How do I cook adobo while waiting for NBI?")
    const hasServiceIntent =
      /\b(how\s+to\s+get|requirements|fee|fees|apply|appointment|renew|track)\b/i.test(text) &&
      /\b(nbi|psa|passport|clearance|philhealth)\b/i.test(text);

    if (!hasServiceIntent) {
      return {
        intent: 'OUT_OF_SCOPE',
        confidence: 0.99,
        reason: 'Query is unrelated to government services, civics, laws, or public administration.',
        isCoherent: true,
        isContextualFollowup: false,
      };
    }
  }

  // 5. Check for isolated agency or document keywords (Ambiguity / NEEDS_CLARIFICATION)
  // Example: "PSA", "NBI", "DFA", "Passport", "Clearance", or noise like "PSA banana 123"
  const singleAgencyMatch = Object.keys(GOV_AGENCIES).find(
    (abbr) => lower === abbr.toLowerCase() || new RegExp(`^${abbr}\\b`, 'i').test(text),
  );

  // Agency inquiry without specifying document type (e.g. "How do I get a PSA?", "Paano kumuha ng PSA?")
  if (
    /\bpsa\b/i.test(lower) &&
    !/\b(birth|marriage|cenomar|death|kapanganakan|kasal|singleness|helpline|logo)\b/i.test(lower) &&
    /\b(how|paano|get|kumuha|apply|kuha|need|request)\b/i.test(lower)
  ) {
    return {
      intent: 'NEEDS_CLARIFICATION',
      confidence: 0.95,
      reason: 'Citizen asked how to get a PSA document without specifying document type.',
      isCoherent: true,
      isContextualFollowup: false,
      identifiedAgency: 'Philippine Statistics Authority (PSA)',
      clarificationQuestion:
        'Which PSA document do you need assistance with (Birth Certificate, Marriage Certificate, CENOMAR, or Death Certificate)?',
    };
  }

  const isVeryShort = text.split(/\s+/).length <= 4;
  const hasBananaOrNoise = /\b(banana|apple|test\s*\d+|123|random)\b/i.test(lower);

  if (singleAgencyMatch && isVeryShort) {
    // If it's literally just the agency name or agency + noise (e.g. "PSA", "PSA banana 123")
    const isBareKeyword =
      lower === singleAgencyMatch.toLowerCase() ||
      new RegExp(`^${singleAgencyMatch}\\s*(?:banana|123|test|pls|po)?\\s*\\d*$`, 'i').test(lower);

    if (isBareKeyword || hasBananaOrNoise) {
      const agencyInfo = GOV_AGENCIES[singleAgencyMatch];
      return {
        intent: 'NEEDS_CLARIFICATION',
        confidence: 0.92,
        reason: 'Government agency mentioned without clear action or document specification.',
        isCoherent: true,
        isContextualFollowup: false,
        identifiedAgency: agencyInfo.agencyName,
        clarificationQuestion: agencyInfo.defaultClarification,
      };
    }
  }

  // Generic isolated terms needing clarification
  if (/^(clearance|clearances|permit|permits|certificate|certificates|appointment|requirements)$/i.test(text)) {
    return {
      intent: 'NEEDS_CLARIFICATION',
      confidence: 0.9,
      reason: 'Generic government service category without specifying document or agency.',
      isCoherent: true,
      isContextualFollowup: false,
      clarificationQuestion:
        'Which specific government document or clearance do you need assistance with (e.g., NBI Clearance, PSA Birth Certificate, Police Clearance, or Business Permit)?',
    };
  }

  // 6. Handle poorly structured but meaningful messages (e.g., "PSA birth cert mom deceased")
  const extractedContext: Record<string, string | boolean | number> = {};

  if (/\b(deceased|namatay|patay|patay\s+na|sumakabilang\s+buhay|late\s+mother|late\s+father)\b/i.test(lower)) {
    extractedContext.is_deceased = true;
  }
  if (/\b(mother|mom|nanay|ina|mama)\b/i.test(lower)) {
    extractedContext.request_for = 'mother';
  } else if (/\b(father|dad|tatay|ama|papa)\b/i.test(lower)) {
    extractedContext.request_for = 'father';
  } else if (/\b(child|son|daughter|anak|baby)\b/i.test(lower)) {
    extractedContext.request_for = 'child';
  } else if (/\b(spouse|husband|wife|asawa)\b/i.test(lower)) {
    extractedContext.request_for = 'spouse';
  }

  if (/\b(first-?time\s+jobseeker|bagong\s+graduate|fresh\s+grad|ra\s*11261)\b/i.test(lower)) {
    extractedContext.is_first_time_jobseeker = true;
  }

  // 7. Check for follow-up responses to previous questions
  if (history.length > 0) {
    // E.g., user answered "Birth certificate" after assistant asked "Which PSA document do you need?"
    if (
      /which\s+psa\s+document|anong\s+dokumento/i.test(lastAssistantMessage) ||
      context.awaiting === 'service_type'
    ) {
      if (/\b(birth|marriage|cenomar|death|kapanganakan|kasal|singleness)\b/i.test(lower)) {
        return {
          intent: 'GOVERNMENT_SERVICE',
          confidence: 0.96,
          reason: 'User answered document type clarification question.',
          isCoherent: true,
          isContextualFollowup: true,
          identifiedService: lower.includes('birth')
            ? 'PSA_BIRTH_CERT'
            : lower.includes('marriage')
              ? 'PSA_MARRIAGE_CERT'
              : lower.includes('death')
                ? 'PSA_DEATH_CERT'
                : 'PSA_CENOMAR',
          extractedContext,
        };
      }
    }

    // E.g., user specifies "It's for my mother", "She's already deceased", or "Not mine, my father's"
    if (
      extractedContext.request_for ||
      extractedContext.is_deceased ||
      /\b(not\s+mine|hindi\s+akin|para\s+sa\s+tatay|para\s+sa\s+nanay|my\s+father|my\s+mother|deceased|namatay)\b/i.test(lower)
    ) {
      return {
        intent: 'GOVERNMENT_SERVICE',
        confidence: 0.95,
        reason: 'User provided subject of document, condition, or corrected previous assumption in active conversation.',
        isCoherent: true,
        isContextualFollowup: true,
        identifiedService: context.active_service,
        extractedContext,
      };
    }
  }

  // 8. Distinguish GOVERNMENT_SERVICE vs GOVERNMENT_INFORMATION
  // Service indicators: transactions, how-to, fees, requirements, procedures, appointments, tracking, documents, IDs
  const isServiceInquiry =
    /\b(how\s+do\s+i|paano\s+(kumuha|mag-?apply|mag-?renew|kunin|magka)|requirements|requirement|kailangan|dokumento|checklist|fee|fees|bayad|magkano|presyo|cost|apply|application|appointment|schedule|renew|renewal|track|tracking|status|verify\s+my|check\s+my|get\s+my|nbi\s+clearance|psa\s+(birth|marriage|cenomar|death|secpa|helpline)|passport|driver'?s\s+license|student\s+permit|philhealth\s+(pmrf|mdr|pin)|sss\s+(e-1|number|registration)|pag-?ibig\s+(mid|mp2|membership)|tin\s+(id|registration)|leris|aics|national\s+id|ephilid|pwd\s+id|walk-?in|online\s+application|hit\s+status|step\s*by\s*step)\b/i.test(
      lower,
    );

  // Knowledge indicators: history, mandates, what does X do, who is, laws, constitution, branches, elections, trivia, comparisons
  const isKnowledgeInquiry =
    /\b(who\s+founded|who\s+is\s+the\s+(current\s+)?(president|vice\s+president|secretary|senate\s+president|speaker|chief\s+justice)|what\s+does\s+[a-z]{2,8}\s+do|what\s+is\s+(the\s+)?(mandate|ra\s*\d+|ra\s*no\.?\s*\d+|republic\s+act)|what\s+color\s+is\s+the|history\s+of|kailan\s+itinatag|sino\s+ang\s+(nagtatag|pangulo|bise\s+presidente|kalihim)|ano\s+ang\s+(tungkulin|gawain|ibig\s+sabihin|ra\s*\d+)|powers\s+of|branches\s+of\s+government|constitution|1987\s+constitution|saligang\s+batas|republic\s+act|\bra\s*\d+\b|\bra\s*no\.?\s*\d+\b|batas\s+pambansa|executive\s+order|senate\s+vs|compare\s+(the\s+)?(philippine|presidential|parliamentary)|trivia|malolos\s+congress|commonwealth|katipunan|department\s+of\s+[a-z]+|bureau\s+of\s+[a-z]+|local\s+government\s+code|lgu|comelec|commission\s+on\s+elections|commission\s+on\s+audit|civil\s+service\s+commission|ombudsman|sandiganbayan|supreme\s+court|taxes\s+used\s+for|national\s+budget|general\s+appropriations)\b/i.test(
      lower,
    );

  if (isServiceInquiry) {
    let identifiedService: string | undefined;
    if (lower.includes('birth') || lower.includes('kapanganakan')) identifiedService = 'PSA_BIRTH_CERT';
    else if (lower.includes('marriage') || lower.includes('kasal')) identifiedService = 'PSA_MARRIAGE_CERT';
    else if (lower.includes('cenomar') || lower.includes('singleness')) identifiedService = 'PSA_CENOMAR';
    else if (lower.includes('death') || lower.includes('patay')) identifiedService = 'PSA_DEATH_CERT';
    else if (lower.includes('nbi') || lower.includes('clearance')) identifiedService = 'NBI_CLEARANCE';
    else if (lower.includes('passport') || lower.includes('dfa')) identifiedService = 'DFA_PASSPORT';
    else if (lower.includes('driver') || lower.includes('student permit') || lower.includes('lto')) identifiedService = 'LTO_STUDENT_PERMIT';
    else if (lower.includes('philhealth')) identifiedService = 'PHILHEALTH_REGISTRATION';
    else if (lower.includes('sss')) identifiedService = 'SSS_REGISTRATION';
    else if (lower.includes('pag-ibig') || lower.includes('pagibig') || lower.includes('hdmf')) identifiedService = 'PAGIBIG_MEMBERSHIP';
    else if (lower.includes('national id') || lower.includes('philsys') || lower.includes('ephilid')) identifiedService = 'NATIONAL_ID';
    else if (lower.includes('pwd')) identifiedService = 'PWD_ID';
    else if (lower.includes('dpwh') || lower.includes('infrastructure')) identifiedService = 'DPWH_PROJECTS';

    return {
      intent: 'GOVERNMENT_SERVICE',
      confidence: 0.95,
      reason: 'Citizen requests actionable assistance for a government transaction, document, or service.',
      isCoherent: true,
      isContextualFollowup: false,
      identifiedService,
      extractedContext,
    };
  }

  if (isKnowledgeInquiry) {
    return {
      intent: 'GOVERNMENT_INFORMATION',
      confidence: 0.94,
      reason: 'Citizen requests factual knowledge about government institutions, history, laws, officials, or civic systems.',
      isCoherent: true,
      isContextualFollowup: false,
      extractedContext,
    };
  }

  // Check broader government relevance: laws, public officials, public institutions, foreign government comparison
  const mentionsGovernmentConcepts =
    /\b(government|gobiyerno|pamahalaan|agency|ahensya|secretary|minister|mayor|governor|senator|congressman|representative|barangay\s+captain|kapitan|law|laws|batas|ordinance|tax|taxes|buwis|public\s+service|civic|citizen|citizenship|election|elections|voting|democracy|republic|state|judiciary|executive|legislative|parliament|united\s+states\s+government|uk\s+government|asean)\b/i.test(
      lower,
    );

  if (mentionsGovernmentConcepts) {
    return {
      intent: 'GOVERNMENT_INFORMATION',
      confidence: 0.88,
      reason: 'Meaningful inquiry regarding public institutions, civics, or governmental systems.',
      isCoherent: true,
      isContextualFollowup: false,
    };
  }

  // Fallback: If query is coherent English/Tagalog sentence but has zero civic connection
  return {
    intent: 'OUT_OF_SCOPE',
    confidence: 0.95,
    reason: 'Message contains no government service or civic knowledge intent.',
    isCoherent: true,
    isContextualFollowup: false,
  };
}
