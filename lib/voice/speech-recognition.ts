/**
 * GovGuide PH — Robust AI Speech-to-Text Engine
 * Hybrid Architecture with Real-Time Audio Level Detection and Dual-Capture Fail-Safe:
 * 1. Prompts for real microphone permission via getUserMedia.
 * 2. Real-time audio waveform volume monitoring via Web Audio API.
 * 3. Live Web Speech API streaming transcription for fil-PH (Tagalog) and en-PH (English).
 * 4. Background MediaRecorder backup that automatically sends audio to /api/voice/transcribe
 *    if browser speech recognition fails, disconnects, or is unsupported.
 */

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onSpeechStart?: () => void; // Triggered when voice activity or speech starts
  onAudioLevel?: (volume: number) => void; // 0 to 100 for live waveform animation
  onInterim?: (interimText: string) => void;
  onResult?: (finalText: string) => void;
  onError?: (errorMessage: string, rawError?: string) => void;
  onEnd?: () => void;
}

export type SupportedSpeechLanguage = 'fil-PH' | 'en-PH' | 'en-US';

/**
 * Pleasant tactile audio chime feedback using Web Audio API synthesis
 */
export function playVoiceChime(type: 'start' | 'stop' | 'error'): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'start') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'stop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.12);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'error') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    }
  } catch {
    // Ignore autoplay or audio constraints
  }
}

// Minimal Web Speech API interfaces for strict TypeScript environments
interface ISpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): ISpeechRecognitionAlternative;
  [index: number]: ISpeechRecognitionAlternative;
}

interface ISpeechRecognitionResultList {
  length: number;
  item(index: number): ISpeechRecognitionResult;
  [index: number]: ISpeechRecognitionResult;
}

interface ISpeechRecognitionEvent extends Event {
  results: ISpeechRecognitionResultList;
  resultIndex: number;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: ISpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechstart?: ((this: ISpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: ISpeechRecognitionInstance, ev: ISpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: ISpeechRecognitionInstance, ev: ISpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognitionInstance;

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionClass() !== null;
}

export function isMediaRecorderSupported(): boolean {
  return typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * GovGuideVoiceRecognizer
 * Unbreakable speech recognizer with real mic permission request and volume monitoring
 */
export class GovGuideVoiceRecognizer {
  private recognition: ISpeechRecognitionInstance | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private animFrameId: number | null = null;

  private isListening = false;
  private isExplicitlyStopped = false;
  private hasReceivedNativeResult = false;
  private accumulatedNativeText = '';

  private callbacks: SpeechRecognitionCallbacks = {};
  private language: SupportedSpeechLanguage = 'fil-PH';

  constructor(
    language: SupportedSpeechLanguage = 'fil-PH',
    callbacks: SpeechRecognitionCallbacks = {}
  ) {
    this.language = language;
    this.callbacks = callbacks;
  }

  public setLanguage(language: SupportedSpeechLanguage): void {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  public getLanguage(): SupportedSpeechLanguage {
    return this.language;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public async start(): Promise<boolean> {
    if (this.isListening) {
      return true;
    }

    this.isExplicitlyStopped = false;
    this.hasReceivedNativeResult = false;
    this.accumulatedNativeText = '';
    this.audioChunks = [];

    // Step 1: Explicitly request microphone stream from user
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Walang suporta sa microphone access ang iyong browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;
    } catch (err) {
      this.isListening = false;
      playVoiceChime('error');

      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');

      const message = isDenied
        ? 'Naka-block ang mikropono. Pakipindot ang lock icon sa address bar ng browser at piliin ang "Allow" para sa Mikropono.'
        : 'Hindi ma-access ang mikropono sa device na ito. Pakitiyak na nakasaksak ang mic o headset.';

      this.callbacks.onError?.(message, isDenied ? 'not-allowed' : 'no-device');
      return false;
    }

    this.isListening = true;
    playVoiceChime('start');
    this.callbacks.onStart?.();

    // Step 2: Setup real-time audio volume visualizer (RMS monitor)
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (AudioCtx && this.mediaStream) {
        const audioCtx = new AudioCtx();
        this.audioContext = audioCtx;
        const source = audioCtx.createMediaStreamSource(this.mediaStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!this.isListening) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          this.callbacks.onAudioLevel?.(normalized);
          this.animFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }
    } catch {
      // Audio level visualizer is optional enhancement
    }

    // Step 3: Setup background MediaRecorder backup
    if (typeof MediaRecorder !== 'undefined' && this.mediaStream) {
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

        const recorder = mimeType
          ? new MediaRecorder(this.mediaStream, { mimeType })
          : new MediaRecorder(this.mediaStream);

        this.mediaRecorder = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };

        recorder.start(250); // Collect slice every 250ms
      } catch (err) {
        console.warn('[GovGuideVoiceRecognizer] MediaRecorder init failed:', err);
      }
    }

    // Step 4: Setup Web Speech API for real-time speech streaming
    const SpeechClass = getSpeechRecognitionClass();
    if (SpeechClass) {
      try {
        const recognition = new SpeechClass();
        this.recognition = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = this.language;
        recognition.maxAlternatives = 1;

        recognition.onspeechstart = () => {
          this.callbacks.onSpeechStart?.();
        };

        recognition.onresult = (event: ISpeechRecognitionEvent) => {
          this.callbacks.onSpeechStart?.();
          let interimText = '';
          let newlyFinalText = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            const transcript = item[0]?.transcript || '';
            if (item.isFinal) {
              newlyFinalText += transcript;
            } else {
              interimText += transcript;
            }
          }

          if (interimText && this.callbacks.onInterim) {
            this.callbacks.onInterim(interimText.trim());
          }

          if (newlyFinalText) {
            this.hasReceivedNativeResult = true;
            this.accumulatedNativeText = this.accumulatedNativeText
              ? `${this.accumulatedNativeText} ${newlyFinalText.trim()}`
              : newlyFinalText.trim();
            this.callbacks.onResult?.(this.accumulatedNativeText);
          }
        };

        recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
          // If aborted due to user clicking stop/cancel, ignore
          if (event.error === 'aborted') return;

          // If no-speech was detected by native API, keep listening if user hasn't explicitly stopped
          if (event.error === 'no-speech') {
            return;
          }

          console.warn('[GovGuideVoiceRecognizer] Native recognition error:', event.error);
          // If native recognition has network or permission failure, we still have MediaRecorder recording!
        };

        recognition.onend = () => {
          // If user hasn't explicitly clicked stop/cancel, restart native recognition to avoid abrupt disconnects
          if (this.isListening && !this.isExplicitlyStopped) {
            try {
              recognition.start();
            } catch {
              // Ignore restart error
            }
          }
        };

        recognition.start();
      } catch (err) {
        console.warn('[GovGuideVoiceRecognizer] Could not start native SpeechRecognition:', err);
      }
    }

