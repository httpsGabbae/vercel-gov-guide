'use client';

import React, { useState } from 'react';
import {
  Globe,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  ChevronRight,
  Info,
  Building2,
  Sparkles,
  ArrowRight,
  Check,
  HelpCircle,
} from 'lucide-react';
import type { OnlineApplicationData } from '@/lib/services/online-services';

interface OnlineApplicationCardProps {
  data: OnlineApplicationData;
  onOpenPsaForm?: () => void;
  onOpenDfaScheduler?: () => void;
  onAskInChat?: (prompt: string) => void;
  className?: string;
}

export function OnlineApplicationCard({
  data,
  onOpenPsaForm,
  onOpenDfaScheduler,
  onAskInChat,
  className = '',
}: OnlineApplicationCardProps) {
  const [activeTab, setActiveTab] = useState<'online' | 'walkin' | 'exceptions'>('online');
  const [copiedLink, setCopiedLink] = useState(false);

  const isOnlineReady = data.badgeVariant === 'online_ready';
  const isHybrid = data.badgeVariant === 'hybrid';
  const isWalkinOnly = data.badgeVariant === 'walkin_only';

  const handleCopyPortal = async () => {
    try {
      await navigator.clipboard.writeText(data.primaryPortalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      role="region"
      aria-label={`Online Application Guidance: ${data.serviceTitle}`}
      className={`relative w-full overflow-hidden rounded-2xl border transition-all duration-300 ${
        isOnlineReady
          ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50/40 via-white to-white shadow-[0_4px_20px_-4px_rgba(16,185,129,0.12),0_0_0_1px_rgba(16,185,129,0.1)]'
          : isHybrid
            ? 'border-blue-200/90 bg-gradient-to-b from-blue-50/40 via-white to-white shadow-[0_4px_20px_-4px_rgba(37,99,235,0.12),0_0_0_1px_rgba(37,99,235,0.1)]'
            : 'border-amber-200/90 bg-gradient-to-b from-amber-50/40 via-white to-white shadow-[0_4px_20px_-4px_rgba(245,158,11,0.12),0_0_0_1px_rgba(245,158,11,0.1)]'
      } ${className}`}
    >
      {/* Top Civic Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-xs sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isOnlineReady && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                isOnlineReady ? 'bg-emerald-500' : isHybrid ? 'bg-blue-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase ${
              isOnlineReady
                ? 'text-emerald-700'
                : isHybrid
                  ? 'text-blue-700'
                  : 'text-amber-800'
            }`}
          >
            {data.badgeLabel}
          </span>
        </div>

        {/* Official Portal Pill */}
        <div className="flex items-center gap-2">
          <a
            href={data.primaryPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-[11.5px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition-colors"
          >
            <Globe className="h-3 w-3 text-slate-500" />
            <span>{data.primaryPortalName}</span>
            <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
          </a>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Title & Agency */}
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            {data.agencyName}
          </span>
          <h3 className="mt-0.5 text-base sm:text-lg font-bold tracking-tight text-slate-900">
            {data.serviceTitle}
          </h3>
        </div>

        {/* BLOCKER ALERT (When cannot apply online e.g. RA 9048 name correction) */}
        {!data.canApplyOnline && data.blockerReason && (
          <div className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-slate-800">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <h4 className="text-xs sm:text-[13px] font-bold text-amber-900">
                  Hindi Maaring I-apply Online (Kailangan ng Personal Appearance sa LCRO)
                </h4>
                <p className="mt-1 text-xs sm:text-[12.5px] leading-relaxed text-amber-950">
                  {data.blockerReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* HAPPY PATH: Clean Key Metrics Grid */}
        {data.canApplyOnline && (
          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Metric 1: Fee */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                <span>Bayarin (Fee)</span>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {data.onlineFeeText.split(' ')[0]}
              </div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Kasama na ang SECPA at courier delivery (₱155 kung CRS walk-in)
              </p>
            </div>

            {/* Metric 2: Turnaround SLA */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <Truck className="h-3.5 w-3.5 text-blue-600" />
                <span>Delivery SLA</span>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                1–3 Araw <span className="text-xs font-normal text-slate-500">(NCR)</span>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                3–8 araw sa mga probinsya sa buong Pilipinas
              </p>
            </div>

            {/* Metric 3: Queue Time */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span>Oras sa Pila</span>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                0 Minuto <span className="text-xs font-semibold text-emerald-600">Zero Balik-Pila</span>
              </div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Diretso sa tahanan, hindi na kailangan lumiban sa trabaho
              </p>
            </div>
          </div>
        )}

        {/* Profile Readiness Pill (if citizen has saved details) */}
        {data.profileReadiness && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 px-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-900">
                  {data.profileReadiness.readinessScore}% Profile Ready
                </span>
                <span className="text-slate-500 ml-1.5 hidden sm:inline">
                  {data.profileReadiness.isProfileReady
                    ? 'Kumpleto ang mga pangunahing detalye para sa instant form drafting'
                    : `May kulang na ${data.profileReadiness.missingFields.length} impormasyon`}
                </span>
              </div>
            </div>

            {onOpenPsaForm && (
              <button
                type="button"
                onClick={onOpenPsaForm}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                <span>I-preview ang Pre-filled Form</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Clean Interactive Tab Switcher */}
        <div className="mt-4 flex border-b border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 transition-all ${
              activeTab === 'online'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Doorstep Delivery (Online)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('walkin')}
            className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 transition-all ${
              activeTab === 'walkin'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Walk-in CRS Outlet (₱155)</span>
          </button>

          {data.exceptionsNotice && (
            <button
              type="button"
              onClick={() => setActiveTab('exceptions')}
              className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 transition-all ${
                activeTab === 'exceptions'
                  ? 'border-amber-600 text-amber-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Kailan Bawal Online?</span>
            </button>
          )}
        </div>

        {/* TAB 1: Online Doorstep Delivery (Default) */}
        {activeTab === 'online' && (
          <div className="mt-3.5 space-y-3.5 animate-fadeIn">
            {/* Step-by-Step Flow */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Paano Mag-apply Online (3 Madaling Hakbang)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {data.steps.map((st) => (
                  <div
                    key={st.stepNumber}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10.5px] font-bold text-white">
                        {st.stepNumber}
                      </div>
                      <h5 className="mt-1.5 text-xs font-bold text-slate-900 leading-snug">
                        {st.title}
                      </h5>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        {st.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Online Receiving Requirements Checklist */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Mga Kailangang Ihanda para sa Online Ordering at Delivery
              </h4>
              <ul className="space-y-2">
                {data.requirementsList.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <CheckCircle2
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        req.met ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-slate-900">{req.name}</span>
                      <p className="text-[11px] text-slate-500 leading-normal">{req.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Accepted IDs & Payment Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Tinatanggap na Valid ID sa Delivery:
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {data.acceptedIds.slice(0, 4).map((idName) => (
                    <span
                      key={idName}
                      className="rounded bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-700 border border-slate-200/80"
                    >
                      {idName}
                    </span>
                  ))}
                  {data.acceptedIds.length > 4 && (
                    <span className="rounded bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500 border border-slate-200/80">
                      +{data.acceptedIds.length - 4} iba pa
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Paraan ng Pagbabayad (Payment Channels):
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {data.paymentOptions.slice(0, 4).map((opt) => (
                    <span
                      key={opt}
                      className="rounded bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-700 border border-slate-200/80"
                    >
                      {opt}
                    </span>
                  ))}
                  {data.paymentOptions.length > 4 && (
                    <span className="rounded bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500 border border-slate-200/80">
                      +{data.paymentOptions.length - 4} iba pa
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy & Authorized Person Legal Notice */}
            <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-2.5 text-[11px] leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-700">PAALALA (PD 603 &amp; RA 10173): </span>
              {data.eligibilityNotice}
            </div>
          </div>
        )}

        {/* TAB 2: Walk-In CRS Outlet (Alternative) */}
        {activeTab === 'walkin' && (
          <div className="mt-3.5 space-y-3 animate-fadeIn">
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-slate-800">
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <h4 className="font-bold text-blue-900">
                    Kailan Mas Mabuti ang Walk-In sa PSA CRS Outlet?
                  </h4>
                  <p className="mt-1 leading-relaxed text-blue-950 text-[11.5px]">
                    Kung kailangan mo ang dokumento sa araw ding iyon para sa emergency travel o visa interview,
                    mas mainam mag-book ng slot sa <strong>appointment.psa.gov.ph</strong> dahil parehong araw
                    ang releasing (karaniwang 1–2 oras matapos magbayad ng ₱155 sa cashier).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-200 p-3">
                <span className="font-bold text-slate-800">Bayarin sa CRS Outlet:</span>
                <p className="mt-1 text-sm font-bold text-slate-900">{data.walkInFeeText}</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Babayaran sa Cashier counter sa loob ng outlet.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <span className="font-bold text-slate-800">Bawal ang Walk-in nang Walang Slot:</span>
                <p className="mt-1 text-[11.5px] text-slate-600">
                  Lahat ng CRS outlets (East Ave, Ayala Malls, Robinsons) ay nagre-require ng online appointment bago papasukin.
                </p>
              </div>
            </div>

            <div className="pt-1">
              <a
                href={data.walkInPortalUrl || 'https://appointment.psa.gov.ph'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition"
              >
                <ExternalLink className="h-3 w-3 text-slate-500" />
                <span>Buksan ang appointment.psa.gov.ph para Mag-book</span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 3: Exceptions (When Online is Not Allowed) */}
        {activeTab === 'exceptions' && data.exceptionsNotice && (
          <div className="mt-3.5 space-y-2.5 animate-fadeIn">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-slate-800">
              <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>{data.exceptionsNotice.title}</span>
              </h4>
              <p className="mt-1 text-[11.5px] text-amber-950">
                Ang online delivery ay nag-iimprenta lamang kung ano ang nakalagay sa database. Huwag mag-order online kung:
              </p>
              <ul className="mt-2 space-y-1.5 pl-4 list-disc text-[11px] text-amber-900">
                {data.exceptionsNotice.points.map((pt, pIdx) => (
                  <li key={pIdx}>{pt}</li>
                ))}
              </ul>
            </div>

            {onAskInChat && (
              <button
                type="button"
                onClick={() =>
                  onAskInChat(
                    'Paano mag-file ng administrative correction sa Local Civil Registry Office (LCRO) sa ilalim ng RA 9048 o RA 10172 para maitama ang maling spelling?',
                  )
                }
                className="text-left text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline inline-flex items-center gap-1 pt-1"
              >
                <span>Magtanong sa chat: Paano mag-file ng correction sa LCRO (RA 9048)?</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Action Button Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Action Button: Open Official Portal */}
            <a
              href={data.primaryPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-98 ${
                isOnlineReady
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : isHybrid
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Mag-apply sa {data.primaryPortalName}</span>
              <ExternalLink className="h-3 w-3 opacity-80" />
            </a>

            {/* In-App Form Pre-fill Trigger */}
            {onOpenPsaForm && data.serviceCode.startsWith('PSA') && (
              <button
                type="button"
                onClick={onOpenPsaForm}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-98 transition-all"
              >
                <FileText className="h-3.5 w-3.5 text-slate-600" />
                <span>I-prefill ang Opisyal na Form</span>
              </button>
            )}

            {/* DFA Scheduler Trigger */}
            {onOpenDfaScheduler && data.serviceCode === 'DFA_PASSPORT' && (
              <button
                type="button"
                onClick={onOpenDfaScheduler}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-98 transition-all"
              >
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Buksan ang DFA Scheduler</span>
              </button>
            )}
          </div>

          {/* Quick Copy Link Utility */}
          <button
            type="button"
            onClick={handleCopyPortal}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Nakopya ang Portal Link</span>
              </>
            ) : (
              <span>Kopyahin ang link: {data.primaryPortalUrl.replace('https://', '')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
