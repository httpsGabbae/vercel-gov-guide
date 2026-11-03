'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  LogOut,
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Search,
  RotateCw,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { CitizenServiceRequest, RequestStatus } from '@/lib/citizen/requests';
import { safeResponseJson } from '@/lib/utils';

export default function AgencyDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [officerEmail, setOfficerEmail] = useState('psa@gov.ph');
  const [agencyCode, setAgencyCode] = useState('PSA');
  const [agencyName, setAgencyName] = useState('Philippine Statistics Authority');
  const [requests, setRequests] = useState<CitizenServiceRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStep, setFilterStep] = useState<number | 'ALL'>('ALL');
  const [selectedReq, setSelectedReq] = useState<CitizenServiceRequest | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editStatusLabel, setEditStatusLabel] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Resolve logged-in agency officer
  useEffect(() => {
    async function loadOfficerSession() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const user = authData.user;
          setOfficerEmail(user.email || 'officer@gov.ph');

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          let agencyObj: { id: string; code: string; name: string } | null = null;
          if (profile?.agency_id) {
            const { data: ag } = await supabase
              .from('agencies')
              .select('id, code, name')
              .eq('id', profile.agency_id)
              .maybeSingle();
            if (ag) agencyObj = ag;
          }

          if (!agencyObj) {
            if (user.email?.includes('psa')) agencyObj = { id: 'psa', code: 'PSA', name: 'Philippine Statistics Authority' };
            else if (user.email?.includes('dfa')) agencyObj = { id: 'dfa', code: 'DFA', name: 'Department of Foreign Affairs' };
            else if (user.email?.includes('dpwh')) agencyObj = { id: 'dpwh', code: 'DPWH', name: 'Department of Public Works and Highways' };
          }

          if (agencyObj) {
            setAgencyCode(agencyObj.code);
            setAgencyName(agencyObj.name);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    void loadOfficerSession();
  }, []);

  // 2. Fetch requests for this agency
  const fetchAgencyRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agency/requests?agencyCode=${encodeURIComponent(agencyCode)}`);
      const { data: json } = await safeResponseJson(res);
      if (json?.success && Array.isArray(json.data)) {
        setRequests(json.data);
        if (json.data.length > 0 && !selectedReq) {
          setSelectedReq(json.data[0]);
          setEditNotes(json.data[0].officerNotes || '');
          setEditStatusLabel(json.data[0].statusLabel || '');
        }
      }
    } catch (err) {
      console.error('Failed to load agency requests:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyCode, selectedReq]);

  useEffect(() => {
    void fetchAgencyRequests();
  }, [fetchAgencyRequests]);

  // Handle Advance Step
  const handleAdvanceStep = async (stepNum: number, statusLabel: string, statusKey: RequestStatus) => {
    if (!selectedReq) return;
    try {
      setIsUpdating(true);
      const payload = {
        requestId: selectedReq.id,
        currentStep: stepNum,
        status: statusKey,
        statusLabel: editStatusLabel || statusLabel,
        officerNotes: editNotes,
        officerName: `Officer (${agencyCode})`,
      };

      const res = await fetch('/api/agency/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-agency-role': 'counter_officer',
        },
        body: JSON.stringify(payload),
      });

      const { data: json } = await safeResponseJson(res);
      if (json?.success && json.data) {
        setRequests((prev) =>
          prev.map((r) => (r.id === json.data.id ? json.data : r))
        );
        setSelectedReq(json.data);
        setSuccessToast(`Request ${json.data.referenceNumber} advanced to Step ${stepNum}: ${json.data.statusLabel}`);
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (filterStep !== 'ALL' && r.currentStep !== filterStep) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.referenceNumber.toLowerCase().includes(q) ||
      r.serviceTitle.toLowerCase().includes(q) ||
      (r.citizenName && r.citizenName.toLowerCase().includes(q)) ||
      r.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Agency Navigation Bar */}
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            title="Bumalik sa Citizen Chat"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs">
              {agencyCode}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {agencyName}
                </h1>
                <span className="hidden sm:inline-flex rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                  Official Agency Portal
                </span>
              </div>
              <p className="text-[12px] text-slate-500">
                Authorized Counter Review &amp; Charter Milestone Dispatch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-xs font-semibold text-slate-900">{agencyCode} Counter Officer</span>
            <span className="text-[11px] text-slate-500">{officerEmail}</span>
          </div>
          <Link
            href="/chat"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Citizen Chat
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Mag-sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Toast Alert */}
        {successToast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{successToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Agency Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-medium text-slate-500">Total Submissions</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{requests.length}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Under {agencyCode} Citizen&apos;s Charter</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-medium text-slate-500">Counter Review</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {requests.filter((r) => r.currentStep === 2).length}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Document inspection queue</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-medium text-slate-500">In-Person / Biometrics</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {requests.filter((r) => r.currentStep === 3).length}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Scheduled appointments</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-medium text-slate-500">Counter-Ready / Released</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {requests.filter((r) => r.currentStep >= 4).length}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Production and completed</p>
          </div>
        </div>

        {/* Master-Detail Agency Request Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Requests List (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search and Step Filters */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Mag-search ng reference number, citizen, o serbisyo..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-slate-400 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 text-xs">
                <span className="text-[11px] font-medium text-slate-400 mr-1">Hakbang:</span>
                {(['ALL', 1, 2, 3, 4, 5] as const).map((stepVal) => (
                  <button
                    key={stepVal}
                    type="button"
                    onClick={() => setFilterStep(stepVal)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                      filterStep === stepVal
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {stepVal === 'ALL' ? 'Lahat' : `Step ${stepVal}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Requests List */}
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
                Loading {agencyCode} submissions...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
                Walang nahanap na kahilingan para sa {agencyCode}.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req) => {
                  const isSelected = selectedReq?.id === req.id;
                  return (
                    <div
                      key={req.id}
                      onClick={() => {
                        setSelectedReq(req);
                        setEditNotes(req.officerNotes || '');
                        setEditStatusLabel(req.statusLabel || '');
                      }}
                      className={`cursor-pointer rounded-xl border p-4 sm:p-5 transition-all shadow-2xs ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/20 ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 text-[10px]">
                              {req.agencyCode}
                            </span>
                            <span className="text-xs font-mono font-semibold text-slate-900">
                              {req.referenceNumber}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(req.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <h3 className="mt-1 text-sm font-bold text-slate-900 truncate">
                            {req.serviceTitle}
                          </h3>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            Applicant: {req.citizenName || 'Citizen Applicant'} · Location: {req.location}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                            Step {req.currentStep}/5
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">{req.statusLabel}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Request Officer Action Pane (5 Cols) */}
          <div className="lg:col-span-5 sticky top-24">
            {selectedReq ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-slate-900 text-white font-bold px-2 py-0.5 text-[10px] uppercase">
                      Counter Officer Directive
                    </span>
                    <span className="text-xs font-mono text-slate-400">{selectedReq.id}</span>
                  </div>
                  <h2 className="mt-2 text-base font-bold text-slate-900">
                    {selectedReq.serviceTitle}
                  </h2>
                  <p className="text-xs text-slate-500">Ref: {selectedReq.referenceNumber}</p>
                </div>

                {/* 5-Step Progression Dispatcher */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Advance Citizen Milestone:
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { step: 1, label: 'Submitted', key: 'submitted' as RequestStatus },
                      { step: 2, label: 'Review', key: 'under_review' as RequestStatus },
                      { step: 3, label: 'Biometrics', key: 'biometrics_or_inspection' as RequestStatus },
                      { step: 4, label: 'Production', key: 'processing_production' as RequestStatus },
                      { step: 5, label: 'Released', key: 'ready_released' as RequestStatus },
                    ].map((s) => (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => {
                          setEditStatusLabel(s.label);
                          void handleAdvanceStep(s.step, s.label, s.key);
                        }}
                        disabled={isUpdating}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-center transition-all ${
                          selectedReq.currentStep === s.step
                            ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-300 shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                        }`}
                      >
                        <span className="text-xs">Step {s.step}</span>
                        <span className="text-[10px] truncate max-w-full opacity-90">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Directive Notes to Citizen */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    Official Counter Remarks:
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Ilagay ang tagubilin ng ahensya sa aplikante (e.g. Counter document inspection passed)..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-colors"
                  />
                </div>

                {/* Save Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Live synced to citizen portal &amp; notifications
                  </span>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      void handleAdvanceStep(
                        selectedReq.currentStep,
                        selectedReq.statusLabel,
                        selectedReq.status
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
                  >
                    {isUpdating ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    <span>I-save ang Directive</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-400">
                Pumili ng kahilingan sa kaliwa upang magpadala ng update o directive.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
