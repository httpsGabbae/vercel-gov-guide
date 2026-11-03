'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, ExternalLink } from 'lucide-react';

export default function DfaStandalonePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to GovGuide Chat
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-slate-900">
                DFA Passport Appointment Advisory
              </span>
            </div>
          </div>
          <Link
            href="/dpwh"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            View DPWH Projects →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Official DFA Passport Appointment System
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
            Under Department of Foreign Affairs (DFA) consular security regulations, all Philippine passport application and renewal appointments are scheduled exclusively through the official DFA Online Passport Appointment System.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://passport.gov.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <span>Visit Official passport.gov.ph</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to GovGuide PH Chat</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
