'use client';

import React, { useEffect } from 'react';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
}

export function TermsModal({ open, onClose }: TermsModalProps) {
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
      aria-labelledby="terms-modal-title"
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
              <img
                src="/logo-mark.png"
                alt="GovGuide PH"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </div>
            <div>
              <h2 id="terms-modal-title" className="text-base font-bold text-slate-900">
                Terms and Conditions
              </h2>
              <p className="text-xs text-slate-500">GovGuide PH Citizen&apos;s Charter AI Guidance</p>
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

        {/* Content - Simple & Clean */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 text-xs text-slate-600 space-y-3.5 leading-relaxed scrollbar-thin scrollbar-thumb-slate-200">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/60 text-slate-700">
            Welcome to GovGuide PH. Please review these terms governing your use of our citizen guidance services.
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">1. Purpose of Service</h3>
            <p>
              GovGuide PH assists citizens in preparing requirements and understanding processes based on official Philippine Citizen&apos;s Charters to avoid repeat counter visits (&ldquo;anti-balik-pila&rdquo;).
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">2. Advisory AI Pre-Inspection</h3>
            <p>
              Guidance and document checklist reviews are generated with Google Gemini AI models grounded in official agency charters. These evaluations are advisory pre-inspection guides and do not replace final judgment by government receiving officers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">3. Confirmation-Gated Actions</h3>
            <p>
              No official application submission, consular appointment reservation, or transaction proposal is finalized without your explicit review and confirmation.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">4. Truthfulness and Authenticity</h3>
            <p>
              You certify that all personal records, details, and documents provided are authentic and belong to you or an authorized principal.
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

