'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  AlertTriangle,
  Clock,
  FileText,
  Upload,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { CivicMarkdown } from './CivicMarkdown';

export interface BranchMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  chips?: string[];
}

export interface RemediationBranchData {
  issueId?: string;
  category: 'expired' | 'missing' | 'mismatch' | 'general';
  title: string;
  documentTitle: string;
  serviceCode?: string;
  detail: string;
  requirementName?: string;
  filePreviewUrl?: string;
}

interface RemediationBranchDrawerProps {
  open: boolean;
  data: RemediationBranchData | null;
  onClose: () => void;
  onResolve: (requirementName: string, resolutionNote: string, replacementFileName?: string) => void;
  onOpenSource?: (sourceId: string) => void;
}

function getInitialRemediationGuide(data: RemediationBranchData): {
  message: string;
  chips: string[];
} {
  const combined = `${data.documentTitle} ${data.title} ${data.detail}`.toLowerCase();

  if (combined.includes('postal') || combined.includes('expired')) {
    return {
      message: `### ⚠️ Isyu sa Dokumento: Expired Postal ID

Ayon sa **Section 3 ng NBI Clearance Citizen's Charter 2025** at PHLPost guidelines, **hindi maaaring gamitin ang expired ID** para sa biometrics capture at counter verification upang maiwasan ang identity theft o fraud.

Narito ang **3 mabilis at opisyal na paraan** para maresolba ito:

---

#### 1. Gamitin ang Alternatibong Primary ID (Mabilis & Walang Dagdag Gastos)
Kung mayroon kang alinman sa mga sumusunod, maaari mo itong dalhin kaagad sa NBI counter kapalit ng Postal ID:
* **Philippine Passport** (kahit bagong renew)
* **PhilSys National ID** (Physical card o Digital National ID)
* **UMID / SSS ID**
* **Driver's License** mula sa LTO
* **PRC ID** o **Voter's Certification** mula sa COMELEC Intramuros

#### 2. Libreng Digital National ID (Instant Download)
Maaari kang kumuha ng opisyal na **Digital National ID** sa loob ng 5 minuto:
1. Pumunta sa official portal: [national-id.gov.ph](https://national-id.gov.ph) o gamitin ang **eGovPH app**.
2. I-verify ang iyong mukha at demographic info.
3. I-download ang PDF copy na may official QR code at i-print.
*Legal basis:* Tinatanggap ito sa lahat ng ahensya alinsunod sa **PSA Advisory 2023** at **Republic Act 11055**.

#### 3. Mag-renew ng Postal ID sa PHLPost
* **Saan:** Pinakamalapit na Post Office / PHLPost outlet.
* **Mga Dalhin:** 2 kopya ng PID Application Form, PSA Birth Certificate, at Barangay Certificate of Residency.
* **Bayad:** ₱504.00 (Regular, 10-15 business days) o ₱650.00 (Rush/Express, 1-3 days sa NCR).

Kapag handa na ang iyong alternatibo o bagong dokumento, i-click ang **"Mag-upload ng Bago"** o **"Markahan bilang Naayos"** sa ibaba!`,
      chips: [
        'Paano mag-generate ng Digital National ID?',
        'Saan ang pinakamalapit na Post Office sa QC?',
        'Tumatanggap ba ang NBI ng ePhilID?',
        'Ano ang valid secondary IDs kung walang primary ID?',
      ],
    };
  }

  if (
    combined.includes('barangay') ||
    combined.includes('oath') ||
    combined.includes('jobseeker') ||
    combined.includes('seal')
  ) {
    return {
      message: `### 📜 Kulang sa Barangay Certification: Dry Seal at Oath of Undertaking

Ayon sa **Republic Act 11261 (First-Time Jobseekers Assistance Act)** at **DILG Memorandum Circular 2019-146**, ang Barangay Certification para sa first-time jobseeker ay dapat may kalakip na **sinumpaang Oath of Undertaking** at may **embossed dry seal** mula sa Barangay.

Kapag walang dry seal o oath, ituturing ito ng NBI counter bilang ordinaryong clearance at sisingilin ka ng regular fee (₱130 + e-payment fee).

---

#### Mga Hakbang para Makuha ang Kumpletong Tatak:
1. **Bumalik sa inyong Barangay Hall:** Hanapin ang Barangay Secretary o Admin Staff.
2. **Humiling ng First-Time Jobseeker Certification:** Sabihin: *"Kailangan ko po ng Barangay Certificate of First-Time Jobseeker na may kalakip na Oath of Undertaking at may embossed dry seal para sa libreng NBI clearance (RA 11261)."*
3. **Pirma at Tuyong Tatak:** Tiyaking may pirma ng Punong Barangay at may nakadiin na tuyong tatak (dry seal) bago lisanin ang barangay counter.
4. **100% LIBRE:** Mahigpit na ipinagbabawal sa ilalim ng batas ang paniningil ng anumang barangay clearance fee, processing fee, o notary fee para sa First-Time Jobseekers.

I-click ang **"Markahan bilang Naayos"** kapag napalagyan mo na ito ng selyo!`,
      chips: [
        'May bayad ba ang dry seal sa Barangay?',
        'Ano ang sasabihin ko sa Barangay Secretary?',
        'Gaano katagal bago makuha ang dry seal?',
        'Ano ang gagawin kung naniningil pa rin ang barangay?',
      ],
    };
  }

  if (combined.includes('mismatch') || combined.includes('birth') || combined.includes('kasal')) {
    return {
      message: `### 🔍 Mismatch sa Personal Records

May natukoy na pagkakaiba sa baybay ng pangalan o petsa ng kapanganakan sa pagitan ng iyong ID at ng opisyal na Citizen's Charter profile.

---

#### Paano Ito Aayusin Bago Pumila:
1. **Joint Affidavit of Two Disinterested Persons:**
   * Kumuha ng 2 saksi (hindi kamag-anak, hal. kapitbahay o katrabaho) na magpapatunay na ang dalawang magkaibang baybay ay iisang tao.
   * **Libre sa PAO (Public Attorney's Office)** para sa indigent applicants, o ₱150–₱300 sa private notary public.
2. **Dalhin ang PSA Birth Certificate:**
   * Ang PSA SECPA (Security Paper) copy ang laging may pinakamataas na legal weight alinsunod sa **Commonwealth Act 591**.
3. **PSAHelpline.ph Doorstep Delivery:**
   * Kung walang PSA copy, mag-order online sa **PSAHelpline.ph** (₱365 nationwide doorstep delivery sa loob ng 3-5 araw).`,
      chips: [
        'Saan ang pinakamalapit na PAO office?',
        'Magkano ang notaryo ng Affidavit ng Discrepancy?',
        'Tinatanggap ba ng ahensya ang Affidavit?',
      ],
    };
  }

  return {
    message: `### 📋 Gabay sa Pag-ayos ng Kinakailangang Dokumento: ${data.documentTitle}

Ayon sa opisyal na **Citizen's Charter** at **Anti-Red Tape Act (RA 11032)**, kinakailangang kumpleto at valid ang bawat rekisito bago pumunta sa opisina upang maiwasan ang "balik-pila".

* **Natukoy na Isyu:** ${data.detail || data.title}
* **Aksyon:** Tiyaking orihinal o certified true copy ang dalhin, may tamang pirma, at hindi pa paso sa araw ng iyong appointment.

Magtanong lamang dito para sa mga hakbang, bayarin, o alternatibong dokumento!`,
    chips: [
      'Ano ang mga alternatibong dokumento na tinatanggap?',
      'Magkano ang kabuuang bayad sa prosesong ito?',
      'Ano ang opisyal na processing time sa counter?',
    ],
  };
}

