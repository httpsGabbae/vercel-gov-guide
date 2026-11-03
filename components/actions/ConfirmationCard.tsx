'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  FileCheck,
  Receipt,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import type { PendingAction } from '@/lib/actions/pending';

interface ConfirmationCardProps {
  action: PendingAction;
  onSuccess?: (trackingNumber: string) => void;
  onCancel?: () => void;
}

export function ConfirmationCard({ action, onSuccess, onCancel }: ConfirmationCardProps) {
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedTracking, setConfirmedTracking] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Remaining TTL countdown
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const diff = Math.max(0, Math.floor((new Date(action.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [action.expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft <= 0;

  const handleConfirm = async () => {
    if (!declarationChecked) {
      setErrorMessage('Pakitsek ang sinumpaang pahayag bago magpatuloy.');
      return;
    }
    if (isExpired) {
      setErrorMessage('Nag-expire na ang 15-minutong palugit. Pakisubukan muling gumawa ng draft.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/actions/${action.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          declarationConfirmed: true,
          agentModeConsent: action.executionMode === 'agent',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Nabigo ang pagkumpirma ng aplikasyon.');
      }

      setConfirmedTracking(data.trackingNumber);
      if (onSuccess) onSuccess(data.trackingNumber);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error confirming action';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await fetch(`/api/actions/${action.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Citizen cancelled from confirmation card' }),
      });
      if (onCancel) onCancel();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyTracking = () => {
    if (confirmedTracking) {
      navigator.clipboard.writeText(confirmedTracking);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // SUCCESS STATE: Official Tracking Number Card
  if (confirmedTracking) {
    return (
      <div className="my-4 rounded-3xl border-2 border-emerald-500 bg-white p-6 shadow-md space-y-4 animate-in zoom-in-95">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600">
              Opisyal na Naisumite (Submission Confirmed)
            </span>
            <h3 className="text-lg font-black text-slate-900">Handa Na Ang Iyong Aplikasyon</h3>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Opisyal na Tracking Number:
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-xl font-extrabold text-blue-700 tracking-wider">
              {confirmedTracking}
            </span>
            <button
              type="button"
              onClick={handleCopyTracking}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
              title="Kopyahin ang Tracking Number"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            I-save o i-screenshot ito. Ipapakita mo ito sa evaluation counter ng ahensya.
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>Hakbang sa Counter:</span>
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Dalhin ang 2 valid primary IDs at eksaktong processing fee sa inyong napiling branch.
          </p>
        </div>
      </div>
    );
  }

  // PENDING CONFIRMATION GATE
  return (
    <div className="my-4 rounded-3xl border border-blue-200 bg-white p-5 shadow-sm space-y-4 sm:p-6 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
            <FileCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Confirmation-Gated Action ({action.executionMode.toUpperCase()} MODE)
            </span>
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">
              Huling Pagsusuri Bago Isumite
            </h3>
          </div>
        </div>

        {/* TTL Expiry Countdown */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-bold ${
            isExpired
              ? 'bg-rose-100 text-rose-700'
              : timeLeft < 180
                ? 'bg-amber-100 text-amber-800 animate-pulse'
                : 'bg-slate-100 text-slate-700'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>
            {isExpired
              ? 'EXPIRED'
              : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
          </span>
        </div>
      </div>

      {/* Payload Summary Details */}
      <div className="space-y-2 rounded-2xl bg-slate-50 border border-slate-100 p-3.5 text-xs">
        <div className="grid grid-cols-2 gap-2 text-slate-600">
          <div>
            <span className="text-[10px] text-slate-400 block">Serbisyo:</span>
            <span className="font-bold text-slate-900">{action.serviceCode.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Aplikante:</span>
            <span className="font-bold text-slate-900">
              {String(action.payload.firstName || action.payload.documentOwnerFirstName || 'N/A')}{' '}
              {String(action.payload.lastName || action.payload.documentOwnerLastName || '')}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Birth Date:</span>
            <span className="font-medium text-slate-800">
              {String(action.payload.dateOfBirth || 'N/A')}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Uri:</span>
            <span className="font-medium text-slate-800">
              {String(action.payload.applicationType || action.payload.requesterType || 'REGULAR')}
            </span>
          </div>
        </div>

        {/* Cryptographic Hash Verification Badge */}
        <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1">
            <KeyRound className="h-3 w-3 text-blue-600" />
            <span>SHA-256 Hash:</span>
          </div>
          <span className="truncate max-w-[200px]" title={action.payloadHash}>
            {action.payloadHash.slice(0, 16)}...
          </span>
        </div>
      </div>

      {/* Legal Perjury & Citizen Declaration */}
      <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 transition-all">
        <input
          type="checkbox"
          checked={declarationChecked}
          onChange={(e) => setDeclarationChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
        />
        <span className="text-[11px] leading-relaxed">
          <strong>Sinumpaang Pahayag (Oath):</strong> Pinatutunayan ko na totoo, wasto, at kumpleto
          ang lahat ng impormasyong nakatala. Nauunawaan ko na ang sinasadyang maling pahayag ay may
          karampatang parusa sa ilalim ng batas (Republic Act No. 10173 at Revised Penal Code).
        </span>
      </label>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Kanselahin (Cancel)
        </button>

        <button
          type="button"
          disabled={!declarationChecked || isExpired || isSubmitting}
          onClick={handleConfirm}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{isSubmitting ? 'Isinusumite...' : 'Kumpirmahin at Isumite'}</span>
        </button>
      </div>
    </div>
  );
}
