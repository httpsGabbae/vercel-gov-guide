'use client';

import React, { useState } from 'react';
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type ReceiptServiceType =
  | 'NBI'
  | 'PSA'
  | 'PSA_HELPLINE'
  | 'PHILHEALTH'
  | 'DFA'
  | 'DPWH'
  | string;

interface ExpenseReceiptCardProps {
  initialService?: ReceiptServiceType;
  isFirstTimeJobseeker?: boolean;
  applicantName?: string;
  onAskInChat?: (prompt: string) => void;
  className?: string;
}

export function ExpenseReceiptCard({
  initialService = 'NBI',
  isFirstTimeJobseeker = true,
  applicantName = 'Citizen Applicant',
  onAskInChat,
  className = '',
}: ExpenseReceiptCardProps) {
  const [showBreakdownDetails, setShowBreakdownDetails] = useState(true);

  // Normalize service key
  const serviceKey = (initialService || 'NBI').toUpperCase();
  const isNbi = serviceKey.includes('NBI');
  const isPsa = serviceKey.includes('PSA') || serviceKey.includes('BIRTH') || serviceKey.includes('MARRIAGE');
  const isPhilhealth = serviceKey.includes('PHILHEALTH') || serviceKey.includes('PMRF');
  const isDfa = serviceKey.includes('DFA') || serviceKey.includes('PASSPORT');
  const isDpwh = serviceKey.includes('DPWH') || serviceKey.includes('PROJECT');

  const agencyLabel = isNbi
    ? 'National Bureau of Investigation'
    : isPsa
      ? 'Philippine Statistics Authority'
      : isPhilhealth
        ? 'Philippine Health Insurance Corporation'
        : isDfa
          ? 'Department of Foreign Affairs'
          : isDpwh
            ? 'Department of Public Works and Highways'
            : 'Official Citizen’s Charter';

  const refCode = isNbi
    ? 'NBI'
    : isPsa
      ? 'PSA'
      : isPhilhealth
        ? 'PHILHEALTH'
        : isDfa
          ? 'DFA'
          : isDpwh
            ? 'DPWH'
            : 'GOV';

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.08)] overflow-hidden transition-all ${className}`}
    >
      {/* Top Receipt Decorative Notches (Perforated Edge Effect) */}
      <div className="relative h-2 w-full bg-slate-100 flex items-center justify-around overflow-hidden border-b border-slate-200/80">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="h-2 w-2 rounded-full bg-white -mt-2" />
        ))}
      </div>

      <div className="p-4 sm:p-4.5 flex-1 flex flex-col">
        {/* Receipt Header */}
        <div className="text-center pb-3 border-b border-dashed border-slate-300">
          <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-slate-500">
            <Receipt className="h-3.5 w-3.5 text-slate-600" />
            <span>Republika ng Pilipinas · {agencyLabel}</span>
          </div>
          <h3 className="mt-0.5 text-[15px] font-bold text-slate-900 tracking-tight">
            Tantyang Gastusin at Bayarin
          </h3>
          <p className="text-[11.5px] text-slate-500">
            Batay sa Official Citizen&apos;s Charter (RA 11032)
          </p>

          <div className="mt-2 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10.5px] text-slate-600">
            <span>REF: GG-OR-{refCode}-2026</span>
          </div>
        </div>

        {/* Applicant Context Tag */}
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11.5px] text-slate-600">
          <span className="truncate">
            Para kay: <strong className="text-slate-800">{applicantName.split(' ')[0]}</strong>
          </span>
          {isFirstTimeJobseeker && isNbi && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
              RA 11261 Libre
            </span>
          )}
        </div>

        {/* Itemized Receipt Rows for the Single Agency */}
        <div className="mt-3 flex-1 space-y-2">
          {isNbi && (
            <>
              <div className="flex justify-between text-[13px] text-slate-700">
                <span>NBI Clearance Base Fee</span>
                <span className="font-mono">₱130.00</span>
              </div>

              {isFirstTimeJobseeker && (
                <div className="flex justify-between text-[13px] text-emerald-700 bg-emerald-50/70 p-1 rounded font-medium">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    First-Time Jobseeker Waiver (RA 11261)
                  </span>
                  <span className="font-mono font-bold">-₱130.00</span>
                </div>
              )}

              <div className="flex justify-between text-[13px] text-slate-700">
                <span className="flex items-center gap-1">
                  E-Payment Convenience Fee
                  <span className="text-[10px] text-slate-500">(GCash/Maya/LandBank)</span>
                </span>
                <span className="font-mono">
                  {isFirstTimeJobseeker ? '₱0.00 (Waived)' : '₱25.00'}
                </span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span>Biometrics &amp; Photo Capture</span>
                <span className="font-mono font-semibold text-emerald-700">LIBRE (Kasama)</span>
              </div>
            </>
          )}

          {isPsa && (
            <>
              <div className="flex justify-between text-[13px] text-slate-700">
                <span>PSA Birth Certificate (SECPA Copy)</span>
                <span className="font-mono">₱155.00</span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span className="flex items-center gap-1">
                  Doorstep Courier Delivery (PSAHelpline)
                </span>
                <span className="font-mono">₱160.00</span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span className="flex items-center gap-1">
                  Ordering &amp; Payment Processing Fee
                </span>
                <span className="font-mono">₱50.00</span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 bg-slate-50 p-1 rounded">
                <span>* Kung walk-in sa PSA CRS Outlet: ₱155.00 lamang ang babayaran.</span>
              </div>
            </>
          )}

          {isPhilhealth && (
            <>
              <div className="flex justify-between text-[13px] text-slate-700">
                <span>PMRF Member Registration</span>
                <span className="font-mono font-bold text-emerald-700">₱0.00 (LIBRE)</span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span>Member Data Record (MDR) Copy</span>
                <span className="font-mono font-bold text-emerald-700">₱0.00 (LIBRE)</span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span>Standard PhilHealth ID Card</span>
                <span className="font-mono font-bold text-emerald-700">₱0.00 (LIBRE)</span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span>Universal Health Care Subsidized</span>
                <span className="font-mono font-bold text-emerald-700">RA 11223</span>
              </div>
            </>
          )}

          {isDfa && (
            <>
              <div className="flex justify-between text-[13px] text-slate-700">
                <span>ePassport Regular Processing (12 working days)</span>
                <span className="font-mono">₱950.00</span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span className="flex items-center gap-1">
                  Authorized Payment Convenience Fee
                </span>
                <span className="font-mono">₱50.00</span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span>Biometrics, Photo &amp; Fingerprint Capture</span>
                <span className="font-mono font-semibold text-emerald-700">LIBRE (Kasama)</span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 bg-slate-50 p-1 rounded">
                <span>* Expedited Processing (6 working days): ₱1,200 + ₱50 fee = ₱1,250 total.</span>
              </div>
            </>
          )}

          {isDpwh && (
            <>
              <div className="flex justify-between text-[13px] text-slate-700">
                <span>Public Infrastructure Monitoring &amp; Inquiry</span>
                <span className="font-mono font-bold text-emerald-700">₱0.00 (LIBRE)</span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span>Citizen Watch / Road Hazard Report (Hotline 165-02)</span>
                <span className="font-mono font-bold text-emerald-700">₱0.00 (LIBRE)</span>
              </div>

              <div className="flex justify-between text-[13px] text-slate-700">
                <span>Project Status &amp; Contractor Transparency</span>
                <span className="font-mono font-bold text-emerald-700">₱0.00 (LIBRE)</span>
              </div>
            </>
          )}

          {!isNbi && !isPsa && !isPhilhealth && !isDfa && !isDpwh && (
            <div className="flex justify-between text-[13px] text-slate-700">
              <span>Standard Agency Processing Fee</span>
              <span className="font-mono">Sang-ayon sa Charter</span>
            </div>
          )}
        </div>

        {/* Perforated Divider */}
        <div className="my-3 border-t-2 border-dashed border-slate-300" />

        {/* Total Estimated Expense */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
              Kabuuang Gastusin
            </span>
            <p className="text-[10px] text-slate-400">Total Estimated Expense</p>
          </div>
          <div className="text-right">
            {isNbi && (
              <span className="font-mono text-xl font-bold text-slate-900">
                {isFirstTimeJobseeker ? (
                  <span className="text-emerald-700">₱0.00 (LIBRE)</span>
                ) : (
                  '₱155.00'
                )}
              </span>
            )}
            {isPsa && (
              <span className="font-mono text-xl font-bold text-blue-700">
                ₱365.00
              </span>
            )}
            {isPhilhealth && (
              <span className="font-mono text-xl font-bold text-emerald-700">
                ₱0.00 (100% LIBRE)
              </span>
            )}
            {isDfa && (
              <span className="font-mono text-xl font-bold text-blue-700">
                ₱1,000.00
              </span>
            )}
            {isDpwh && (
              <span className="font-mono text-xl font-bold text-emerald-700">
                ₱0.00 (100% LIBRE)
              </span>
            )}
            {!isNbi && !isPsa && !isPhilhealth && !isDfa && !isDpwh && (
              <span className="font-mono text-lg font-bold text-slate-800">
                Opisyal na Rate
              </span>
            )}
          </div>
        </div>

        {/* Expandable Helpful Tips & Payment Details */}
        <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200/70">
          <button
            type="button"
            onClick={() => setShowBreakdownDetails(!showBreakdownDetails)}
            className="flex w-full items-center justify-between font-semibold text-slate-800"
          >
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-slate-600" />
              Saan at Paano Magbabayad?
            </span>
            {showBreakdownDetails ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {showBreakdownDetails && (
            <div className="mt-2 space-y-1.5 text-[11.5px] text-slate-600 border-t border-slate-200/60 pt-2">
              <div className="flex items-start gap-1.5">
                <span className="font-medium text-slate-800">Mga Channel:</span>
                <span>GCash, Maya, 7-Eleven (Cliqq), LandBank, Bayad Center, Over-the-counter.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Clock className="h-3 w-3 shrink-0 text-slate-400 mt-0.5" />
                <span>
                  {isNbi
                    ? 'Release: 10–15 minuto kapag No HIT; 5–10 araw kapag may kapangalan (HIT).'
                    : isPsa
                      ? 'Doorstep Delivery: 3–4 araw (Metro Manila); 6–8 araw (Probinsya).'
                      : isDfa
                        ? 'Release: 12 working days (Regular); 6 working days (Expedited).'
                        : isDpwh
                          ? 'Real-time transparency via DPWH Portal at Hotline 165-02.'
                          : 'Release: Parehong araw sa opisyal na sangay.'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Anti-Red Tape Anti-Fixer Advisory */}
        <div className="mt-2.5 rounded-lg border border-amber-200/80 bg-amber-50/60 p-2 text-[11px] text-amber-900 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
          <p className="leading-snug">
            <strong>Bawal ang Fixer:</strong> Walang karagdagang express fee. Magbayad lamang sa mga opisyal na payment channels o sa ahensya.
          </p>
        </div>

        {/* Ask in Chat Quick Trigger */}
        {onAskInChat && (
          <button
            type="button"
            onClick={() => {
              if (isNbi) {
                onAskInChat(
                  'Magkano ang kabuuang babayaran ko sa NBI Clearance bilang First-Time Jobseeker at paano ma-avail ang libreng bayad?'
                );
              } else if (isPsa) {
                onAskInChat(
                  'Paano mag-order ng PSA Birth Certificate sa PSAHelpline.ph, ano ang kabuuang ₱365 na bayad at kailan ito maide-deliver?'
                );
              } else if (isDfa) {
                onAskInChat(
                  'Magkano ang opisyal na bayarin para sa DFA Passport application at ano ang kaibahan ng Regular sa Expedited?'
                );
              } else if (isDpwh) {
                onAskInChat(
                  'Paano mag-report ng sira sa kalsada o magtanong ukol sa DPWH project nang libre sa Hotline 165-02?'
                );
              } else {
                onAskInChat(
                  'Libre ba talaga ang pagpaparehistro sa PhilHealth at paano makakuha ng libreng MDR at ID?'
                );
              }
            }}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Sparkles className="h-3 w-3 text-emerald-600" />
            <span>Itanong sa chat ang detalye ng bayarin</span>
          </button>
        )}

        {/* Authentic Barcode Aesthetic at bottom */}
        <div className="mt-4 pt-2 border-t border-dashed border-slate-200 text-center">
          <div className="inline-block font-mono text-[10px] tracking-[4px] text-slate-400 select-none">
            |||| || | ||||| ||| || |||| || |
          </div>
          <p className="text-[10px] text-slate-400">
            Certified Citizen&apos;s Charter Standard · RA 11032
          </p>
        </div>
      </div>

      {/* Bottom Receipt Decorative Notches (Perforated Edge Effect) */}
      <div className="relative h-2 w-full bg-slate-100 flex items-center justify-around overflow-hidden border-t border-slate-200/80">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="h-2 w-2 rounded-full bg-white -mb-2" />
        ))}
      </div>
    </div>
  );
}
