/**
 * GovGuidePH — Context-Aware Conversation Manager & Orchestrator
 * Version 1.0 — Adaptive Government Intelligence (§9 Intelligent Conversation Routing)
 *
 * Implements end-to-end conversation routing:
 * User Message
 *   ↓
 * Input Validation
 *   ↓
 * Load Relevant Context & Allowed Memory
 *   ↓
 * Per-Message Intent and Communication Analysis
 *   ↓
 * Scope Classification
 *   ↓
 * Route:
 *   - OUT_OF_SCOPE → Exact "Out of scope." (NO main LLM call, NO irrelevant persistence)
 *   - NEEDS_CLARIFICATION → Concise clarification question
 *   - GOVERNMENT_SERVICE → Service Assistant & Charter Guidance
 *   - GOVERNMENT_INFORMATION → Knowledge Assistant & Public Records
 *   ↓
 * Stream / Deliver Response
 *   ↓
 * Update Conversation Memory & Persist Consented Preferences
 */

import { validateMessageScope, type ScopeValidationResult } from './scope-validator';
import { analyzeUserMessage, applyMessageFeedback } from './adaptive-learning';
import { getPersonalizationProfile, type CitizenPersonalizationProfile } from './memory-store';
import { generateServiceResponse, type ServiceResponseResult } from './service-assistant';
import { generateKnowledgeResponse, type KnowledgeResponseResult } from './knowledge-assistant';

export interface ConversationTurnRequest {
  message: string;
  citizenId: string;
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  serviceCodeOverride?: string;
  languageOverride?: string;
}

export type ConversationHandlerRoute =
  | 'OUT_OF_SCOPE'
  | 'NEEDS_CLARIFICATION'
  | 'GOVERNMENT_SERVICE'
  | 'GOVERNMENT_INFORMATION';

export interface ConversationTurnResponse {
  route: ConversationHandlerRoute;
  text: string;
  isStreamable: boolean;
  validation: ScopeValidationResult;
  profile: CitizenPersonalizationProfile;
  serviceResult?: ServiceResponseResult;
  knowledgeResult?: KnowledgeResponseResult;
  sources?: Array<{ title?: string; agency?: string; section?: string; url?: string; breadcrumb?: string; similarity?: number }>;
  checklist?: {
    serviceName: string;
    agencyName: string;
    requirements: Array<{ name: string; isMandatory: boolean; note?: string }>;
    processingFee: number;
    convenienceFee?: number;
  };
}

/**
 * Orchestrates a complete user conversation turn following Section 9 architecture.
 */
