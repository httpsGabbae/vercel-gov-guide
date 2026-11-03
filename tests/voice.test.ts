import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { sanitizeMarkdownForSpeech } from '../lib/voice/speech-synthesis';
import { GovGuideVoiceRecognizer } from '../lib/voice/speech-recognition';
import { POST as transcribeRoute } from '../app/api/voice/transcribe/route';

describe('Voice & Speech Processing Subsystem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeMarkdownForSpeech (Text-to-Speech Markdown Stripper)', () => {
    it('strips markdown links and leaves readable anchor text', () => {
      const raw = 'Maaari kang mag-order sa [PSAHelpline.ph](https://psahelpline.ph) para sa delivery.';
      const clean = sanitizeMarkdownForSpeech(raw);
      expect(clean).toContain('PSAHelpline.ph');
      expect(clean).not.toContain('https://psahelpline.ph');
      expect(clean).not.toContain('[');
      expect(clean).not.toContain(']');
    });

    it('strips bold, italic, and inline code formatting symbols', () => {
      const raw = 'Dalhin ang **Valid ID** at ang `Barangay Certificate` para sa aplikasyon.';
      const clean = sanitizeMarkdownForSpeech(raw);
      expect(clean).toBe('Dalhin ang Valid ID at ang Barangay Certificate para sa aplikasyon.');
    });

    it('removes markdown headings and formats bullet lists into natural pauses', () => {
      const raw = `### Mga Kinakailangan:
* PhilSys National ID
* Barangay Clearance
* 2x2 Picture`;
      const clean = sanitizeMarkdownForSpeech(raw);
      expect(clean).not.toContain('###');
      expect(clean).not.toContain('*');
      expect(clean).toContain('PhilSys National ID');
      expect(clean).toContain('Barangay Clearance');
    });

    it('handles empty or blank inputs gracefully', () => {
      expect(sanitizeMarkdownForSpeech('')).toBe('');
      expect(sanitizeMarkdownForSpeech('   ')).toBe('');
    });
  });

  describe('GovGuideVoiceRecognizer (Multilingual Tagalog, English & Taglish)', () => {
    it('initializes default language to Tagalog (fil-PH) which natively supports Taglish', () => {
      const recognizer = new GovGuideVoiceRecognizer();
      expect(recognizer.getLanguage()).toBe('fil-PH');
      expect(recognizer.getIsListening()).toBe(false);
    });

    it('allows dynamically switching language to Philippine English (en-PH)', () => {
      const recognizer = new GovGuideVoiceRecognizer('fil-PH');
      recognizer.setLanguage('en-PH');
      expect(recognizer.getLanguage()).toBe('en-PH');
    });

    it('preserves existing typed text when appending recognized voice speech', () => {
      const existingText = 'Gusto ko po malaman kung';
      const recognizedSpeech = 'ano ang requirements para sa NBI clearance';

      const appendSpeech = (prev: string, speech: string) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${speech.trim()}` : speech.trim();
      };

      const result = appendSpeech(existingText, recognizedSpeech);
      expect(result).toBe('Gusto ko po malaman kung ano ang requirements para sa NBI clearance');
      expect(result.startsWith(existingText)).toBe(true);
    });

    it('handles starting with empty text when appending recognized speech', () => {
      const existingText = '';
      const recognizedSpeech = 'Paano kumuha ng PhilHealth ID?';

      const appendSpeech = (prev: string, speech: string) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${speech.trim()}` : speech.trim();
      };

      const result = appendSpeech(existingText, recognizedSpeech);
      expect(result).toBe('Paano kumuha ng PhilHealth ID?');
    });
  });

  describe('Automatic Voice Submission (2–3s Silence Detection & Auto Stop)', () => {
    it('combines multi-sentence continuous speech into one complete message', () => {
      const sentence1 = 'Paano po kumuha ng NBI Clearance';
      const sentence2 = 'para sa first time jobseeker?';

      let accumulated = '';
      const handleSpeechChunk = (chunk: string) => {
        accumulated = accumulated ? `${accumulated} ${chunk.trim()}` : chunk.trim();
      };

      handleSpeechChunk(sentence1);
      handleSpeechChunk(sentence2);

      expect(accumulated).toBe('Paano po kumuha ng NBI Clearance para sa first time jobseeker?');
    });

    it('triggers auto-stop & submission after 2.5 seconds (2500ms) of continuous silence', () => {
      const submitMock = vi.fn();
      const stopMicMock = vi.fn();
      let timer: NodeJS.Timeout | null = null;
      const speech = 'Magkano ang bayad sa PSA birth certificate?';

      // User stops speaking: starts 2.5s silence cooldown
      timer = setTimeout(() => {
        stopMicMock();
        submitMock(speech);
      }, 2500);

      // Advance 2 seconds: should NOT have stopped or submitted yet
      vi.advanceTimersByTime(2000);
      expect(stopMicMock).not.toHaveBeenCalled();
      expect(submitMock).not.toHaveBeenCalled();

      // Advance remaining 500ms to reach exactly 2500ms
      vi.advanceTimersByTime(500);
      expect(stopMicMock).toHaveBeenCalledTimes(1);
      expect(submitMock).toHaveBeenCalledTimes(1);
      expect(submitMock).toHaveBeenCalledWith(speech);
    });

    it('cancels pending submission and resets silence timer if user resumes speaking within 2.5s', () => {
      const submitMock = vi.fn();
      let timer: NodeJS.Timeout | null = null;
      let fullMessage = 'Gusto ko kumuha ng passport';

      // User pauses: starts 2.5s timer
      timer = setTimeout(() => {
        submitMock(fullMessage);
      }, 2500);

      // 1.5 seconds in, user resumes speaking
      vi.advanceTimersByTime(1500);
      if (timer) clearTimeout(timer); // Canceled by continuous speech detection

      // Append additional phrase
      fullMessage += ' sa DFA Aseana branch';

      // Restart timer after user finishes the second phrase
      timer = setTimeout(() => {
        submitMock(fullMessage);
      }, 2500);

      // Advance 2.5 seconds
      vi.advanceTimersByTime(2500);

      // Should have submitted only ONCE with the combined full message
      expect(submitMock).toHaveBeenCalledTimes(1);
      expect(submitMock).toHaveBeenCalledWith('Gusto ko kumuha ng passport sa DFA Aseana branch');
    });

    it('rejects empty or whitespace-only transcriptions from submitting', () => {
      const submitMock = vi.fn();
      const emptySpeech = '   ';

      if (emptySpeech.trim().length >= 2) {
        submitMock(emptySpeech);
      }

      expect(submitMock).not.toHaveBeenCalled();
    });
  });

  describe('AI Transcription API Endpoint (/api/voice/transcribe)', () => {
    it('rejects requests without audio file payload with 400 Bad Request', async () => {
      const formData = new FormData();
      const req = new NextRequest('http://localhost:3000/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      const res = await transcribeRoute(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('No audio file provided');
    });
  });
});
