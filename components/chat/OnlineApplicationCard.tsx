'use client';

import React from 'react';
import {
  Truck,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  AlertTriangle,
  Globe,
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
  className = '',
}: OnlineApplicationCardProps) {
  const isPsaService = !data.serviceCode || data.serviceCode.startsWith('PSA');
  const portalUrl = isPsaService ? 'https://www.psaserbilis.com.ph/' : data.primaryPortalUrl;
  const portalName = isPsaService ? 'PSA Serbilis' : data.primaryPortalName;

  // 3-sentence summary combining doorstep delivery, walk-in CRS outlet, and when online is not allowed
  const summaryThreeSentences = isPsaService
    ? 'Maaari kang mag-order online para sa nationwide doorstep delivery sa loob ng 1–3 araw sa Metro Manila o 3–8 araw sa mga probinsya nang hindi na kailangang pumila sa counter. Kung kailangan ang dokumento sa mismong araw para sa emergency travel o agarang transaksyon, mag-book ng personal appointment sa pinakamalapit na PSA CRS Outlet sa halagang ₱155. Hindi maaaring mag-apply online kung may maling spelling o kailangang itamang rekord sa ilalim ng RA 9048 o RA 10172, na nangangailangan ng personal na pagproseso sa Local Civil Registry Office (LCRO).'
    : `${data.queueComparison?.online || 'Maaaring mag-apply online para sa doorstep delivery o mabilisang processing.'} Kung kailangan ng agarang transaksyon, mag-book ng personal appointment sa opisyal na branch o outlet. Kung may clerical errors o kulang na statutory requirements, kailangan ng personal appearance sa designated government office.`;

  return (
    <div
      role="region"
      aria-label={`Online Application Guidance: ${data.serviceTitle}`}
      className={`relative w-full overflow-hidden rounded-2xl border border-emerald-200/90 bg-white p-4 sm:p-5 shadow-xs ${className}`}
    >
      {/* Title & Agency */}
      <div>
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
          {data.agencyName}
        </span>
        <h3 className="mt-0.5 text-base sm:text-lg font-bold tracking-tight text-slate-900">
          {data.serviceTitle}
        </h3>
      </div>

      {/* Blocker Alert (When cannot apply online e.g. RA 9048 name correction) */}
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

      {/* 3 Metric Cards: Bayarin, Delivery SLA, Oras sa Pila */}
      {data.canApplyOnline && (
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Card 1: Bayarin */}
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

          {/* Card 2: Delivery SLA */}
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

          {/* Card 3: Oras sa Pila */}
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

      {/* Combined 3-Sentence Summary (Doorstep Delivery, Walk-in CRS Outlet, Kailan Bawal Online) */}
      <div className="mt-3.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs sm:text-[12.5px] leading-relaxed text-slate-700">
        <p>{summaryThreeSentences}</p>
      </div>

      {/* Action Button Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
        {/* Primary Green Action Button: PSA Serbilis */}
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-98 transition-all"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Mag-apply sa {portalName}</span>
          <ExternalLink className="h-3 w-3 opacity-80" />
        </a>

        {/* Optional Form Pre-fill Trigger */}
        {onOpenPsaForm && isPsaService && (
          <button
            type="button"
            onClick={onOpenPsaForm}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-98 transition-all"
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" />
            <span>I-prefill ang Opisyal na Form</span>
          </button>
        )}
      </div>
    </div>
  );
}