    return true;
  }

  public async stop(): Promise<void> {
    if (!this.isListening) return;

    this.isExplicitlyStopped = true;
    this.isListening = false;
    playVoiceChime('stop');

    // Stop real-time audio visualization
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }

    // Stop native recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!this.mediaRecorder) return resolve();
        this.mediaRecorder.onstop = () => resolve();
        try {
          this.mediaRecorder.stop();
        } catch {
          resolve();
        }
      });
    }

    // Stop all microphone tracks to release hardware
    this.stopMediaStreamTracks();

    // If native speech already gave us a good result, deliver it
    if (this.hasReceivedNativeResult && this.accumulatedNativeText.trim()) {
      this.callbacks.onResult?.(this.accumulatedNativeText.trim());
      this.callbacks.onEnd?.();
      return;
    }

    // If native speech did NOT deliver text (or failed/unsupported), use Gemini Audio AI fallback!
    if (this.audioChunks.length > 0) {
      const mime = this.mediaRecorder?.mimeType || 'audio/webm';
      const audioBlob = new Blob(this.audioChunks, { type: mime });

      if (audioBlob.size > 800) {
        try {
          this.callbacks.onInterim?.('Isinasalin ang boses gamit ang AI...');
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', this.language);

          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (data.ok && data.transcription) {
            this.callbacks.onResult?.(data.transcription);
            this.callbacks.onEnd?.();
            return;
          } else if (data.unclear) {
            this.callbacks.onError?.(
              'Hindi malinaw ang boses o walang narinig. Pakisubukan muli.',
              'unclear'
            );
          }
        } catch (err) {
          console.error('[GovGuideVoiceRecognizer] Fallback transcribe fetch failed:', err);
        }
      }
    }

    // If nothing was caught
    if (!this.accumulatedNativeText.trim()) {
      this.callbacks.onError?.(
        'Walang narinig na boses. Pakisubukan muli at magsalita nang malinaw.',
        'no-speech'
      );
    }

    this.callbacks.onEnd?.();
  }

  public abort(): void {
    this.isExplicitlyStopped = true;
    this.isListening = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext) {
      try {
        void this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore
      }
    }

    this.stopMediaStreamTracks();
    this.audioChunks = [];
    this.accumulatedNativeText = '';
    this.callbacks.onEnd?.();
  }

  private stopMediaStreamTracks(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      this.mediaStream = null;
    }
  }
}
