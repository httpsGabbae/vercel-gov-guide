'use client';

import React, { useEffect } from 'react';

interface ConsentModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConsentModal({ open, onClose }: ConsentModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-none"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-lg flex-col max-h-[85vh] rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200/60 shadow-2xs">
              <span className="text-base">🛡️</span>
            </div>
            <div>
              <h2 id="consent-modal-title" className="text-base font-bold text-slate-900">
                Consent Form
              </h2>
              <p className="text-xs text-slate-500">Data Privacy Act of 2012 Compliance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Simple & Clean without green backgrounds or badges */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 text-xs text-slate-600 space-y-3.5 leading-relaxed scrollbar-thin scrollbar-thumb-slate-200">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/60 text-slate-700 font-normal">
            Your privacy is protected under Republic Act No. 10173 (Philippine Data Privacy Act of 2012). This consent form explains how your personal data is collected and safeguarded.
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">1. Processing Purpose</h3>
            <p>
              Your contact details, demographic data, and document requirements are processed exclusively to provide civic guidance, generate checklists, and assist with government agency workflows.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">2. Ephemeral Inspection &amp; Zero Biometric Retention</h3>
            <p>
              Inspection of IDs and documents is handled ephemerally in-memory. GovGuide PH does not retain permanent biometric images, photographs, or raw sensitive security markings unless you explicitly save them to your personal vault.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">3. Isolation &amp; Row-Level Security</h3>
            <p>
              Personal data is encrypted in transit and isolated by PostgreSQL Row-Level Security (RLS) policies, accessible only by you and authorized government officers during transaction processing.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">4. Citizen Data Rights</h3>
            <p>
              Under RA 10173, you retain the right to be informed, right to access, right to rectification, and right to request deletion of your stored records at any time.
            </p>
          </div>
        </div>

        {/* Footer - Simple Close button (No Checkbox) */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
