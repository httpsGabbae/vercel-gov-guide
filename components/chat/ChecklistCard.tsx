'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, Sparkles, Receipt } from 'lucide-react';

export interface ChecklistItem {
  name: string;
  description: string;
  required: boolean;
  isPrimaryId?: boolean;
}

export interface ChecklistCardProps {
  serviceName: string;
  agencyName: string;
  requirements: ChecklistItem[];
  processingFee: number;
  convenienceFee?: number;
  counterReadyTips?: string[];
}

export function ChecklistCard({
  serviceName,
  agencyName,
  requirements,
  processingFee,
  convenienceFee,
  counterReadyTips = [],
}: ChecklistCardProps) {
  const [checkedIndices, setCheckedIndices] = useState<number[]>([]);

  const toggleCheck = (idx: number) => {
    setCheckedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  const total = requirements.length;
  const completed = checkedIndices.length;
  const scorePercent = total > 0 ? Math.round((completed / total) * 100) : 100;

  const totalFee = processingFee + (convenienceFee || 0);

  return (
    <div className="my-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all sm:p-5">
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
          <span className="flex items-center gap-1 text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
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
            {completed} of {total} Ready ({scorePercent}%)
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

      {/* Interactive Checkbox List */}
      <div className="space-y-2 pt-1">
        <p className="text-xs font-semibold text-slate-500">
          I-tsek ang mga dokumentong hawak mo na:
        </p>
        {requirements.map((req, idx) => {
          const isChecked = checkedIndices.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleCheck(idx)}
              className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                isChecked
                  ? 'border-emerald-200 bg-emerald-50/50 text-slate-800'
                  : 'border-slate-100 bg-slate-50/60 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isChecked ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-semibold ${
                      isChecked ? 'text-slate-900 line-through opacity-70' : 'text-slate-800'
                    }`}
                  >
                    {req.name}
                  </span>
                  {req.isPrimaryId && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
                      Primary ID
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">{req.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Proactive Counter Tips */}
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
