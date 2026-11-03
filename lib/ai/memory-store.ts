/**
 * GovGuidePH — Adaptive Memory Store & Preference Management
 * Version 1.0 — Adaptive Government Intelligence (§5.5 & §10)
 *
 * Implements two-layer memory:
 * 1. Short-Term Memory: In-session conversational context, active service tracking, follow-ups.
 * 2. Long-Term Memory: Stable, consented user preferences (language, response length, style, level).
 *
 * PRIVACY SAFEGUARD:
 * Strictly prevents storage of sensitive government identifiers (PCN, PIN, SSS, TIN),
 * passwords, authentication tokens, financial information, or identity docs.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { redactSecrets } from './guardrails';

export interface UserPreferences {
  preferred_language: 'Tagalog' | 'English' | 'Taglish' | 'Auto';
  preferred_response_length: 'concise' | 'detailed' | 'balanced';
  communication_style: 'casual' | 'formal' | 'warm';
  explanation_level: 'beginner' | 'intermediate' | 'advanced';
  learning_enabled: boolean;
  updated_at: string;
}

export interface ActiveConversationContext {
  active_service?: string;
  active_agency?: string;
  request_for?: string; // e.g. "mother", "father", "self"
  is_deceased?: boolean;
  is_first_time_jobseeker?: boolean;
  reference_number?: string;
  last_question_asked?: string;
  corrections: Array<{
    field: string;
    originalValue: unknown;
    correctedValue: unknown;
    timestamp: string;
  }>;
  pending_step?: string;
  metadata?: Record<string, unknown>;
}

export interface CitizenPersonalizationProfile extends UserPreferences {
  citizen_id: string;
  active_conversation_context: ActiveConversationContext;
  preference_confidence: Record<string, number>;
  preference_sources: Record<string, 'explicit_user_setting' | 'inferred_pattern' | 'default'>;
}

const DEFAULT_PROFILE: Omit<CitizenPersonalizationProfile, 'citizen_id'> = {
  preferred_language: 'Auto',
  preferred_response_length: 'balanced',
  communication_style: 'warm',
  explanation_level: 'beginner',
  learning_enabled: true,
  updated_at: new Date().toISOString(),
  active_conversation_context: {
    corrections: [],
  },
  preference_confidence: {
    preferred_language: 0.5,
    preferred_response_length: 0.5,
    communication_style: 0.5,
    explanation_level: 0.5,
  },
  preference_sources: {
    preferred_language: 'default',
    preferred_response_length: 'default',
    communication_style: 'default',
    explanation_level: 'default',
  },
};

// In-memory fallback cache for fast lookups, test environments, or offline modes
const inMemoryProfileStore = new Map<string, CitizenPersonalizationProfile>();

/**
 * Validates that an object contains NO sensitive government IDs, tokens, or credentials
 * before persisting to personalization memory.
 */
export function sanitizePersonalizationInput<T extends Record<string, unknown>>(data: T): Partial<T> {
  const sanitized: Record<string, unknown> = { ...data };

  // Explicit check for forbidden sensitive keys
  const forbiddenKeys = [
    'password',
    'secret',
    'token',
    'jwt',
    'api_key',
    'philhealth_pin',
    'pin',
    'sss_number',
    'tin',
    'pcn',
    'national_id_number',
    'credit_card',
    'bank_account',
    'biometrics',
    'uploaded_doc',
  ];

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (forbiddenKeys.some((f) => lowerKey.includes(f))) {
      delete sanitized[key];
      continue;
    }

    const val = sanitized[key];
    if (typeof val === 'string') {
      // Check for sensitive ID patterns or secrets in strings
      let cleaned = redactSecrets(val);
      cleaned = cleaned.replace(/eyJ[0-9A-Za-z\-_.]+/g, '[REDACTED_TOKEN]');
      cleaned = cleaned.replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[REDACTED_PCN]');
      sanitized[key] = cleaned;
    }
  }

  return sanitized as Partial<T>;
}

/**
 * Retrieves the user personalization profile (Short-Term context + Allowed Long-Term preferences).
 */
export async function getPersonalizationProfile(citizenId: string): Promise<CitizenPersonalizationProfile> {
  const cached = inMemoryProfileStore.get(citizenId);
  if (cached) {
    return cached;
  }

  // Attempt database retrieval if Supabase is connected
  try {
    const supabase = createServiceClient();
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    })
      .from('citizen_personalization')
      .select('*')
      .eq('citizen_id', citizenId)
      .single();

    if (!error && data) {
      const profile = data as CitizenPersonalizationProfile;
      inMemoryProfileStore.set(citizenId, profile);
      return profile;
    }
  } catch {
    // Database table might not exist yet; gracefully fallback to default profile
  }

  const newProfile: CitizenPersonalizationProfile = {
    ...DEFAULT_PROFILE,
    citizen_id: citizenId,
    active_conversation_context: {
      corrections: [],
    },
  };

  inMemoryProfileStore.set(citizenId, newProfile);
  return newProfile;
}

