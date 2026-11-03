'use client';

import React from 'react';
import { BookOpen, ShieldCheck, ExternalLink } from 'lucide-react';

interface CharterReferenceSectionProps {
  onOpenSource?: (sourceId: string) => void;
  className?: string;
}

export function CharterReferenceSection({
  onOpenSource,
  className = '',
}: CharterReferenceSectionProps) {
  const sources = [
    {
      id: 'src-nbi-2025',
      agency: 'NBI',
      title: "NBI Citizen's Charter 2025",
      portalUrl: 'https://clearance.nbi.gov.ph',
      acts: [
        {
          name: 'Republic Act 11261 (First-Time Jobseekers Waiver)',
          url: 'https://www.officialgazette.gov.ph/2019/04/10/republic-act-no-11261/',
        },
        {
          name: 'RA 10867 (NBI Reorganization & Modernization Act)',
          url: 'https://www.officialgazette.gov.ph/2016/06/23/republic-act-no-10867/',
        },
      ],
      subtitle: 'Clearance Issuance, Biometrics & Renewal',
    },
    {
      id: 'src-psa-2025',
      agency: 'PSA',
      title: "PSA Citizen's Charter & PSAHelpline.ph",
      portalUrl: 'https://psahelpline.ph',
      acts: [
        {
          name: 'RA 10625 (Philippine Statistical Act)',
          url: 'https://www.officialgazette.gov.ph/2013/09/12/republic-act-no-10625/',
        },
        {
          name: 'Commonwealth Act 591 (Civil Registry)',
          url: 'https://psa.gov.ph/civilregistration',
        },
      ],
      subtitle: 'Birth, Marriage, Death Certs & Doorstep Delivery',
    },
    {
      id: 'src-philhealth-2025',
      agency: 'PhilHealth',
      title: "PhilHealth Citizen's Charter 2025",
      portalUrl: 'https://www.philhealth.gov.ph',
      acts: [
        {
          name: 'Republic Act 11223 (Universal Health Care Act)',
          url: 'https://www.officialgazette.gov.ph/2019/02/20/republic-act-no-11223/',
        },
      ],
      subtitle: 'PMRF Member Registration & UHC Coverage',
    },
  ];

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-slate-100/50 p-2.5 sm:p-3 text-xs text-slate-700 shadow-2xs mt-3 ${className}`}
    >
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200/70 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
            <BookOpen className="h-3 w-3" />
          </span>
          <div>
            <h4 className="font-semibold text-slate-900 text-[12px] tracking-tight">
              Opisyal na Sanggunian at Batayang Legal (Official References)
            </h4>
            <p className="text-[10px] text-slate-500">
              Grounded sa Anti-Red Tape Act (RA 11032) at Citizen&apos;s Charters
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200/80">
          <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
          <span>Verified Government Data</span>
        </div>
      </div>

      {/* 3 Modules with Combined Act Below Title as Clickable Links */}
      <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
        {sources.map((src) => (
          <div
            key={src.id}
            className="flex flex-col justify-between rounded-lg border border-slate-200/80 bg-white p-2 sm:p-2.5 transition-all hover:border-emerald-300 hover:shadow-2xs"
          >
            <div>
              {/* Agency badge & Official Portal link */}
              <div className="flex items-center justify-between text-[10.5px] font-bold text-emerald-800">
                <span>{src.agency}</span>
                <a
                  href={src.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 hover:underline hover:text-emerald-900"
                  title={`Pumunta sa ${src.portalUrl}`}
                >
                  <span>Portal</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              {/* Title (clickable to open charter preview or official portal) */}
              <h5 className="mt-0.5 font-semibold text-slate-900 text-[11.5px] leading-snug">
                <button
                  type="button"
                  onClick={() => onOpenSource?.(src.id)}
                  className="text-left hover:text-emerald-800 hover:underline cursor-pointer transition-colors"
                >
                  {src.title}
                </button>
              </h5>

              {/* Combined Act below the Title as Clickable Links */}
              <div className="mt-1 space-y-0.5">
                {src.acts.map((act, actIdx) => (
                  <a
                    key={actIdx}
                    href={act.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link flex items-center gap-1 text-[10px] font-medium text-emerald-700 hover:text-emerald-950 hover:underline transition-colors"
                    title={`Basahin ang ${act.name}`}
                  >
                    <span className="truncate">{act.name}</span>
                    <ExternalLink className="h-2 w-2 shrink-0 opacity-60 group-hover/link:opacity-100" />
                  </a>
                ))}
              </div>

              {/* Subtitle */}
              <p className="mt-1 text-[10px] text-slate-500 leading-tight">
                {src.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-slate-400">
        <span>Grounded sa opisyal na kautusan ng ARTA at ahensya alinsunod sa batas.</span>
      </div>
    </div>
  );
}
