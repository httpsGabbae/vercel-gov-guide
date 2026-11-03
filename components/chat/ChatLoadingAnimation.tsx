'use client';

import React, { useState } from 'react';
import { ChevronRight, ShieldCheck, Sparkles, Check } from 'lucide-react';

export interface LoadingStep {
  id: string;
  label: string;
  status: 'running' | 'done' | 'pending';
}

interface ChatLoadingAnimationProps {
  steps?: LoadingStep[];
  phase?: 'booting' | 'working' | 'done';
  fileName?: string;
}

export function ChatLoadingAnimation({
  steps = [],
  phase = 'working',
  fileName,
}: ChatLoadingAnimationProps) {
  const [expanded, setExpanded] = useState(true);

  // Compute progress percentage and active step
  const runningIndex = steps.findIndex((s) => s.status === 'running');
  const doneCount = steps.filter((s) => s.status === 'done').length;
  const totalCount = Math.max(steps.length, 1);

  const activeStep = steps.find((s) => s.status === 'running') || steps[steps.length - 1];

  // Dynamic progress percentage for smooth bar
  let progressPct = 25;
  if (steps.length > 0) {
    if (phase === 'done') {
      progressPct = 100;
    } else if (runningIndex !== -1) {
      progressPct = Math.min(95, Math.round(((runningIndex + 0.6) / steps.length) * 100));
    } else if (doneCount > 0) {
      progressPct = Math.min(95, Math.round((doneCount / steps.length) * 100));
    }
  }

  const activeTitle = activeStep?.label
    ? activeStep.label
    : fileName
      ? `Scanning ${fileName} for expired dates & mismatched info...`
      : "Cross-checking official Citizen's Charter requirements...";

  return (
    <div className="w-full max-w-[680px] rounded-2xl rounded-tl-sm border border-emerald-200/80 bg-gradient-to-b from-emerald-50/50 via-white to-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(26,127,75,0.06)] animate-in fade-in-50 duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/70 pb-3">
        <div className="flex items-center gap-2.5">
          {/* Pulsing Avatar with Civic Aura */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-emerald-300/80 shadow-xs civic-aura">
            <span className="flex h-3 w-3 rounded-full bg-emerald-600 animate-ping opacity-75 absolute" />
            <Sparkles className="h-4 w-4 text-emerald-600 relative z-10" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-bold text-slate-900 tracking-tight">
                GovGuide AI
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Deep Inspection
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Consulting Citizen&apos;s Charter rules &amp; anti-rejection provisions
            </span>
          </div>
        </div>

        {/* 3 Animated Civic Bouncing Dots */}
        <div
          className="flex items-center gap-1.5 rounded-full bg-slate-100/80 px-2.5 py-1 border border-slate-200/60"
          title="AI is thinking and verifying"
        >
          <span className="text-[11px] font-semibold text-slate-600 mr-1">Thinking</span>
          <span className="h-2 w-2 rounded-full bg-[#1a7f4b] civic-dot-1" />
          <span className="h-2 w-2 rounded-full bg-[#f59e0b] civic-dot-2" />
          <span className="h-2 w-2 rounded-full bg-[#2563eb] civic-dot-3" />
        </div>
      </div>

      {/* Live Stage Status Banner */}
      <div className="my-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="shimmer font-semibold text-[13px] tracking-tight">{activeTitle}</span>
          <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
            {progressPct}% Verified
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-600 transition-all duration-700 ease-out rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Realistic Shimmering Skeleton Preview Lines */}
      <div className="my-4 space-y-2.5 rounded-xl bg-slate-50/60 p-3.5 border border-slate-100/90">
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>Formulating Citizen&apos;s Charter counter-ready response...</span>
        </div>
        <div className="h-3.5 w-11/12 rounded-full civic-skeleton" />
        <div className="h-3.5 w-4/5 rounded-full civic-skeleton" />
        <div className="h-3.5 w-3/5 rounded-full civic-skeleton" />
      </div>

      {/* Step Breakdown Disclosure */}
      {steps.length > 0 && (
        <div className="mt-3 border-t border-slate-100/80 pt-2.5">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg px-1.5 py-1 text-left text-xs text-slate-600 hover:text-slate-900 transition-colors"
            aria-expanded={expanded}
          >
            <span className="font-medium">
              View verification steps ({doneCount} of {totalCount} completed)
            </span>
            <ChevronRight
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          </button>

          {expanded && (
            <ol className="mt-2.5 space-y-2 pl-1 animate-in fade-in-50 duration-200">
              {steps.map((st, idx) => {
                const isDone = st.status === 'done';
                const isRunning = st.status === 'running';
                return (
                  <li key={st.id || idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200 ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-200'
                          : isRunning
                            ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-600 animate-pulse'
                            : 'bg-slate-50 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isDone ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : isRunning ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span
                      className={`flex-1 transition-colors ${
                        isDone
                          ? 'text-slate-400 font-normal line-through'
                          : isRunning
                            ? 'text-slate-900 font-semibold'
                            : 'text-slate-500 font-normal'
                      }`}
                    >
                      {st.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {/* RA 10173 & Anti-Red Tape Guarantee */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100/70 pt-2">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          <span>RA 10173 &amp; RA 11032 Anti-Red Tape Guarantee</span>
        </span>
        <span className="italic">Zero permanent biometric storage</span>
      </div>
    </div>
  );
}