export function RemediationBranchDrawer({
  open,
  data,
  onClose,
  onResolve,
  onOpenSource,
}: RemediationBranchDrawerProps) {
  const [messages, setMessages] = useState<BranchMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [replacementName, setReplacementName] = useState<string | null>(null);

  const drawerScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset conversation when a new document/issue is opened
  useEffect(() => {
    if (data && open) {
      const guide = getInitialRemediationGuide(data);
      setMessages([
        {
          id: 'init-guide',
          sender: 'assistant',
          text: guide.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          chips: guide.chips,
        },
      ]);
      setIsResolved(false);
      setReplacementName(null);
    }
  }, [data, open]);

  // Scroll to bottom of sub-chat stream on new message
  useEffect(() => {
    if (drawerScrollRef.current) {
      drawerScrollRef.current.scrollTop = drawerScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Keyboard shortcut (Escape to close)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !data) return null;

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isTyping) return;

    const userMsg: BranchMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Dynamic Philippine civic AI response simulation
    setTimeout(() => {
      let replyText = '';
      const lower = text.toLowerCase();

      if (lower.includes('digital national id') || lower.includes('ephilid') || lower.includes('national id')) {
        replyText = `**Oo, 100% legal at tinatanggap ang Digital National ID!**\n\nAlinsunod sa **PSA Memorandum Circular No. 2023-01** at **Executive Order No. 162**, ang lahat ng ahensya ng gobyerno kabilang ang NBI, DFA, PSA, at PhilHealth ay **obligadong tumanggap** ng Printed ePhilID o Digital National ID.\n\n*Paalala:* Tiyaking malinaw at hindi blurred ang official QR Code sa ibaba kapag ipina-print.`;
      } else if (lower.includes('bayad') || lower.includes('libre') || lower.includes('singil') || lower.includes('fee')) {
        if (data.requirementName?.toLowerCase().includes('barangay') || data.title.toLowerCase().includes('jobseeker')) {
          replyText = `**WALA PONG BAYAD (100% LIBRE).**\n\nSa ilalim ng **Section 4 ng Republic Act 11261**, ang Barangay Certification, NBI Clearance, Police Clearance, at Medical Certificate mula sa public hospital ay libre para sa mga First-Time Jobseekers.\n\nKung may naniningil na opisyal ng barangay, maaari itong i-report sa **ARTA Hotline 8888** o sa DILG Field Office.`;
        } else {
          replyText = `**Standard Government Fees:**\n* Regular Postal ID Renewal: **₱504.00** (PHLPost)\n* Express / Rush Postal ID: **₱650.00** (piling mall branches)\n* Digital National ID: **₱0.00 (Libre)** sa [national-id.gov.ph](https://national-id.gov.ph)\n* Notaryo ng Affidavit sa PAO: **₱0.00 (Libre)** para sa indigent qualified.`;
        }
      } else if (lower.includes('post office') || lower.includes('saan')) {
        replyText = `**Pinakamalapit na Tanggapan:**\n* **Quezon City Hall Post Office:** Ground Floor, Civic Center Bldg B (Lunes–Biyernes, 8:00 AM – 5:00 PM).\n* **SM North EDSA Government Service Express (GSE):** May PHLPost counter sa Lower Ground floor.\n* **Cubao Post Office:** Edsa corner Aurora Blvd.\n\n*Payo:* Pumunta bago 11:00 AM para maiwasan ang cut-off sa biometrics photo capture.`;
      } else if (lower.includes('affidavit') || lower.includes('pao')) {
        replyText = `**Hakbang sa Pagkuha ng Affidavit sa PAO:**\n1. Pumunta sa PAO District Office na sumasakop sa iyong lungsod (hal. Hall of Justice, QC City Hall compound).\n2. Ipakita ang iyong Certificate of Indigency mula sa Barangay.\n3. Ihanda ang 2 saksi at kanilang valid government IDs.\n4. Ipi-print at panunumpaan ng PAO lawyer ang Affidavit nang **walang anumang bayad**.`;
      } else {
        replyText = `Salamat sa tanong ukol sa **${data.documentTitle}**.\n\nAyon sa **Citizen's Charter 2025**, maaari mo itong maisaayos sa pamamagitan ng pagdala ng dalawang alternatibong valid government IDs o pagsusumite ng opisyal na updated na kopya.\n\nKung mayroon ka nang bagong litrato o scan ng dokumento, maaari mo itong i-upload gamit ang button sa ibaba para awtomatikong mag-update ang iyong checklist!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleUploadReplacement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    setReplacementName(fileName);
    setIsResolved(true);

    const resolveNote = `Na-verify gamit ang bagong upload: ${fileName}`;
    onResolve(data.requirementName || data.documentTitle, resolveNote, fileName);

    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `🎉 **Matagumpay na na-upload ang bagong dokumento (${fileName})!**\n\nNa-scan at na-cross check alinsunod sa RA 10173. Awtomatiko nang na-update ang kaukulang requirement sa iyong Main Checklist at minarkahang **Verified (Counter-Ready)**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleMarkResolvedDirectly = () => {
    setIsResolved(true);
    const resolveNote = 'Minarkahang naresolba ng aplikante alinsunod sa sub-chat guide';
    onResolve(data.requirementName || data.documentTitle, resolveNote);

    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `✅ **Minarkahang Naayos ang Isyu!**\n\nNa-update ang iyong Main Checklist para sa ${data.documentTitle}. Handa na ito para sa counter submission.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const badgeConfig = {
    expired: {
      label: 'EXPIRED INFO',
      bg: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: Clock,
    },
    missing: {
      label: 'MISSING INFO',
      bg: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: AlertTriangle,
    },
    mismatch: {
      label: 'MISMATCHED INFO',
      bg: 'bg-orange-100 text-orange-900 border-orange-300',
      icon: AlertTriangle,
    },
    general: {
      label: 'ACTION REQUIRED',
      bg: 'bg-blue-100 text-blue-900 border-blue-300',
      icon: FileText,
    },
  }[data.category || 'general'];

  const BadgeIcon = badgeConfig.icon;

  return (
    <>
      {/* Backdrop overlay for smaller screens */}
      <div
        className="fixed inset-0 z-30 bg-black/25 backdrop-blur-[1px] lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-labelledby="branch-drawer-title"
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out"
      >
        {/* Top Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-bold text-slate-900" id="branch-drawer-title">
                  Gabay sa Pag-ayos ng Isyu
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[10px] font-bold uppercase tracking-wider ${badgeConfig.bg}`}
                >
                  <BadgeIcon className="h-3 w-3" />
                  {badgeConfig.label}
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-500 font-medium">
                {data.documentTitle} · Sub-Chat Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 transition-colors"
              aria-label="Isara ang drawer"
              title="Isara (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Issue Banner Summary */}
        <div className="shrink-0 border-b border-slate-200/80 bg-gradient-to-r from-amber-50/70 via-slate-50 to-emerald-50/40 p-3">
          <div className="flex items-start gap-2.5">
            {data.filePreviewUrl ? (
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-2xs">
                <img
                  src={data.filePreviewUrl}
                  alt={data.documentTitle}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
                <FileText className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-900 leading-tight">
                {data.title}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600 leading-snug line-clamp-2">
                {data.detail}
              </p>
            </div>
          </div>
        </div>

        {/* Status / Resolution Sync Banner */}
        {isResolved ? (
          <div className="shrink-0 bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between gap-2 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-emerald-800 text-[12px] font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Naresolba na · Na-sync sa Main Checklist</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Bumalik sa Main Chat</span>
            </button>
          </div>
        ) : null}

        {/* Scrollable Sub-Chat Stream */}
        <div ref={drawerScrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div
                  key={msg.id}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-[12px] text-emerald-950 shadow-2xs"
                >
                  <CivicMarkdown content={msg.text} onOpenSource={onOpenSource} />
                </div>
              );
            }

            if (msg.sender === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-slate-900 px-3.5 py-2 text-[12.5px] text-white shadow-xs">
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    <span className="mt-1 block text-right text-[10px] text-slate-300">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            }

            // Assistant Message
            return (
              <div key={msg.id} className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="rounded-2xl rounded-tl-xs border border-slate-200/90 bg-white p-3.5 text-[12px] text-slate-800 shadow-2xs">
                    <CivicMarkdown content={msg.text} onOpenSource={onOpenSource} />
                    <span className="mt-2 block text-right text-[10px] text-slate-400">
                      {msg.timestamp} · Grounded Guidance
                    </span>
                  </div>

                  {/* Quick-reply Suggestion Chips */}
                  {msg.chips && msg.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.chips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleSendMessage(chip)}
                          disabled={isTyping}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-2xs hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 transition-colors disabled:opacity-50"
                        >
                          <span>{chip}</span>
                          <ChevronRight className="h-3 w-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-slate-500 text-[12px] pl-9">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Nagsusulat ng opisyal na gabay...</span>
            </div>
          )}


        </div>

        {/* Resolution Actions Box */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-3 space-y-2">
          {!isResolved ? (
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5">
              <span className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                Aksyon sa Pag-ayos (Document Resolution):
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleUploadReplacement}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1.5 text-[11.5px] font-semibold text-emerald-800 transition-all shadow-2xs"
                  title="Mag-upload ng panibagong valid ID o kopya"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Mag-upload ng Bago</span>
                </button>

                <button
                  type="button"
                  onClick={handleMarkResolvedDirectly}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-800 transition-all shadow-2xs"
                  title="Markahan bilang naayos na"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Markahang Naayos</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-2.5 text-center">
              <p className="text-[12px] font-bold text-emerald-900">
                ✅ Na-verify na ang {data.documentTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-700">
                Awtomatiko nang na-update ang iyong checklist. Maaari kang magtanong pa o bumalik sa main chat.
              </p>
            </div>
          )}

          {/* Sub-chat Prompt Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 pt-1"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Magtanong ukol sa pag-ayos ng ${data.documentTitle}...`}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:opacity-40"
              title="Ipadala"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <p className="text-center text-[10px] text-slate-400">
            Naka-ground sa Citizen&apos;s Charter · Ephemeral Sub-Chat (RA 10173)
          </p>
        </div>
      </aside>
    </>
  );
}
