'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, HardHat } from 'lucide-react';
import { DpwhProjectsView } from '@/components/dpwh/DpwhProjectsView';

export default function DpwhStandalonePage() {
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
              <HardHat className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-slate-900">
                DPWH Nationwide Infrastructure Tracker
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="py-4">
        <DpwhProjectsView />
      </main>
    </div>
  );
}
