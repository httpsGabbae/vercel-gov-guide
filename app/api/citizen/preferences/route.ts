import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getPersonalizationProfile,
  updateDurablePreferences,
  clearPersonalizationPreferences,
  setLearningEnabled,
} from '@/lib/ai/memory-store';

const updatePreferencesSchema = z.object({
  citizenId: z.string().min(1),
  preferences: z
    .object({
      preferred_language: z.enum(['Tagalog', 'English', 'Taglish', 'Auto']).optional(),
      preferred_response_length: z.enum(['concise', 'detailed', 'balanced']).optional(),
      communication_style: z.enum(['casual', 'formal', 'warm']).optional(),
      explanation_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      learning_enabled: z.boolean().optional(),
    })
    .optional(),
  learning_enabled: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const citizenId = url.searchParams.get('citizenId') || 'anon-citizen';

    const profile = await getPersonalizationProfile(citizenId);
    return NextResponse.json({
      ok: true,
      profile,
    });
  } catch (err) {
    console.error('Preferences GET Error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to retrieve preferences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parseResult = updatePreferencesSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid preferences payload', details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { citizenId, preferences, learning_enabled } = parseResult.data;

    if (typeof learning_enabled === 'boolean') {
      await setLearningEnabled(citizenId, learning_enabled);
    }

    let updatedProfile = await getPersonalizationProfile(citizenId);

    if (preferences && Object.keys(preferences).length > 0) {
      updatedProfile = await updateDurablePreferences(
        citizenId,
        preferences,
        'explicit_user_setting',
        1.0,
      );
    }

    return NextResponse.json({
      ok: true,
      profile: updatedProfile,
    });
  } catch (err) {
    console.error('Preferences POST Error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to update preferences' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const citizenId = url.searchParams.get('citizenId') || 'anon-citizen';

    await clearPersonalizationPreferences(citizenId);

    const freshProfile = await getPersonalizationProfile(citizenId);
    return NextResponse.json({
      ok: true,
      message: 'Personalization memory successfully cleared.',
      profile: freshProfile,
    });
  } catch (err) {
    console.error('Preferences DELETE Error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to clear preferences' }, { status: 500 });
  }
}
