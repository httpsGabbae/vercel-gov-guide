'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, X, AlertCircle, Loader2 } from 'lucide-react';
import {
  GovGuideVoiceRecognizer,
  isSpeechRecognitionSupported,
  isMediaRecorderSupported,
} from '@/lib/voice/speech-recognition';

interface VoiceInputButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onAutoSubmit?: (finalText: string) => void;
  initialText?: string;
  language?: 'Filipino' | 'English' | 'Auto';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  title?: string;
}

// 2.5 seconds of continuous silence before automatic stop & send (in the 2-3s required range)
const SILENCE_THRESHOLD_MS = 2500;

export function VoiceInputButton({
  onTranscript,
  onAutoSubmit,
  initialText = '',
  disabled = false,
  className = '',
  size = 'md',
  title = 'Voice Input / Magsalita sa Mikropono',
}: VoiceInputButtonProps) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voicePhase, setVoicePhase] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [interimText, setInterimText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognizerRef = useRef<GovGuideVoiceRecognizer | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const accumulatedSpeechRef = useRef<string>('');
  const initialTextRef = useRef<string>(initialText);

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const onAutoSubmitRef = useRef(onAutoSubmit);
  onAutoSubmitRef.current = onAutoSubmit;

  // Sync initialTextRef when microphone is inactive
  useEffect(() => {
    if (!isListening) {
      initialTextRef.current = initialText;
    }
  }, [initialText, isListening]);

  // Check browser speech capabilities on mount
  useEffect(() => {
    const supported = isSpeechRecognitionSupported() || isMediaRecorderSupported();
    setIsSupported(supported);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    clearSilenceTimer();
    isSubmittingRef.current = false;

    if (recognizerRef.current) {
      recognizerRef.current.abort();
    }
    setIsListening(false);
    setVoicePhase('idle');
    setInterimText('');
    setAudioLevel(0);
    accumulatedSpeechRef.current = '';
  }, [clearSilenceTimer]);

  /**
   * Schedule the 2-3 second silence detection timer.
   * If continuous silence persists for SILENCE_THRESHOLD_MS, automatically stop the mic
   * and submit the complete recognized message to the chatbot.
   */
  const scheduleSilenceSubmission = useCallback(() => {
    clearSilenceTimer();

    const currentSpoken = accumulatedSpeechRef.current.trim();
    if (!currentSpoken || isSubmittingRef.current) return;

    // Show "Processing your voice..." while silence cooldown is running
    setVoicePhase('processing');

    silenceTimerRef.current = setTimeout(async () => {
      if (isSubmittingRef.current) return;

      const finalText = accumulatedSpeechRef.current.trim();
      if (!finalText || finalText.length < 2) {
        setVoicePhase('listening');
        return;
      }

      // Concurrency lock to prevent duplicate submissions
      isSubmittingRef.current = true;
      setVoicePhase('processing');

      // Automatically stop microphone access
      if (recognizerRef.current) {
        await recognizerRef.current.stop();
      }

      // Return microphone to normal inactive state
      setIsListening(false);
      setVoicePhase('idle');
      setAudioLevel(0);
      setInterimText('');

      // Build complete message preserving pre-existing typed text
      const fullMessage = initialTextRef.current.trim()
        ? `${initialTextRef.current.trim()} ${finalText}`
        : finalText;

      // Update input field visibly
      onTranscriptRef.current(fullMessage, true);

      // Automatically send the message through the existing chatbot pipeline
      if (onAutoSubmitRef.current) {
        onAutoSubmitRef.current(fullMessage);
      }

      accumulatedSpeechRef.current = '';
      isSubmittingRef.current = false;
    }, SILENCE_THRESHOLD_MS);
  }, [clearSilenceTimer]);

  const handleStart = useCallback(async () => {
    if (!isSpeechRecognitionSupported() && !isMediaRecorderSupported()) {
      setErrorMessage(
        'Hindi suportado ang voice input sa browser na ito. Pakigamit ang Google Chrome, Microsoft Edge, Safari, o Firefox.'
      );
      setTimeout(() => setErrorMessage(null), 6000);
      return;
    }

    clearSilenceTimer();
    isSubmittingRef.current = false;
    setErrorMessage(null);
    setInterimText('');
    setAudioLevel(12);
    accumulatedSpeechRef.current = '';

    // Uses native multilingual fil-PH engine (natively understands Tagalog, English, and Taglish seamlessly)
    const recognizer = new GovGuideVoiceRecognizer('fil-PH', {
      onStart: () => {
        setIsListening(true);
        setVoicePhase('listening');
      },
      onSpeechStart: () => {
        // User resumed or started speaking: reset silence timer immediately
        clearSilenceTimer();
        setVoicePhase('listening');
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
        // Active human speech detected (> 22 volume): reset silence cooldown
        if (level > 22) {
          clearSilenceTimer();
          setVoicePhase('listening');
        }
      },
      onInterim: (text) => {
        // Continuous speech stream: cancel any pending silence auto-submission
        clearSilenceTimer();
        setVoicePhase('listening');
        setInterimText(text);

        const combinedPreview = accumulatedSpeechRef.current
          ? `${accumulatedSpeechRef.current} ${text}`
          : text;

        const fullPreview = initialTextRef.current.trim()
          ? `${initialTextRef.current.trim()} ${combinedPreview}`
          : combinedPreview;

        onTranscriptRef.current(fullPreview, false);
      },
      onResult: (finalChunk) => {
        // Sentence or clause boundary finalized: combine into continuous message
        accumulatedSpeechRef.current = finalChunk.trim();
        setInterimText('');

        const fullMessage = initialTextRef.current.trim()
          ? `${initialTextRef.current.trim()} ${accumulatedSpeechRef.current}`
          : accumulatedSpeechRef.current;

        onTranscriptRef.current(fullMessage, false);

        // User paused speaking: start the 2-3 second silence detection timer
        scheduleSilenceSubmission();
      },
      onError: (friendlyMsg) => {
        clearSilenceTimer();
        setErrorMessage(friendlyMsg);
        setIsListening(false);
        setVoicePhase('idle');
        setAudioLevel(0);
        setTimeout(() => setErrorMessage(null), 6000);
      },
      onEnd: () => {
        if (!isSubmittingRef.current && accumulatedSpeechRef.current.trim()) {
          // If native recognition reached end while speech was recorded, trigger submission
          scheduleSilenceSubmission();
        } else {
          setIsListening(false);
          setVoicePhase('idle');
          setAudioLevel(0);
        }
      },
    });

    recognizerRef.current = recognizer;
    const ok = await recognizer.start();
    if (!ok) {
      setIsListening(false);
      setVoicePhase('idle');
      setAudioLevel(0);
    }
  }, [clearSilenceTimer, scheduleSilenceSubmission]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      handleCancel();
    } else {
      void handleStart();
    }
  }, [isListening, handleCancel, handleStart]);

  // Keyboard shortcut Alt+V to start voice input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.code === 'KeyV') || (e.altKey && e.code === 'KeyM')) {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleListening]);

  // Clean up ONLY on component unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }
    };
  }, [clearSilenceTimer]);

  // Dynamic waveform bars computed from real-time audio levels
  const b1 = Math.max(4, Math.min(22, 4 + Math.round(audioLevel * 0.18)));
  const b2 = Math.max(6, Math.min(24, 6 + Math.round(audioLevel * 0.24)));
  const b3 = Math.max(8, Math.min(26, 8 + Math.round(audioLevel * 0.3)));
  const b4 = Math.max(6, Math.min(24, 6 + Math.round(audioLevel * 0.22)));
  const b5 = Math.max(4, Math.min(20, 4 + Math.round(audioLevel * 0.16)));

  return (
    <>
      {/* Active Voice Floating Banner */}
      {isListening && (
        <div
          role="status"
          aria-live="assertive"
          className={`absolute -top-16 left-2 right-2 z-50 flex items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 max-sm:-top-20 ${
            voicePhase === 'processing'
              ? 'border-emerald-300 bg-white/95 ring-2 ring-emerald-400/30'
              : 'border-rose-300 bg-white/95'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Live Indicator Icon */}
            {voicePhase === 'processing' ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </span>
            ) : (
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
              </span>
            )}

            {/* Dynamic Real-Time Audio Level Waveform Equalizer */}
            <div className="flex items-center gap-1 shrink-0 h-6 px-1" aria-hidden="true">
              <span
                className={`w-1 rounded-full transition-all duration-75 ${
                  voicePhase === 'processing' ? 'bg-emerald-500 soundwave-bar-1' : 'bg-rose-500'
                }`}
                style={{ height: `${b1}px` }}
              />
              <span
                className={`w-1 rounded-full transition-all duration-75 ${
                  voicePhase === 'processing' ? 'bg-emerald-500 soundwave-bar-2' : 'bg-rose-500'
                }`}
                style={{ height: `${b2}px` }}
              />
              <span
                className={`w-1 rounded-full transition-all duration-75 ${
                  voicePhase === 'processing' ? 'bg-emerald-500 soundwave-bar-3' : 'bg-rose-500'
                }`}
                style={{ height: `${b3}px` }}
              />
              <span
                className={`w-1 rounded-full transition-all duration-75 ${
                  voicePhase === 'processing' ? 'bg-emerald-500 soundwave-bar-4' : 'bg-rose-500'
                }`}
                style={{ height: `${b4}px` }}
              />
              <span
                className={`w-1 rounded-full transition-all duration-75 ${
                  voicePhase === 'processing' ? 'bg-emerald-500 soundwave-bar-5' : 'bg-rose-500'
                }`}
                style={{ height: `${b5}px` }}
              />
            </div>

            {/* Status & Live Preview Text */}
            <div className="min-w-0 flex-1">
              <p
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  voicePhase === 'processing' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {voicePhase === 'processing'
                  ? 'Processing your voice...'
                  : 'Listening...'}
              </p>

              {interimText ? (
                <p className="truncate text-xs font-medium text-slate-800 italic">
                  &ldquo;{interimText}&rdquo;
                </p>
              ) : accumulatedSpeechRef.current ? (
                <p className="truncate text-xs font-semibold text-slate-800">
                  &ldquo;{accumulatedSpeechRef.current}&rdquo;
                </p>
              ) : (
                <p className="truncate text-xs text-slate-500">
                  Magsalita sa Filipino, English, o Taglish...
                </p>
              )}
            </div>
          </div>

          {/* Action Controls: Status Badge & Cancel (No Stop Recording button!) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Automatic Processing Status Badge */}
            {voicePhase === 'processing' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                Sending automatically...
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                Tagalog · English · Taglish
              </span>
            )}

            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Kanselahin ang voice recording"
              aria-label="Cancel recording"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div
          role="alert"
          className="absolute -top-14 left-2 right-2 z-50 flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-md animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="line-clamp-2">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-amber-700 hover:text-amber-900 font-bold px-1"
            aria-label="Close error notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Microphone Button */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        aria-label={isListening ? 'Itigil ang voice recording' : title}
        title={
          !isSupported
            ? 'Hindi suportado ang voice input sa kasalukuyang browser'
            : isListening
              ? voicePhase === 'processing'
                ? 'Processing your voice... (I-click para kanselahin)'
                : 'Listening... (I-click para kanselahin)'
              : 'Magsalita sa mikropono (Voice Input) — Alt+V'
        }
        className={`relative inline-flex items-center justify-center rounded-[9px] transition-all press ${
          size === 'sm' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm'
        } ${
          isListening
            ? voicePhase === 'processing'
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
              : 'bg-rose-600 text-white shadow-md animate-mic-ring'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200'
        } ${className}`}
      >
        <Mic className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </>
  );
}
