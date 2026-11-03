'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { CitizenServiceRequest } from '@/lib/citizen/requests';
import { safeResponseJson } from '@/lib/utils';

interface RequestStatusSectionProps {
  citizenId?: string;
  onAskInChat?: (prompt: string) => void;
}

export function RequestStatusSection({ citizenId, onAskInChat }: RequestStatusSectionProps) {
  const [requests, setRequests] = useState<CitizenServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgency, setFilterAgency] = useState<'ALL' | 'DFA' | 'DPWH' | 'PSA' | 'NBI' | 'PHILHEALTH'>('ALL');

  // Fetch requests on mount or when citizenId changes
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const url = citizenId
        ? `/api/citizen/requests?citizenId=${encodeURIComponent(citizenId)}`
        : '/api/citizen/requests';
      const res = await fetch(url);
      const { data: json } = await safeResponseJson(res);
      if (json?.success && Array.isArray(json.data)) {
        setRequests(json.data);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  }, [citizenId]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = requests.filter((r) => {
    if (filterAgency === 'ALL') return true;
    return r.agencyCode === filterAgency;
  });

  return (
    <div className="space-y-6">
      {/* Agency Filter Tabs — Shown when citizen has active requests */}
      {requests.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="font-medium text-slate-400 mr-1 text-[11px] uppercase tracking-wider">Ahensya:</span>
          {(['ALL', 'PSA', 'DFA', 'NBI', 'PHILHEALTH', 'DPWH'] as const)
            .filter((ag) => ag === 'ALL' || requests.some((r) => r.agencyCode === ag))
            .map((ag) => (
              <button
                key={ag}
                type="button"
                onClick={() => setFilterAgency(ag)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  filterAgency === ag
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {ag === 'ALL'
                  ? `Lahat (${requests.length})`
                  : `${ag} (${requests.filter((r) => r.agencyCode === ag).length})`}
              </button>
            ))}
        </div>
      )}

      {/* REQUESTS LIST WITH MINIMALIST STATUS BAR */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
          <p className="text-sm font-semibold text-slate-800">Walang aktibong proseso sa ngayon</p>
          <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
            Magtanong sa chat tungkol sa opisyal na serbisyo (halimbawa: &ldquo;Paano kumuha ng PSA Birth Certificate?&rdquo;) upang simulan ang real-time process tracking.
          </p>
          {onAskInChat && (
            <button
              type="button"
              onClick={() => onAskInChat('Paano mag-request ng PSA Birth Certificate online o walk-in sa CRS outlet?')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition"
            >
              <span>Magtanong tungkol sa PSA Birth Certificate</span>
            </button>
          )}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">Walang proseso para sa piniling ahensya</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredRequests.map((req) => {
            const progressPercent = Math.round(((req.currentStep - 1) / (req.totalSteps - 1)) * 100);

            return (
              <div
                key={req.id}
                className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs"
              >
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                        {req.agencyCode}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {req.referenceNumber}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {req.id}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-slate-900">
                      {req.serviceTitle}
                    </h3>
                    <p className="text-xs text-slate-500">{req.serviceType}</p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                      Step {req.currentStep}/{req.totalSteps}: {req.statusLabel}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Updated {new Date(req.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* THE STATUS BAR / STEPPER TRACK — Clean Monochrome */}
                <div className="py-5">
                  {/* Clean neutral progress line */}
                  <div className="relative mb-6">
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-900 transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* 5 Step Checkpoints */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2">
                    {req.steps.map((step) => {
                      const isDone = step.completed;
                      const isCurrent = step.isCurrent;
                      const isUpcoming = !isDone && !isCurrent;

                      return (
                        <div
                          key={step.stepNumber}
                          className={`flex sm:flex-col items-start gap-3 sm:gap-1.5 transition-opacity ${
                            isUpcoming ? 'opacity-35 sm:opacity-40' : 'opacity-100'
                          }`}
                        >
                          {/* Step Node Circle */}
                          <div className="relative flex items-center justify-center shrink-0">
                            {isDone ? (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xs">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : isCurrent ? (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-white font-semibold text-xs text-slate-900 ring-2 ring-slate-100">
                                {step.stepNumber}
                              </div>
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white font-medium text-xs text-slate-400">
                                {step.stepNumber}
                              </div>
                            )}
                          </div>

                          {/* Step Text Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Step {step.stepNumber}
                              </span>
                            </div>
                            <h4
                              className={`text-xs font-semibold leading-tight ${
                                isCurrent
                                  ? 'text-slate-900 font-bold'
                                  : isDone
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {step.title}
                            </h4>
                            {step.timestamp && (
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {step.timestamp}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Location & Ask AI */}
                <div className="mt-2 rounded-lg bg-slate-50/80 px-3.5 py-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {req.location && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Location: <span className="font-medium text-slate-800">{req.location}</span></span>
                    </div>
                  )}

                  {onAskInChat && (
                    <button
                      type="button"
                      onClick={() =>
                        onAskInChat(
                          `Paano ko ihahanda ang requirements para sa aking ${req.serviceTitle} (Ref: ${req.referenceNumber}) na kasalukuyang nasa Step ${req.currentStep} (${req.statusLabel})?`
                        )
                      }
                      className="font-medium text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1 ml-auto"
                    >
                      Ask AI about this step &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
