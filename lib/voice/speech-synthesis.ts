/**
 * GovGuide PH — Text-to-Speech (TTS) Voice Synthesis
 * Reads out responses and government guidance in clear Tagalog or Philippine English.
 */

export interface SpeechSynthesisOptions {
  language?: 'Filipino' | 'English' | 'Auto';
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Strips raw markdown syntax, tables, and links so speech reads naturally
 */
export function sanitizeMarkdownForSpeech(md: string): string {
  if (!md || !md.trim()) return '';

  return md
    // Replace markdown links [label](url) with just label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headings
    .replace(/^#+\s+/gm, '')
    // Replace bullet points with natural pauses
    .replace(/^[\s*-]+\s+/gm, ', ')
    // Remove emojis that may confuse synthesizer
    .replace(/[\u{1F300}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '')
    // Normalize newlines to pauses
    .replace(/\n\n+/g, '. ')
    .replace(/\n/g, ', ')
    // Normalize excessive spaces
    .replace(/\s+/g, ' ')
    .trim();
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    } catch {
      // Ignore
    }
  }
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}

export function speakCivicGuidance(
  text: string,
  options: SpeechSynthesisOptions = {}
): boolean {
  if (!isSpeechSynthesisSupported()) return false;

  stopSpeaking();

  const clean = sanitizeMarkdownForSpeech(text);
  if (!clean) return false;

  try {
    const utterance = new SpeechSynthesisUtterance(clean);
    activeUtterance = utterance;

    const langChoice = options.language || 'Filipino';
    const targetLangCode = langChoice === 'English' ? 'en-PH' : 'fil-PH';

    utterance.lang = targetLangCode;
    utterance.rate = options.rate ?? 0.95; // Slightly measured pace for civic clarity
    utterance.pitch = options.pitch ?? 1.0;

    // Pick best available voice
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const match =
        voices.find((v) => v.lang.toLowerCase() === targetLangCode.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('fil') || v.lang.toLowerCase().startsWith('tl')) ||
        voices.find((v) => v.lang.toLowerCase().includes('ph')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en-us') || v.lang.toLowerCase().startsWith('en')) ||
        null;

      if (match) {
        utterance.voice = match;
      }
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      activeUtterance = null;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      // 'canceled' is expected when user hits stop
      if ((e as SpeechSynthesisErrorEvent).error !== 'canceled') {
        options.onError?.(e);
      } else {
        options.onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    activeUtterance = null;
    options.onError?.(err);
    return false;
  }
}
