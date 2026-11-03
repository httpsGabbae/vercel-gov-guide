'use client';

import React from 'react';
import { Languages } from 'lucide-react';

interface LanguageToggleProps {
  language: 'fil' | 'en';
  onToggle: (lang: 'fil' | 'en') => void;
}

export function LanguageToggle({ language, onToggle }: LanguageToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-xs shadow-sm">
      <div className="flex items-center gap-1 px-1.5 text-slate-400">
        <Languages className="h-3.5 w-3.5" />
      </div>
      <button
        type="button"
        onClick={() => onToggle('fil')}
        className={`rounded-full px-2.5 py-1 font-semibold transition-all ${
          language === 'fil'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        🇵🇭 Taglish
      </button>
      <button
        type="button"
        onClick={() => onToggle('en')}
        className={`rounded-full px-2.5 py-1 font-semibold transition-all ${
          language === 'en'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        🌐 English
      </button>
    </div>
  );
}
