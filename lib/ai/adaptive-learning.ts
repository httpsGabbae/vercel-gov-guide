/**
 * GovGuidePH — Per-Message Adaptive Learning & Personalization Processor
 * Version 1.0 — Adaptive Government Intelligence (§5.1 - §5.6)
 *
 * Continuously analyzes every incoming message to evaluate:
 * 1. Apparent intent
 * 2. Language being used (Tagalog, Taglish, English)
 * 3. Communication style (casual, formal, warm)
 * 4. Response length preference (concise vs detailed)
 * 5. Follow-up question indicator
 * 6. User corrections of previous assistant statements
 * 7. Contextual updates (e.g., for mother, she is deceased, etc.)
 * 8. Explicit preferences worth remembering
 * 9. Earlier assumptions to update
 */

import type { CitizenPersonalizationProfile, ActiveConversationContext, UserPreferences } from './memory-store';
import { updateActiveConversationContext, updateDurablePreferences } from './memory-store';

export interface PerMessageAnalysis {
  detectedLanguage: 'Tagalog' | 'English' | 'Taglish';
  detectedStyle: 'casual' | 'formal' | 'warm';
  preferredLength: 'concise' | 'detailed' | 'balanced';
  explanationLevel: 'beginner' | 'intermediate' | 'advanced';
  isFollowUp: boolean;
  isCorrection: boolean;
  correctionDetails?: {
    field: string;
    wrongAssumption: string;
    userCorrection: string;
  };
  contextUpdates: Partial<ActiveConversationContext>;
  explicitPreferenceChange?: Partial<UserPreferences>;
  confidence: number;
}

/**
 * Detects whether text is Tagalog, Taglish, or English.
 */
export function detectLanguageNuance(text: string): 'Tagalog' | 'English' | 'Taglish' {
  const lower = text.toLowerCase();

  const tagalogParticles =
    /\b(po|opo|ba|ng|mga|sa|ko|mo|niya|natin|namin|kanila|ano|paano|saan|kailan|sino|bakit|magkano|pwede|puwede|kailangan|kumuha|kunin|ayos|pila|naman|lang|nga|kasi|kaya|dito|dyan|diyan|doon|meron|wala|lahat|tsek|salamat|nanay|tatay|asawa|anak)\b/gi;

  const englishCivicWords =
    /\b(how|what|why|where|when|who|is|are|can|could|would|should|requirements|checklist|fee|fees|cost|apply|appointment|clearance|certificate|birth|marriage|death|renewal|update|id|tracking|status|application)\b/gi;

  const tagalogMatches = (lower.match(tagalogParticles) || []).length;
  const englishMatches = (lower.match(englishCivicWords) || []).length;

  // Common mixed patterns (e.g. "saan mag-apply ng passport?")
  const hasCodeSwitchPrefix = /\b(?:mag-|nag-|i-|pa-)[a-z]+/i.test(lower);

  if (tagalogMatches >= 3 && englishMatches <= 2 && !hasCodeSwitchPrefix) {
    return 'Tagalog';
  }
  if (tagalogMatches >= 1 && englishMatches >= 1) {
    return 'Taglish';
  }
  if (tagalogMatches > 0 && englishMatches === 0) {
    return 'Tagalog';
  }
  if (englishMatches > 0 && tagalogMatches === 0) {
    return 'English';
  }

  return 'English';
}

/**
 * Analyzes communication style (casual, formal, warm).
 */
export function detectCommunicationStyle(text: string): 'casual' | 'formal' | 'warm' {
  const lower = text.toLowerCase();

  // Formal indicators
  if (
    /\b(kindly|pursuant\s+to|herewith|respectfully|inquire|certify|official|affidavit|regarding\s+the|republic\s+act)\b/i.test(
      lower,
    )
  ) {
    return 'formal';
  }

  // Casual / colloquial indicators
  if (
    /\b(kuya|ate|boss|tol|lodi|pre|pards|yow|hey|hi|hello|pls|plz|tnx|thx|ty|anyway|btw)\b/i.test(
      lower,
    )
  ) {
    return 'casual';
  }

  // Warm / polite civic indicators (po, opo, salamat, please)
  return 'warm';
}

