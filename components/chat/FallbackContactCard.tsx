'use client';

import React from 'react';
import { Phone, Mail, Building2, HelpCircle } from 'lucide-react';

interface FallbackContactCardProps {
  agency: string;
  hotline: string;
  email: string;
}

export function FallbackContactCard({ agency, hotline, email }: FallbackContactCardProps) {
  return (
    <div className="my-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-xs text-rose-950 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <HelpCircle className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-rose-900">
            Hindi Nahanap sa Citizen&apos;s Charter (Escalation Support)
          </h4>
          <p className="text-[11px] leading-relaxed text-rose-800">
            Dahil walang opisyal na patakaran sa kasalukuyang charter ukol sa paksang ito, iwasang
            mag-assume upang hindi masayang ang iyong pamasahe. Makipag-ugnayan nang direkta sa
            ahensya:
          </p>

          <div className="mt-3 space-y-1.5 pt-1">
            <div className="flex items-center gap-2 font-medium">
              <Building2 className="h-3.5 w-3.5 text-rose-600" />
              <span>{agency}</span>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-rose-600" />
              <a
                href={`tel:${hotline.split('/')[0].replace(/[^\d+]/g, '')}`}
                className="font-bold text-rose-900 underline hover:text-rose-700"
              >
                {hotline}
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-rose-600" />
              <a
                href={`mailto:${email}`}
                className="font-bold text-rose-900 underline hover:text-rose-700"
              >
                {email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
