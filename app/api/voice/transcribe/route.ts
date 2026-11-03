import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, GEMINI_FLASH_MODEL } from '@/lib/ai/models';

export const runtime = 'nodejs';

/**
 * POST /api/voice/transcribe
 * High-accuracy AI Speech-to-Text audio transcription powered by Gemini Flash.
 * Specializes in Tagalog, Philippine English, and Taglish for Philippine Government inquiries.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const requestedLanguage = (formData.get('language') as string) || 'fil-PH';

    if (!audioFile) {
      return NextResponse.json(
        { ok: false, error: 'No audio file provided in request payload.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json(
        {
          ok: false,
          error: 'GEMINI_API_KEY is not configured on the server.',
          fallback: true,
        },
        { status: 503 }
      );
    }

    // Convert audio Blob/File to Buffer then Base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');
    const mimeType = audioFile.type || 'audio/webm';

    const ai = getGeminiClient();

    const systemPrompt = `You are a Philippine Government Speech-to-Text Transcriber for the GovGuide-PH civic assistant.
Your task is to transcribe the user's voice message with extreme accuracy.

CRITICAL TRANSCRIPTION RULES:
1. PRESERVE THE SPEAKER'S EXACT LANGUAGE:
   - The user may speak in Filipino (Tagalog), English, or Taglish (natural Filipino-English code switching).
   - Transcribe verbatim in the exact language spoken.
   - DO NOT translate Tagalog into English or English into Tagalog.
2. CIVIC & GOVERNMENT TERMINOLOGY ACCURACY:
   - Accurately recognize Philippine government agencies, acronyms, and laws:
     NBI, PSA, PhilHealth, SSS, Pag-IBIG, DFA, DPWH, PhilSys, ePhilID, CENOMAR, LTO, BIR, TIN, PRC, DILG, ARTA, RA 11261 (First Time Jobseekers Act), Barangay Certificate, Cedula, Affidavit.
3. ACCURACY & NOISE RESILIENCE:
   - If there is background noise, focus strictly on the human speech.
   - Do NOT invent words or hallucinate sentences not spoken by the user.
   - If the audio is completely silent or unintelligible noise, reply with: [UNCLEAR]
4. OUTPUT FORMAT:
   - Output ONLY the transcribed words.
   - Do not include conversational remarks, preamble, quotes, or markdown.`;

    const userPrompt = `Transcribe this audio inquiry regarding Philippine government services (Preferred context language: ${requestedLanguage}):`;

    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType,
                data: base64Audio,
              },
            },
            { text: userPrompt },
          ],
        },
      ],
      config: {
        temperature: 0.1, // Low temperature for maximum factual transcription fidelity
        maxOutputTokens: 300,
      },
    });

    const candidateText = response.text?.trim() || '';

    if (!candidateText || candidateText.includes('[UNCLEAR]')) {
      return NextResponse.json({
        ok: false,
        error: 'Hindi malinaw ang boses o walang narinig. Pakisubukan muli.',
        unclear: true,
      });
    }

    // Clean up any extraneous quotes or labels
    const cleanTranscription = candidateText
      .replace(/^["']|["']$/g, '')
      .replace(/^(Transcription|User inquiry|Audio text):\s*/i, '')
      .trim();

    return NextResponse.json({
      ok: true,
      transcription: cleanTranscription,
      source: 'gemini_flash_audio',
    });
  } catch (err) {
    console.error('[/api/voice/transcribe] Error during audio transcription:', err);
    const message = err instanceof Error ? err.message : 'Failed to transcribe audio';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
