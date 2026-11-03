'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
  const [lang, setLang] = useState<'en' | 'fil'>('en');

  const toggle = () => {
    setLang((prev) => (prev === 'en' ? 'fil' : 'en'));
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="text-xs font-semibold px-2.5 py-1 h-8 rounded-full border-slate-300"
    >
      🇵🇭 {lang === 'en' ? 'EN | FIL' : 'FIL | EN'}
    </Button>
  );
}