/**
 * Evaluates response length preference based on input brevity or explicit requests.
 */
export function detectResponseLengthPreference(text: string): 'concise' | 'detailed' | 'balanced' {
  const lower = text.toLowerCase();

  // Explicit user requests for concise response
  if (
    /\b(keep\s+it\s+(short|brief|concise)|briefly|summarize|summary\s+only|short\s+answer|one\s+sentence|wag\s+masyadong\s+mahaba|maikli\s+lang|diretso\s+lang)\b/i.test(
      lower,
    )
  ) {
    return 'concise';
  }

  // Explicit user requests for detailed step-by-step
  if (
    /\b(in\s+detail|detailed|step\s*by\s*step|complete\s+breakdown|full\s+guide|bawat\s+hakbang|ipaliwanag\s+ng\s+buo|kumpleto)\b/i.test(
      lower,
    )
  ) {
    return 'detailed';
  }

  // Very short query (e.g. "fees?", "magkano?") leans towards concise
  if (text.split(/\s+/).length <= 3) {
    return 'concise';
  }

  return 'balanced';
}

/**
 * Detects if the user is correcting an assumption made by the assistant.
 */
export function detectUserCorrection(
  text: string,
  lastAssistantMessage: string,
): { isCorrection: boolean; field?: string; wrongAssumption?: string; userCorrection?: string } {
  const lower = text.toLowerCase();

  // Patterns like "Not mine, my father's", "Hindi para sa akin, para sa tatay ko"
  const correctionPattern =
    /\b(?:not\s+mine|not\s+for\s+me|hindi\s+(?:ako|akin|para\s+sa\s+akin)|mali\s+ka|i\s+meant|correction|hindi\s+nbi|not\s+nbi|hindi\s+psa|not\s+psa)\b/i;

  if (correctionPattern.test(lower)) {
    let wrongAssumption = 'Document was for applicant self';
    let userCorrection = text;
    let field = 'request_for';

    if (/\b(father|tatay|ama|dad)\b/i.test(lower)) {
      userCorrection = 'father';
      field = 'request_for';
    } else if (/\b(mother|nanay|ina|mom)\b/i.test(lower)) {
      userCorrection = 'mother';
      field = 'request_for';
    } else if (/\b(spouse|asawa|husband|wife)\b/i.test(lower)) {
      userCorrection = 'spouse';
      field = 'request_for';
    } else if (/\b(child|anak|baby|son|daughter)\b/i.test(lower)) {
      userCorrection = 'child';
      field = 'request_for';
    } else if (/\b(dfa|passport)\b/i.test(lower)) {
      wrongAssumption = 'NBI clearance';
      userCorrection = 'DFA passport';
      field = 'active_service';
    }

    return {
      isCorrection: true,
      field,
      wrongAssumption,
      userCorrection,
    };
  }

  return { isCorrection: false };
}

/**
 * Performs comprehensive per-message analysis for every turn.
 */
