'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { CitizenServiceRequest, RequestStatus } from '@/lib/citizen/requests';
import { safeResponseJson } from '@/lib/utils';

interface RequestStatusSectionProps {
  citizenId?: string;
  onAskInChat?: (prompt: string) => void;
}

export function RequestStatusSection({ citizenId, onAskInChat }: RequestStatusSectionProps) {
  const [requests, setRequests] = useState<CitizenServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgency, setFilterAgency] = useState<'ALL' | 'DFA' | 'DPWH' | 'PSA'>('ALL');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [simulatorStep, setSimulatorStep] = useState<number>(3);
  const [simulatorStatus, setSimulatorStatus] = useState<RequestStatus>('biometrics_or_inspection');
  const [simulatorStatusLabel, setSimulatorStatusLabel] = useState<string>('');
  const [simulatorNotes, setSimulatorNotes] = useState<string>('');
  const [simulatorOfficer, setSimulatorOfficer] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);
  const [showApiDocs, setShowApiDocs] = useState(false);

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
        if (json.data.length > 0 && !selectedReqId) {
          const first = json.data[0];
          setSelectedReqId(first.id);
          setSimulatorStep(first.currentStep);
          setSimulatorStatus(first.status);
          setSimulatorStatusLabel(first.statusLabel);
          setSimulatorNotes(first.officerNotes);
          setSimulatorOfficer(first.officerName);
        }
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  }, [citizenId, selectedReqId]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  // Sync simulator inputs when selected request changes
  const handleSelectRequestForEdit = (reqId: string) => {
    setSelectedReqId(reqId);
    const target = requests.find((r) => r.id === reqId);
    if (target) {
      setSimulatorStep(target.currentStep);
      setSimulatorStatus(target.status);
      setSimulatorStatusLabel(target.statusLabel);
      setSimulatorNotes(target.officerNotes);
      setSimulatorOfficer(target.officerName);
    }
  };

  // Submit status update via Agency PATCH endpoint (simulating Chrome Extension)
  const handleApplySimulatorUpdate = async () => {
    if (!selectedReqId) return;
    try {
      setIsUpdating(true);
      setUpdateSuccessMsg(null);

      const payload = {
        requestId: selectedReqId,
        currentStep: simulatorStep,
        status: simulatorStatus,
        statusLabel: simulatorStatusLabel,
        statusBadgeColor: 'slate',
        officerNotes: simulatorNotes,
        officerName: simulatorOfficer || 'Agency Counter Officer',
      };

      const res = await fetch('/api/agency/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-agency-role': 'counter_officer',
        },
        body: JSON.stringify(payload),
      });

      const { data: json, error: parseError } = await safeResponseJson(res);
      if (json?.success && json.data) {
        setRequests((prev) =>
          prev.map((r) => (r.id === json.data.id ? json.data : r))
        );
        setUpdateSuccessMsg(`Status updated: Step ${json.data.currentStep}/5 (${json.data.statusLabel})`);
        setTimeout(() => setUpdateSuccessMsg(null), 3500);
      } else {
        alert(json?.error || parseError || 'Failed to update request');
      }
    } catch (err) {
      console.error('Error updating via simulator:', err);
      alert('Error communicating with agency API');
    } finally {
      setIsUpdating(false);
    }
  };

  // Reset demo
  const handleResetDemo = async () => {
    try {
      const res = await fetch('/api/citizen/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_demo' }),
      });
      const { data: json } = await safeResponseJson(res);
      if (json?.success && json.data) {
        setRequests(json.data);
        if (json.data[0]) {
          handleSelectRequestForEdit(json.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterAgency === 'ALL') return true;
    return r.agencyCode === filterAgency;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar — Minimalist Neutral */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-800 font-semibold text-xs">
              📋
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
              Service Requests
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSimulatorOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
              isSimulatorOpen
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {isSimulatorOpen ? 'Isara Simulator' : 'Officer Simulator'}
          </button>

          <button
            type="button"
            onClick={handleResetDemo}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            title="I-reset ang mga request"
          >
            I-reset
          </button>
        </div>
      </div>

      {/* Agency Filter Tabs — Muted & Clean */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="font-medium text-slate-400 mr-1 text-[11px] uppercase tracking-wider">Ahensya:</span>
        {(['ALL', 'DFA', 'DPWH', 'PSA'] as const).map((ag) => (
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

      {/* CHROME EXTENSION AGENCY SIMULATOR PANEL — Minimalist Neutral */}
      {isSimulatorOpen && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                  Chrome Extension · Agency Side
                </span>
                <span className="text-xs font-semibold text-slate-900">
                  Counter Officer Status Control
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowApiDocs((prev) => !prev)}
              className="text-xs font-medium text-slate-700 underline hover:text-slate-900 self-start sm:self-auto"
            >
              {showApiDocs ? 'Hide API' : 'Extension API'}
            </button>
          </div>

          {updateSuccessMsg && (
            <div className="rounded-md bg-slate-900 text-white px-3 py-2 text-xs font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {updateSuccessMsg}
              </span>
            </div>
          )}

          {showApiDocs && (
            <div className="rounded-lg bg-slate-900 p-3 text-white text-xs font-mono space-y-2 overflow-x-auto">
              <div className="text-slate-400 font-sans font-medium flex justify-between text-[11px]">
                <span>Chrome Extension Background Script / Popup API Call:</span>
                <span className="text-slate-400">REST · CORS Enabled</span>
              </div>
              <pre className="text-slate-300 text-[11px] leading-relaxed">
{`// 1. Fetch requests for counter officer
const res = await fetch('http://localhost:3000/api/agency/requests?agencyCode=DFA');
const { data: requests } = await res.json();

// 2. Edit Status Bar & Push Live Update
await fetch('http://localhost:3000/api/agency/requests', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestId: "${selectedReqId || 'REQ-DFA-2026-8921'}",
    currentStep: ${simulatorStep}, // 1 to 5
    status: "${simulatorStatus}",
    statusLabel: "${simulatorStatusLabel || 'Step Updated'}",
    officerNotes: "${simulatorNotes.slice(0, 40)}...",
    officerName: "${simulatorOfficer || 'Consular Officer'}"
  })
});`}
              </pre>
            </div>
          )}

          {/* Form Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Citizen Request:
              </label>
              <select
                value={selectedReqId}
                onChange={(e) => handleSelectRequestForEdit(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-hidden"
              >
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.agencyCode}] {r.serviceTitle.slice(0, 28)}...
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Advance Status (Step 1–5):
              </label>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((stepNum) => (
                  <button
                    key={stepNum}
                    type="button"
                    onClick={() => {
                      setSimulatorStep(stepNum);
                      if (stepNum === 1) {
                        setSimulatorStatus('submitted');
                        setSimulatorStatusLabel('Application Submitted');
                      } else if (stepNum === 2) {
                        setSimulatorStatus('under_review');
                        setSimulatorStatusLabel('Counter Eligibility Review');
                      } else if (stepNum === 3) {
                        setSimulatorStatus('biometrics_or_inspection');
                        setSimulatorStatusLabel('In-Person Biometrics / Inspection');
                      } else if (stepNum === 4) {
                        setSimulatorStatus('processing_production');
                        setSimulatorStatusLabel('Processing & Production');
                      } else if (stepNum === 5) {
                        setSimulatorStatus('ready_released');
                        setSimulatorStatusLabel('Ready for Release');
                      }
                    }}
                    className={`h-8 rounded text-xs font-medium transition-all ${
                      simulatorStep === stepNum
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {stepNum}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Status Label:
              </label>
              <input
                type="text"
                value={simulatorStatusLabel}
                onChange={(e) => setSimulatorStatusLabel(e.target.value)}
                placeholder="e.g. Counter Biometrics Completed"
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Officer Name:
              </label>
              <input
                type="text"
                value={simulatorOfficer}
                onChange={(e) => setSimulatorOfficer(e.target.value)}
                placeholder="e.g. Consular Officer"
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Counter Remarks / Instructions:
            </label>
            <textarea
              rows={2}
              value={simulatorNotes}
              onChange={(e) => setSimulatorNotes(e.target.value)}
              placeholder="Instructions or requirements for the citizen..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleApplySimulatorUpdate}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 active:scale-98 transition disabled:opacity-50"
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Push Update to Status Bar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* REQUESTS LIST WITH MINIMALIST MONOCHROME STATUS BAR */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No requests found</p>
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
                              {isCurrent && (
                                <span className="rounded bg-slate-100 border border-slate-200 px-1 py-0.1 text-[9px] font-semibold text-slate-700 uppercase">
                                  Active
                                </span>
                              )}
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

                {/* Counter Remarks & Information — Quiet Neutral Box */}
                <div className="mt-2 rounded-lg bg-slate-50/80 p-3.5 border border-slate-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                        §
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-900">
                          {req.officerName}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1.5">
                          · {req.officerRole}
                        </span>
                      </div>
                    </div>
                    {req.appointmentSchedule && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {req.appointmentSchedule}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    <span className="font-medium text-slate-900">Officer Notes: </span>
                    {req.officerNotes}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Location: {req.location}</span>
                    </div>

                    {onAskInChat && (
                      <button
                        type="button"
                        onClick={() =>
                          onAskInChat(
                            `Paano ko ihahanda ang requirements para sa aking ${req.serviceTitle} (Ref: ${req.referenceNumber}) na kasalukuyang nasa Step ${req.currentStep} (${req.statusLabel})?`
                          )
                        }
                        className="font-medium text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1"
                      >
                        Ask AI about this step &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
