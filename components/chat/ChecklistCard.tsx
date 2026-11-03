'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Receipt, ArrowRight, FastForward } from 'lucide-react';

export interface ChecklistItem {
  name: string;
  description: string;
  required: boolean;
  isPrimaryId?: boolean;
  issueNote?: string;
  status?: 'verified' | 'issue' | 'pending' | 'skipped';
}

export interface ChecklistCardProps {
  serviceName: string;
  agencyName: string;
  requirements: ChecklistItem[];
  processingFee: number;
  convenienceFee?: number;
  counterReadyTips?: string[];
  onOpenStepInChat?: (stepName: string) => void;
}

export function ChecklistCard({
  serviceName,
  agencyName,
  requirements,
  processingFee,
  convenienceFee,
  counterReadyTips = [],
  onOpenStepInChat,
}: ChecklistCardProps) {
  const [checkedIndices, setCheckedIndices] = useState<number[]>(() =>
    requirements
      .map((r, idx) => (r.status === 'verified' ? idx : -1))
      .filter((i) => i >= 0),
  );
  const [skippedIndices, setSkippedIndices] = useState<number[]>(() =>
    requirements
      .map((r, idx) => (r.status === 'skipped' ? idx : -1))
      .filter((i) => i >= 0),
  );

  const toggleCheck = (idx: number) => {
    // If it was skipped, unskip and mark checked
    setSkippedIndices((prev) => prev.filter((i) => i !== idx));
    setCheckedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  const toggleSkip = (idx: number) => {
    // If it was checked, uncheck
    setCheckedIndices((prev) => prev.filter((i) => i !== idx));
    setSkippedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  const activeTotal = Math.max(1, requirements.length - skippedIndices.length);
  const completed = checkedIndices.filter((i) => !skippedIndices.includes(i)).length;
  const scorePercent = Math.min(100, Math.round((completed / activeTotal) * 100));
  const totalFee = processingFee + (convenienceFee || 0);

  return (
    <div className="my-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
            {agencyName}
          </span>
          <h4 className="text-sm font-bold text-slate-900 sm:text-base">{serviceName}</h4>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <Receipt className="h-3.5 w-3.5" />
            <span>{totalFee === 0 ? 'LIBRE (₱0.00)' : `₱${totalFee.toFixed(2)}`}</span>
          </div>
        </div>
      </div>

      {/* Counter-Readiness Gauge */}
      <div className="my-3 space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-600">
            Pre-Flight Counter Readiness
          </span>
          <span
            className={
              scorePercent === 100
                ? 'font-bold text-emerald-600'
                : scorePercent >= 50
                  ? 'text-amber-600'
                  : 'text-slate-500'
            }
          >
            {completed} of {activeTotal} Ready ({scorePercent}%)
            {skippedIndices.length > 0 && ` · ${skippedIndices.length} Skipped`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-300 ${
              scorePercent === 100
                ? 'bg-emerald-500'
                : scorePercent >= 50
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
            }`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      {/* Stepping Requirements Checklist */}
      <div className="pt-2">
        <p className="mb-3 text-xs font-semibold text-slate-600">
          Sundin ang bawat step para maging Counter-Ready (i-check o i-skip kung hindi kailangan):
        </p>

        <div className="space-y-0">
          {requirements.map((req, idx) => {
            const isChecked = checkedIndices.includes(idx);
            const isSkipped = skippedIndices.includes(idx);
            const stepNum = idx + 1;
            const isLast = idx === requirements.length - 1;
            const hasError = !isChecked && !isSkipped && Boolean(req.issueNote || req.status === 'issue');

            return (
              <div key={idx} className="relative flex items-start gap-3 pb-4">
                {/* Vertical Stepper Connector Line */}
                {!isLast && (
                  <div
                    className={`absolute left-[13px] top-[26px] bottom-0 w-[2px] ${
                      isChecked
                        ? 'bg-emerald-400'
                        : isSkipped
                          ? 'bg-slate-300'
                          : hasError
                            ? 'bg-rose-300'
                            : 'bg-slate-200'
                    }`}
                    aria-hidden="true"
                  />
                )}

                {/* Step Indicator Badge */}
                <button
                  type="button"
                  onClick={() => toggleCheck(idx)}
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isChecked
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isSkipped
                        ? 'bg-slate-200 text-slate-600 border border-slate-300'
                        : hasError
                          ? 'bg-rose-600 text-white shadow-xs ring-4 ring-rose-100'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                  aria-label={`Toggle step ${stepNum}`}
                  title={isChecked ? 'Mark as Pending' : isSkipped ? 'Skipped (Click to mark Ready)' : 'Mark as Ready'}
                >
                  {isChecked ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isSkipped ? (
                    <FastForward className="h-3.5 w-3.5" />
                  ) : hasError ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <span>{stepNum}</span>
                  )}
                </button>

                {/* Step Body */}
                <div
                  className={`flex-1 min-w-0 rounded-xl border p-3 transition-all ${
                    hasError
                      ? 'border-rose-200 bg-rose-50/50'
                      : isChecked
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : isSkipped
                          ? 'border-slate-200 bg-slate-50/50 opacity-80'
                          : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Step {stepNum}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isChecked
                            ? 'text-slate-900 line-through opacity-70'
                            : isSkipped
                              ? 'text-slate-500 line-through'
                              : 'text-slate-800'
                        }`}
                      >
                        {req.name}
                      </span>
                      {req.isPrimaryId && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                          Primary ID
                        </span>
                      )}
                      {isSkipped && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                          ⏭ Na-skip · Hindi Kailangan
                        </span>
                      )}
                      {isChecked && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                          ✓ Ready
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCheck(idx)}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline"
                      >
                        {isChecked ? 'Mark Pending' : 'Ready'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSkip(idx)}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline"
                      >
                        {isSkipped ? 'Ibalik (Unskip)' : 'I-skip (N/A)'}
                      </button>
                      {onOpenStepInChat && (
                        <button
                          type="button"
                          onClick={() => onOpenStepInChat(req.name)}
                          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <span>Chat</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-600 leading-snug">{req.description}</p>

                  {/* Step Error Notice if flagged */}
                  {hasError && req.issueNote && (
                    <div className="mt-2 rounded-lg border border-rose-300 bg-rose-100/80 p-2 text-[11px] text-rose-900">
                      <div className="flex items-center gap-1 font-bold text-rose-800">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>May Isyu sa Step na Ito</span>
                      </div>
                      <p className="mt-0.5 text-rose-800 font-medium">{req.issueNote}</p>
                    </div>
                  )}

                  {/* Verified Notice if checked */}
                  {isChecked && req.issueNote && (
                    <p className="mt-1 text-[10.5px] font-medium text-emerald-700">
                      ✓ {req.issueNote}
                    </p>
                  )}

                  {/* Skipped Notice */}
                  {isSkipped && (
                    <p className="mt-1 text-[10.5px] font-medium text-slate-500">
                      ℹ️ {req.issueNote || 'Na-skip: Hindi kailangan para sa iyong transaksyon.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proactive Counter Tips (No emojis) */}
      {counterReadyTips.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
          <div className="mb-1 flex items-center gap-1 font-bold">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Iwas-Balik Pila Tips</span>
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-[11px] text-amber-800">
            {counterReadyTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
