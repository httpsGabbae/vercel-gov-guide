'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export interface SourceItem {
  agency: string;
  service: string;
  section: string;
  breadcrumb: string;
  similarity: number;
  content?: string;
}

interface SourceChipsProps {
  sources: SourceItem[];
}

export function SourceChips({ sources }: SourceChipsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <BookOpen className="h-3.5 w-3.5 text-blue-600" />
        <span>Opisyal na Pinagbatayan (Citizen&apos;s Charter Sources)</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {sources.map((src, index) => {
          const matchPercent = Math.round(src.similarity * 100);
          const isExpanded = expandedIndex === index;

          return (
            <div key={index} className="flex flex-col">
              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  isExpanded
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
                aria-expanded={isExpanded}
              >
                <span>{src.agency}</span>
                <span className="text-[10px] opacity-75">§ {src.section}</span>
                <span className="rounded-full bg-black/10 px-1 py-0.2 text-[10px] font-bold">
                  {matchPercent}%
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-1.5 max-w-lg rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-slate-800 shadow-sm animate-in fade-in-50">
                  <div className="mb-1 flex items-center justify-between font-bold text-blue-900">
                    <span>{src.breadcrumb}</span>
                    <span className="text-[10px] text-blue-600">Relevance: {matchPercent}%</span>
                  </div>
                  <p className="whitespace-pre-line text-[11px] leading-relaxed text-slate-700">
                    {src.content || 'Napatunayang sumusunod sa pamantayan ng Citizen\'s Charter.'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