export async function processConversationTurn(
  req: ConversationTurnRequest,
): Promise<ConversationTurnResponse> {
  const { message, citizenId, history = [], serviceCodeOverride } = req;

  // 1. Load active personalization profile & allowed memory
  const profile = await getPersonalizationProfile(citizenId);

  // 2. Per-message intent, language, and communication style analysis
  const analysis = analyzeUserMessage(message, history, profile);

  // Override language if explicitly provided in request
  if (req.languageOverride && req.languageOverride !== 'Auto') {
    profile.preferred_language = req.languageOverride as 'Tagalog' | 'English' | 'Taglish';
  } else if (analysis.detectedLanguage) {
    profile.preferred_language = analysis.detectedLanguage;
  }

  // 3. Scope validation and intent classification (BEFORE main generation)
  const validation = validateMessageScope(message, history, {
    active_service: serviceCodeOverride || profile.active_conversation_context.active_service,
    request_for: profile.active_conversation_context.request_for,
    is_deceased: profile.active_conversation_context.is_deceased,
  });

  // 4. Branch based on Scope Validation
  // ROUTE A: OUT_OF_SCOPE
  // Action: Respond with exactly: "Out of scope."
  // Do not generate an explanation, apology, unrelated conversation, or additional text.
  // Do not call the main response-generation model.
  // Do not persist irrelevant or sensitive information.
  if (validation.intent === 'OUT_OF_SCOPE') {
    return {
      route: 'OUT_OF_SCOPE',
      text: 'Out of scope.',
      isStreamable: false,
      validation,
      profile,
    };
  }

  // ROUTE B: NEEDS_CLARIFICATION
  // Action: Ask one concise clarification question.
  if (validation.intent === 'NEEDS_CLARIFICATION') {
    const question =
      validation.clarificationQuestion ||
      'Which specific Philippine government agency or service do you need guidance on?';

    // Update conversation context with pending clarification
    profile.active_conversation_context.last_question_asked = question;

    return {
      route: 'NEEDS_CLARIFICATION',
      text: question,
      isStreamable: true,
      validation,
      profile,
    };
  }

  // ROUTE C: GOVERNMENT_SERVICE
  if (validation.intent === 'GOVERNMENT_SERVICE') {
    let inferredService =
      serviceCodeOverride ||
      validation.identifiedService ||
      profile.active_conversation_context.active_service;

    if (!inferredService && history.length > 0) {
      const pastText = history.map((m) => m.content).join(' ').toLowerCase();
      if (pastText.includes('birth') || pastText.includes('psa')) inferredService = 'PSA_BIRTH_CERT';
      else if (pastText.includes('marriage')) inferredService = 'PSA_MARRIAGE_CERT';
      else if (pastText.includes('cenomar')) inferredService = 'PSA_CENOMAR';
      else if (pastText.includes('passport') || pastText.includes('dfa')) inferredService = 'DFA_PASSPORT';
      else if (pastText.includes('nbi') || pastText.includes('clearance')) inferredService = 'NBI_CLEARANCE';
    }

    const targetServiceCode = inferredService || 'PSA_BIRTH_CERT';

    // Incorporate extracted context
    if (validation.extractedContext) {
      if (validation.extractedContext.request_for) {
        profile.active_conversation_context.request_for = String(validation.extractedContext.request_for);
      }
      if (typeof validation.extractedContext.is_deceased === 'boolean') {
        profile.active_conversation_context.is_deceased = validation.extractedContext.is_deceased;
      }
      if (typeof validation.extractedContext.is_first_time_jobseeker === 'boolean') {
        profile.active_conversation_context.is_first_time_jobseeker = validation.extractedContext.is_first_time_jobseeker;
      }
      if (validation.extractedContext.reference_number) {
        profile.active_conversation_context.reference_number = String(validation.extractedContext.reference_number);
      }
    }

    profile.active_conversation_context.active_service = targetServiceCode;

    const serviceResult = await generateServiceResponse(
      message,
      targetServiceCode,
      profile,
      profile.active_conversation_context,
    );

    // Apply continuous learning and feedback
    const updatedProfile = await applyMessageFeedback(citizenId, analysis);

    return {
      route: 'GOVERNMENT_SERVICE',
      text: serviceResult.formattedMarkdown,
      isStreamable: true,
      validation,
      profile: updatedProfile,
      serviceResult,
      checklist: {
        serviceName: serviceResult.serviceTitle,
        agencyName: serviceResult.agencyName,
        requirements: serviceResult.requirements,
        processingFee: serviceResult.fees.processingFee,
        convenienceFee: serviceResult.fees.convenienceFee,
      },
      sources: [
        {
          agency: serviceResult.agencyName,
          title: `${serviceResult.serviceTitle} Official Charter`,
          url: serviceResult.verifiedPortalUrl,
          breadcrumb: `${serviceResult.agencyName} > Citizen's Charter`,
          similarity: 0.95,
        },
      ],
    };
  }

  // ROUTE D: GOVERNMENT_INFORMATION
  const knowledgeResult = await generateKnowledgeResponse(message, profile);

  // Apply continuous learning and feedback
  const updatedProfile = await applyMessageFeedback(citizenId, analysis);

  return {
    route: 'GOVERNMENT_INFORMATION',
    text: knowledgeResult.answer,
    isStreamable: true,
    validation,
    profile: updatedProfile,
    knowledgeResult,
    sources: knowledgeResult.sources.map((s) => ({
      title: s.title,
      section: s.section,
      url: s.url,
      breadcrumb: s.title,
      similarity: 0.92,
    })),
  };
}
