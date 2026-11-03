'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getServiceFormConfig,
  mapApplicantProfileToForm,
  type FormFieldDefinition,
} from '@/lib/services/forms';
import { getServiceByCode } from '@/lib/services/registry';
import { PROFILES } from '@/lib/citizen/defaults';
import type { ApplicantProfile } from '@/lib/services/charter-sources';
import { parseResponseJson } from '@/lib/utils';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Clock,
  HelpCircle,
  Save,
  Send,
  ExternalLink,
  Copy,
  Check,
  UserCheck,
  RotateCcw,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface MissingFieldPrompt {
  fieldName: string;
  labelFil: string;
  labelEn: string;
  questionFil: string;
  reason: string;
}

export default function ServiceFormPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const formConfig = getServiceFormConfig(code);
  const serviceDef = getServiceByCode(code);

  if (!formConfig || !serviceDef) {
    notFound();
  }

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [confirmedFields, setConfirmedFields] = useState<Set<string>>(new Set());
  const [suggestedFields, setSuggestedFields] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<string>(formConfig.sections[0]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiExtractError, setAiExtractError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<MissingFieldPrompt[]>([]);
  const [proactiveWarnings, setProactiveWarnings] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [hasStoredDraft, setHasStoredDraft] = useState(false);
  const [storedDraftTime, setStoredDraftTime] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState(false);

  // Check for local stored draft on load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`govguide_draft_${formConfig.serviceCode}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.formData && Object.keys(parsed.formData).length > 0) {
          setHasStoredDraft(true);
          setStoredDraftTime(parsed.savedAt || 'Kamakailan');
        }
      }
    } catch (e) {
      console.warn('Failed to inspect local draft:', e);
    }
  }, [formConfig.serviceCode]);

  const handleInputChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Citizen edits take precedence and become confirmed
    setConfirmedFields((prev) => new Set([...prev, name]));
    setSuggestedFields((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleLoadProfile = () => {
    try {
      let profile: Partial<ApplicantProfile> = PROFILES.new_citizen;
      const stored = localStorage.getItem('govguide_applicant_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) profile = parsed;
      }

      const mapped = mapApplicantProfileToForm(formConfig.serviceCode, profile);
      const mappedKeys = Object.keys(mapped);

      setFormData((prev) => ({ ...prev, ...mapped }));
      setConfirmedFields((prev) => new Set([...prev, ...mappedKeys]));
      setSuggestedFields((prev) => {
        const next = new Set(prev);
        mappedKeys.forEach((k) => next.delete(k));
        return next;
      });

      setSaveStatus('Matagumpay na na-load ang impormasyon mula sa iyong Aking Profile (My Details)!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setSaveStatus('Hindi ma-load ang profile. Pakisubukang muli.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(`govguide_draft_${formConfig.serviceCode}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          setFormData(parsed.formData);
          if (Array.isArray(parsed.confirmedFields)) {
            setConfirmedFields(new Set(parsed.confirmedFields));
          }
          if (Array.isArray(parsed.suggestedFields)) {
            setSuggestedFields(new Set(parsed.suggestedFields));
          }
          setHasStoredDraft(false);
          setSaveStatus('Naibalik ang iyong huling nai-save na draft!');
          setTimeout(() => setSaveStatus(null), 3000);
        }
      }
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
  };

  const handleDiscardStoredDraft = () => {
    localStorage.removeItem(`govguide_draft_${formConfig.serviceCode}`);
    setHasStoredDraft(false);
    setSaveStatus('Tinanggal ang lumang draft.');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleAiExtract = async (presetText?: string) => {
    const textToProcess = presetText || aiInputText;
    if (!textToProcess.trim()) return;

    setIsExtracting(true);
    setAiExtractError(null);
    try {
      const res = await fetch('/api/services/propose-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCode: formConfig.serviceCode,
          conversationText: textToProcess,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI Draft service returned status ${res.status}`);
      }

      const data = await parseResponseJson(res);

      // Safe non-destructive suggestion merge:
      // Inferred AI values do NOT silently overwrite confirmed citizen details (citizen edits win)
      const newSuggested = new Set<string>();
      setFormData((prev) => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(data.draftData || {})) {
          // If citizen has already confirmed this field and it has a value, preserve citizen's value
          if (confirmedFields.has(key) && next[key] !== undefined && next[key] !== '') {
            continue;
          }
          next[key] = val;
          newSuggested.add(key);
        }
        return next;
      });

      setSuggestedFields(newSuggested);
      setMissingFields(data.missingFields || []);
      setProactiveWarnings(data.proactiveWarnings || []);
      setIsAiModalOpen(false);
      setSaveStatus('Nailapat ang AI suggestions. Suriin ang mga patlang na may ✨ bago magpatuloy.');
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: unknown) {
      console.error('AI Draft Error:', err);
      const msg = err instanceof Error ? err.message : 'Hindi ma-contact ang AI proposal service.';
      setAiExtractError(`Nagka-aberya sa pag-extract: ${msg}. Pakisubukan muli.`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAcceptAllSuggestions = () => {
    setConfirmedFields((prev) => new Set([...prev, ...suggestedFields]));
    setSuggestedFields(new Set());
    setSaveStatus('Tinanggap ang lahat ng mungkahi ng AI bilang kumpirmadong datos.');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleClearSuggestions = () => {
    setFormData((prev) => {
      const next = { ...prev };
      suggestedFields.forEach((key) => {
        delete next[key];
      });
      return next;
    });
    setSuggestedFields(new Set());
    setSaveStatus('Inalis ang mga pansamantalang mungkahi ng AI.');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const validateForm = () => {
    const parseResult = formConfig.schema.safeParse(formData);
    if (!parseResult.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!newErrors[fieldName]) {
          newErrors[fieldName] = issue.message;
        }
      }
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSaveDraft = () => {
    try {
      const payload = {
        formData,
        confirmedFields: Array.from(confirmedFields),
        suggestedFields: Array.from(suggestedFields),
        savedAt: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
      };
      localStorage.setItem(`govguide_draft_${formConfig.serviceCode}`, JSON.stringify(payload));
      setSaveStatus('Nai-save sa iyong browser bilang pansamantalang draft (Local Draft Saved)!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (e) {
      console.error('Failed to save draft:', e);
      setSaveStatus('Hindi mai-save ang draft sa storage.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleFocusMissingField = (fieldName: string) => {
    const fieldDef = formConfig.fields.find((f) => f.name === fieldName);
    if (fieldDef && fieldDef.section !== activeSection) {
      setActiveSection(fieldDef.section);
    }
    setTimeout(() => {
      const el = document.getElementById(fieldName);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 150);
  };

  const handleCopySummary = () => {
    const lines: string[] = [
      `--- GOVGUIDE PH FORM DATA SUMMARY ---`,
      `Serbisyo: ${formConfig.titleFil}`,
      `Ahensya: ${serviceDef.agencyName} (${serviceDef.agencyCode})`,
      `Opisyal na Portal: ${serviceDef.officialPortal}`,
      `Petsa ng Paghahanda: ${new Date().toLocaleDateString('en-PH')}`,
      ``,
    ];

    for (const section of formConfig.sections) {
      lines.push(`[${section.toUpperCase()}]`);
      const sectionFields = formConfig.fields.filter((f) => f.section === section);
      for (const field of sectionFields) {
        const val = formData[field.name];
        if (val !== undefined && val !== null && val !== '') {
          lines.push(`- ${field.labelFil}: ${String(val)}`);
        }
      }
      lines.push(``);
    }

    lines.push(`--------------------------------------`);
    lines.push(
      `PAALALA: Paghahanda lamang ito ng datos ayon sa Citizen's Charter. Hindi ito opisyal na pagsusumite sa ahensya hangga't hindi ito napo-proseso sa kanilang opisyal na portal o sangay.`,
    );

    navigator.clipboard.writeText(lines.join('\n'));
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setSaveStatus(
        'Kumpleto at wasto ang lahat ng datos ayon sa Citizen\'s Charter! Handa na para sa Opisyal na Handoff.',
      );
      setTimeout(() => setSaveStatus(null), 5000);
      const handoffEl = document.getElementById('official-handoff-section');
      if (handoffEl) {
        handoffEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setSaveStatus('Pakisuri ang mga patlang na may pulang babala bago magpatuloy.');
      setTimeout(() => setSaveStatus(null), 4000);
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        handleFocusMissingField(firstErrorField);
      }
    }
  };

  const totalFee = serviceDef.processingFee + (serviceDef.convenienceFee || 0);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top Back Navigation & Profile Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Bumalik sa Talaan ng Serbisyo</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadProfile}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-all"
              title="I-load ang kumpirmadong impormasyon mula sa My Details"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>I-load mula sa Profile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAiExtractError(null);
                setIsAiModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>AI Draft Autofill</span>
            </button>
          </div>
        </div>

        {/* Stored Draft Recovery Banner */}
        {hasStoredDraft && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 shadow-xs text-xs text-blue-950">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold">May nakitang nai-save na draft sa iyong browser:</p>
                <p className="text-[11px] text-blue-800">
                  Huling nai-save noong {storedDraftTime}. Nais mo ba itong ipagpatuloy?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs"
              >
                Ibalik ang Draft
              </button>
              <button
                type="button"
                onClick={handleDiscardStoredDraft}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Huwag Gamitin
              </button>
            </div>
          </div>
        )}

        {/* Agency Banner */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-blue-600">
                {serviceDef.agencyName} ({serviceDef.agencyCode})
              </span>
              <h2 className="text-lg font-black text-slate-900 sm:text-xl">{formConfig.titleFil}</h2>
              <p className="text-xs text-slate-500">{formConfig.titleEn}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                <Receipt className="h-4 w-4" />
                <span>{totalFee === 0 ? 'LIBRE (₱0.00)' : `₱${totalFee.toFixed(2)}`}</span>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <Clock className="h-4 w-4" />
                <span>{serviceDef.processingDays} Araw</span>
              </div>
            </div>
          </div>

          {/* AI Suggestions Review Banner */}
          {suggestedFields.size > 0 && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-blue-900">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>
                    May {suggestedFields.size} mungkahing patlang mula sa AI (Pansamantala lamang):
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleAcceptAllSuggestions}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 font-bold text-white hover:bg-blue-700"
                  >
                    Tanggapin Lahat
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSuggestions}
                    className="rounded-lg border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800 hover:bg-blue-100"
                  >
                    I-clear Mungkahi
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-blue-800">
                Maaari mong baguhin ang bawat patlang nang direkta. Hindi magkakabisa ang mga mungkahi
                kung walang pahintulot o kumpirmasyon.
              </p>
            </div>
          )}

          {/* Proactive Warnings Banner if any */}
          {proactiveWarnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Paalala mula sa Citizen&apos;s Charter:</span>
              </div>
              <ul className="list-inside list-disc space-y-0.5 text-[11px] text-amber-800">
                {proactiveWarnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Fields Assistant Box */}
          {missingFields.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <HelpCircle className="h-4 w-4 text-amber-600" />
                <span>May Kulang Pang Impormasyon ({missingFields.length}):</span>
              </div>
              <div className="space-y-1.5">
                {missingFields.map((mf, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleFocusMissingField(mf.fieldName)}
                    className="w-full text-left rounded-lg bg-white p-2.5 shadow-2xs border border-amber-200/80 hover:border-amber-400 transition-all cursor-pointer"
                  >
                    <p className="font-semibold text-amber-950 flex items-center justify-between">
                      <span>{mf.questionFil}</span>
                      <span className="text-[10px] text-blue-600 font-bold">Punan ➔</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{mf.reason}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2">
          {formConfig.sections.map((section) => {
            const isActive = activeSection === section;
            return (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {section}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              {activeSection}
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {formConfig.fields
                .filter((f) => f.section === activeSection)
                .map((field) => {
                  const isSuggested = suggestedFields.has(field.name);
                  const isConfirmed = confirmedFields.has(field.name);

                  return (
                    <div
                      key={field.name}
                      className={`space-y-1.5 ${
                        field.type === 'text' && field.name.toLowerCase().includes('address')
                          ? 'sm:col-span-2'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <label
                          htmlFor={field.name}
                          className="block text-xs font-semibold text-slate-700"
                        >
                          {field.labelFil}{' '}
                          {field.required && <span className="text-rose-500">*</span>}
                        </label>

                        {isSuggested && (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>Mungkahi</span>
                          </span>
                        )}
                        {isConfirmed && !isSuggested && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <Check className="h-2.5 w-2.5" />
                            <span>Kumpirmado</span>
                          </span>
                        )}
                      </div>

                      {/* Text / Date / Number Input */}
                      {(field.type === 'text' || field.type === 'date' || field.type === 'number') && (
                        <input
                          id={field.name}
                          type={field.type}
                          value={(formData[field.name] as string | number) ?? ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          className={`w-full rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                            errors[field.name]
                              ? 'border-rose-400 bg-rose-50/30'
                              : isSuggested
                                ? 'border-blue-300 bg-blue-50/20'
                                : 'border-slate-200'
                          }`}
                        />
                      )}

                      {/* Select Dropdown */}
                      {field.type === 'select' && (
                        <select
                          id={field.name}
                          value={(formData[field.name] as string) ?? ''}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className={`w-full rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                            errors[field.name]
                              ? 'border-rose-400 bg-rose-50/30'
                              : isSuggested
                                ? 'border-blue-300 bg-blue-50/20'
                                : 'border-slate-200'
                          }`}
                        >
                          <option value="">-- Pumili --</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.labelFil}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Radio Options */}
                      {field.type === 'radio' && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {field.options?.map((opt) => {
                            const isSelected = formData[field.name] === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleInputChange(field.name, opt.value)}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {opt.labelFil}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Checkbox */}
                      {field.type === 'checkbox' && (
                        <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData[field.name])}
                            onChange={(e) => handleInputChange(field.name, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Oo, sumasang-ayon ako / Kabilang ako dito</span>
                        </label>
                      )}

                      {field.helperTextFil && (
                        <p className="text-[10px] text-slate-500">{field.helperTextFil}</p>
                      )}
                      {errors[field.name] && (
                        <p role="alert" className="text-[10px] font-bold text-rose-600">
                          {errors[field.name]}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Toast / Notification Banner */}
          {saveStatus && (
            <div
              role="status"
              className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center text-xs font-bold text-blue-900 animate-in fade-in-50"
            >
              {saveStatus}
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              <span>I-save bilang Draft</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all"
            >
              <span>Ihanda para sa Opisyal na Handoff</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        {/* Official Agency Handoff Section (Milestone M4) */}
        <div
          id="official-handoff-section"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                {serviceDef.agencyCode}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Opisyal na Pagsasalin sa Ahensya (Official Agency Handoff)
                </h3>
                <p className="text-[11px] text-slate-500">
                  {serviceDef.agencyName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
            >
              {copyNotice ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copyNotice ? 'Nakopya na!' : 'Kopyahin ang Buod'}</span>
            </button>
          </div>

          {/* Official Agency Disclaimer */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Info className="h-4 w-4 text-amber-700 shrink-0" />
              <span>Mahalagang Paalala sa Pag-file (RA 11032 Anti-Red Tape Grounding):</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900">
              Ang GovGuide PH ay isang civic guidance platform para sa paghahanda ng iyong datos at
              dokumento. Ang pag-save ng draft na ito ay <strong>HINDI opisyal na aplikasyon o garantiya ng pagtanggap ng ahensya</strong>.
              Kailangan mong kumpletuhin ang transaksyon sa opisyal na portal o sangay ng {serviceDef.agencyName}.
            </p>
          </div>

          {/* Fee & Official Link Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Opisyal na Bayarin ayon sa Charter:
              </span>
              <p className="text-sm font-black text-slate-900">
                {totalFee === 0 ? 'LIBRE (₱0.00)' : `₱${totalFee.toFixed(2)}`}
              </p>
              <p className="text-[10px] text-slate-500">
                {serviceDef.code === 'NBI_CLEARANCE'
                  ? 'Libre sa First-Time Jobseeker (RA 11261). ₱130 + ₱25 e-payment fee para sa regular.'
                  : serviceDef.code === 'PSA_BIRTH_CERT'
                    ? '₱155 sa CRS outlet walk-in; ₱330–₱365 para sa courier door-to-door delivery.'
                    : 'Libreng pagpaparehistro at pagkuha ng MDR/PIN sa PhilHealth.'}
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Opisyal na Portal ng Ahensya:
                </span>
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {serviceDef.officialPortal}
                </p>
              </div>

              <a
                href={serviceDef.officialPortal}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition-all"
              >
                <span>Pumunta sa Opisyal na Portal</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* AI Autofill Modal */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">AI Form Draft Assistant</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600">
                I-paste ang buod ng iyong usapan sa chat o impormasyon ng aplikante. Awtomatikong
                pupunan ng AI ang mga patlang bilang mga mungkahi (suggestions) na maaari mong suriin:
              </p>

              {aiExtractError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1"
                >
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    <span>Nagka-aberya:</span>
                  </p>
                  <p className="text-[11px]">{aiExtractError}</p>
                </div>
              )}

              <textarea
                rows={4}
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder="Halimbawa: Ako si Juan Dela Cruz Santos, pinanganak noong Agosto 14, 1995 sa Maynila. Single, first time jobseeker. Mobile: 09171234567, Email: juan@example.com..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {/* One-Click Demo Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  1-Click Fast-Track Demo Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={() =>
                      handleAiExtract(
                        'Pangalan: Juan Dela Cruz Santos, pinanganak noong 1995-08-14 sa Sampaloc Manila. First-time jobseeker sa NBI. Mobile: 09171234567, Email: juan@example.com.',
                      )
                    }
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    👤 Demo 1: Juan Santos (Complete)
                  </button>
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={() =>
                      handleAiExtract(
                        'Ako si Maria Santos, kukuha ng PSA birth certificate. May-ari ako. Mobile: 09187654321.',
                      )
                    }
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    👤 Demo 2: Maria Santos (Missing Maiden Name)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Kanselahin
                </button>
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={() => handleAiExtract()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isExtracting ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sinisuri ng AI...</span>
                    </>
                  ) : (
                    <span>I-extract at Punan</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