export function analyzeUserMessage(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
  profile?: CitizenPersonalizationProfile,
): PerMessageAnalysis {
  const text = message.trim();
  const lower = text.toLowerCase();

  const detectedLanguage = detectLanguageNuance(text);
  const detectedStyle = detectCommunicationStyle(text);
  const preferredLength = detectResponseLengthPreference(text);

  // Check last assistant message
  const lastAssistantMsg = [...conversationHistory]
    .reverse()
    .find((m) => m.role === 'assistant')?.content || '';

  // Check follow-up indicator
  const isFollowUp =
    conversationHistory.length > 0 &&
    (/\b(how\s+about|what\s+about|paano\s+naman|eh\s+kung|tapos|and\s+then|also|additionally|if\s+ever|what\s+if)\b/i.test(
      lower,
    ) ||
      text.split(/\s+/).length <= 4);

  // Check correction
  const correction = detectUserCorrection(text, lastAssistantMsg);

  // Extract contextual updates
  const contextUpdates: Partial<ActiveConversationContext> = {};

  if (/\b(deceased|namatay|patay\s+na|sumakabilang\s+buhay|late\s+mother|late\s+father)\b/i.test(lower)) {
    contextUpdates.is_deceased = true;
  }

  if (/\b(mother|mom|nanay|ina)\b/i.test(lower)) {
    contextUpdates.request_for = 'mother';
  } else if (/\b(father|dad|tatay|ama)\b/i.test(lower)) {
    contextUpdates.request_for = 'father';
  } else if (/\b(child|son|daughter|anak)\b/i.test(lower)) {
    contextUpdates.request_for = 'child';
  } else if (/\b(spouse|husband|wife|asawa)\b/i.test(lower)) {
    contextUpdates.request_for = 'spouse';
  }

  if (/\b(first-?time\s+jobseeker|bagong\s+graduate|ra\s*11261)\b/i.test(lower)) {
    contextUpdates.is_first_time_jobseeker = true;
  }

  // Detect explicit preferences requested by user
  const explicitPreferenceChange: Partial<UserPreferences> = {};

  if (/\b(always\s+answer\s+in\s+tagalog|tagalog\s+lang\s+gamitin|sagutin\s+sa\s+tagalog)\b/i.test(lower)) {
    explicitPreferenceChange.preferred_language = 'Tagalog';
  } else if (/\b(always\s+answer\s+in\s+english|english\s+please|use\s+english)\b/i.test(lower)) {
    explicitPreferenceChange.preferred_language = 'English';
  } else if (/\b(taglish\s+tayo|taglish\s+please)\b/i.test(lower)) {
    explicitPreferenceChange.preferred_language = 'Taglish';
  }

  if (/\b(always\s+keep\s+it\s+(short|concise)|make\s+all\s+answers\s+concise)\b/i.test(lower)) {
    explicitPreferenceChange.preferred_response_length = 'concise';
  } else if (/\b(always\s+provide\s+detailed|detailed\s+mode)\b/i.test(lower)) {
    explicitPreferenceChange.preferred_response_length = 'detailed';
  }

  return {
    detectedLanguage,
    detectedStyle,
    preferredLength,
    explanationLevel: profile?.explanation_level || 'beginner',
    isFollowUp,
    isCorrection: correction.isCorrection,
    correctionDetails: correction.isCorrection
      ? {
          field: correction.field || 'general',
          wrongAssumption: correction.wrongAssumption || '',
          userCorrection: correction.userCorrection || '',
        }
      : undefined,
    contextUpdates,
    explicitPreferenceChange:
      Object.keys(explicitPreferenceChange).length > 0 ? explicitPreferenceChange : undefined,
    confidence: 0.95,
  };
}

/**
 * Updates citizen context and durable preferences after analyzing message.
 */
export async function applyMessageFeedback(
  citizenId: string,
  analysis: PerMessageAnalysis,
): Promise<CitizenPersonalizationProfile> {
  const updates: Partial<ActiveConversationContext> = {
    ...analysis.contextUpdates,
  };

  if (analysis.isCorrection && analysis.correctionDetails) {
    updates.corrections = [
      {
        field: analysis.correctionDetails.field,
        originalValue: analysis.correctionDetails.wrongAssumption,
        correctedValue: analysis.correctionDetails.userCorrection,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  // 1. Update Short-Term in-session context
  updateActiveConversationContext(citizenId, updates);

  // 2. If explicit preference was stated, update durable profile immediately
  if (analysis.explicitPreferenceChange) {
    await updateDurablePreferences(citizenId, analysis.explicitPreferenceChange, 'explicit_user_setting', 1.0);
  }

  return await (await import('./memory-store')).getPersonalizationProfile(citizenId);
}
