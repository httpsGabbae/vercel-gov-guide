'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { CivicMarkdown } from './CivicMarkdown';

interface AgentResponseViewProps {
  text: string;
  cards?: React.ReactNode;
  nextActions?: React.ReactNode;
  onOpenSource?: (sourceId: string) => void;
}

export function AgentResponseView({
  text,
  cards,
  nextActions,
  onOpenSource,
}: AgentResponseViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full transition-all">
      {/* Answer Body with Formatted Helpful Markdown */}
      <div className="w-full text-slate-800 pt-0.5">
        <CivicMarkdown content={text} onOpenSource={onOpenSource} />
      </div>

      {/* Copy Action repositioned cleanly at bottom of text */}
      <div className="mt-2.5 flex items-center justify-start">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-slate-50/80 hover:bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors shadow-2xs"
          title="Kopyahin ang tugon"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Nakopya</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-slate-400" />
              <span>Kopyahin</span>
            </>
          )}
        </button>
      </div>

      {/* Embedded Action/Inspection/Checklist Cards */}
      {cards && <div className="mt-3 space-y-2.5">{cards}</div>}

      {/* Next Suggested Action Chips */}
      {nextActions && <div className="mt-3.5">{nextActions}</div>}
    </div>
  );
}