/**
 * Updates short-term active conversation context (resets on new conversation thread).
 */
export function updateActiveConversationContext(
  citizenId: string,
  updates: Partial<ActiveConversationContext>,
): CitizenPersonalizationProfile {
  const current = inMemoryProfileStore.get(citizenId) || {
    ...DEFAULT_PROFILE,
    citizen_id: citizenId,
    active_conversation_context: { corrections: [] },
  };

  const currentCtx = current.active_conversation_context || { corrections: [] };

  const mergedContext: ActiveConversationContext = {
    ...currentCtx,
    ...updates,
    corrections: [
      ...(currentCtx.corrections || []),
      ...(updates.corrections || []),
    ],
  };

  const updatedProfile: CitizenPersonalizationProfile = {
    ...current,
    active_conversation_context: mergedContext,
  };

  inMemoryProfileStore.set(citizenId, updatedProfile);
  return updatedProfile;
}

/**
 * Updates long-term durable preferences.
 * Adheres strictly to user consent and `learning_enabled`.
 */
export async function updateDurablePreferences(
  citizenId: string,
  newPreferences: Partial<UserPreferences>,
  source: 'explicit_user_setting' | 'inferred_pattern' = 'explicit_user_setting',
  confidence = 0.95,
): Promise<CitizenPersonalizationProfile> {
  const current = await getPersonalizationProfile(citizenId);

  // If user disabled personalized learning, reject automatic inferred learning
  if (!current.learning_enabled && source === 'inferred_pattern') {
    return current;
  }

  // Filter out any accidentally leaked sensitive data
  const sanitized = sanitizePersonalizationInput(newPreferences as Record<string, unknown>);

  const updatedSources = { ...current.preference_sources };
  const updatedConfidence = { ...current.preference_confidence };

  if (sanitized.preferred_language) {
    updatedSources.preferred_language = source;
    updatedConfidence.preferred_language = confidence;
  }
  if (sanitized.preferred_response_length) {
    updatedSources.preferred_response_length = source;
    updatedConfidence.preferred_response_length = confidence;
  }
  if (sanitized.communication_style) {
    updatedSources.communication_style = source;
    updatedConfidence.communication_style = confidence;
  }
  if (sanitized.explanation_level) {
    updatedSources.explanation_level = source;
    updatedConfidence.explanation_level = confidence;
  }

  const updatedProfile: CitizenPersonalizationProfile = {
    ...current,
    ...sanitized,
    preference_sources: updatedSources,
    preference_confidence: updatedConfidence,
    updated_at: new Date().toISOString(),
  };

  inMemoryProfileStore.set(citizenId, updatedProfile);

  // Optionally persist to DB
  try {
    const supabase = createServiceClient();
    await (supabase as unknown as {
      from: (t: string) => {
        upsert: (d: unknown) => Promise<unknown>;
      };
    })
      .from('citizen_personalization')
      .upsert({
        citizen_id: citizenId,
        preferred_language: updatedProfile.preferred_language,
        preferred_response_length: updatedProfile.preferred_response_length,
        communication_style: updatedProfile.communication_style,
        explanation_level: updatedProfile.explanation_level,
        learning_enabled: updatedProfile.learning_enabled,
        preference_sources: updatedProfile.preference_sources,
        preference_confidence: updatedProfile.preference_confidence,
        updated_at: updatedProfile.updated_at,
      });
  } catch {
    // safe fallback to in-memory store in dev / offline / test mode
  }

  return updatedProfile;
}

/**
 * Resets / clears all stored durable personalization preferences for a citizen.
 */
export async function clearPersonalizationPreferences(citizenId: string): Promise<void> {
  const resetProfile: CitizenPersonalizationProfile = {
    ...DEFAULT_PROFILE,
    citizen_id: citizenId,
    active_conversation_context: { corrections: [] },
  };

  inMemoryProfileStore.set(citizenId, resetProfile);

  try {
    const supabase = createServiceClient();
    await (supabase as unknown as {
      from: (t: string) => {
        delete: () => {
          eq: (col: string, val: string) => Promise<unknown>;
        };
      };
    })
      .from('citizen_personalization')
      .delete()
      .eq('citizen_id', citizenId);
  } catch {
    // safe ignore
  }
}

/**
 * Toggles personalized learning on or off for a citizen.
 */
export async function setLearningEnabled(citizenId: string, enabled: boolean): Promise<boolean> {
  const profile = await getPersonalizationProfile(citizenId);
  profile.learning_enabled = enabled;
  profile.updated_at = new Date().toISOString();
  inMemoryProfileStore.set(citizenId, profile);

  try {
    const supabase = createServiceClient();
    await (supabase as unknown as {
      from: (t: string) => {
        upsert: (d: unknown) => Promise<unknown>;
      };
    })
      .from('citizen_personalization')
      .upsert({
        citizen_id: citizenId,
        learning_enabled: enabled,
        updated_at: profile.updated_at,
      });
  } catch {
    // safe ignore
  }

  return enabled;
}
