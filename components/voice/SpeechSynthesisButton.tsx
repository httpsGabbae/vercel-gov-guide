'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, Square, Loader2 } from 'lucide-react';
import {
  speakCivicGuidance,
  stopSpeaking,
  isSpeechSynthesisSupported,
} from '@/lib/voice/speech-synthesis';

interface SpeechSynthesisButtonProps {
  text: string;
  language?: 'Filipino' | 'English' | 'Auto';
  className?: string;
}

export function SpeechSynthesisButton({
  text,
  language = 'Filipino',
  className = '',
}: SpeechSynthesisButtonProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    setIsSupported(isSpeechSynthesisSupported());
    return () => {
      // Stop speech when component unmounts
      stopSpeaking();
    };
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }

    const success = speakCivicGuidance(text, {
      language,
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });

    if (!success) {
      setIsPlaying(false);
    }
  }, [isPlaying, text, language]);

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleTogglePlay}
      aria-label={isPlaying ? 'Itigil ang pagsasalita' : 'Basahin nang malakas ang sagot'}
      title={isPlaying ? 'Itigil ang pagbabasa' : 'Pakinggan ang opisyal na paliwanag'}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors shadow-2xs ${
        isPlaying
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          : 'border-slate-200/80 bg-slate-50/80 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      } ${className}`}
    >
      {isPlaying ? (
        <>
          <span className="flex items-center gap-0.5">
            <span className="h-2 w-0.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="h-3 w-0.5 rounded-full bg-emerald-600 animate-pulse delay-75" />
            <span className="h-2 w-0.5 rounded-full bg-emerald-600 animate-pulse delay-150" />
          </span>
          <Square className="h-2.5 w-2.5 text-emerald-700 fill-emerald-700" />
          <span className="text-emerald-800 font-semibold">Huminto</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3 w-3 text-slate-400" />
          <span>Pakinggan</span>
        </>
      )}
    </button>
  );
}
