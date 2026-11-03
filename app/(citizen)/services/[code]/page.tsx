'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getServiceFormConfig,
  type FormFieldDefinition,
} from '@/lib/services/forms';
import { getServiceByCode } from '@/lib/services/registry';
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<string>(formConfig.sections[0]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [missingFields, setMissingFields] = useState<MissingFieldPrompt[]>([]);
  const [proactiveWarnings, setProactiveWarnings] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleInputChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleAiExtract = async (presetText?: string) => {
    const textToProcess = presetText || aiInputText;
    if (!textToProcess.trim()) return;

    setIsExtracting(true);
    try {
      const res = await fetch('/api/services/propose-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCode: formConfig.serviceCode,
          conversationText: textToProcess,
        }),
      });

      const data = await parseResponseJson(res);

      setFormData((prev) => ({ ...prev, ...data.draftData }));
      setMissingFields(data.missingFields || []);
      setProactiveWarnings(data.proactiveWarnings || []);
      setIsAiModalOpen(false);
      setSaveStatus('Matagumpay na nailipat ang datos mula sa AI Draft!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Nagka-aberya sa pag-extract ng AI draft. Pakisubukan muli.');
    } finally {
      setIsExtracting(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    for (const field of formConfig.fields) {
      if (field.required) {
        const val = formData[field.name];
        if (val === undefined || val === null || val === '') {
          newErrors[field.name] = `Kailangan ang ${field.labelFil}.`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = () => {
    setSaveStatus('Nai-save bilang pansamantalang draft (Local Draft Saved)!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setSaveStatus('Kumpleto at handa na para sa Confirmation-Gated Submit (M5)!');
      setTimeout(() => setSaveStatus(null), 4000);
    } else {
      setSaveStatus('Pakisuri ang mga patlang na may pulang babala bago magpatuloy.');
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const totalFee = serviceDef.processingFee + (serviceDef.convenienceFee || 0);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top Back Navigation & Agency Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Bumalik sa Talaan ng Serbisyo</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-100"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>AI Draft Autofill</span>
          </button>
        </div>

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

          {/* Missing Fields Assistant Box if AI detected missing info */}
          {missingFields.length > 0 && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <span>May Kulang Pang Impormasyon ({missingFields.length}):</span>
              </div>
              <div className="space-y-1.5">
                {missingFields.map((mf, idx) => (
                  <div key={idx} className="rounded-lg bg-white p-2.5 shadow-xs border border-blue-100">
                    <p className="font-semibold text-blue-900">{mf.questionFil}</p>
                    <p className="text-[10px] text-slate-500">{mf.reason}</p>
                  </div>
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
                .map((field) => (
                  <div
                    key={field.name}
                    className={`space-y-1.5 ${
                      field.type === 'text' && field.name.includes('Address') ? 'sm:col-span-2' : ''
                    }`}
                  >
                    <label
                      htmlFor={field.name}
                      className="block text-xs font-semibold text-slate-700"
                    >
                      {field.labelFil} {field.required && <span className="text-rose-500">*</span>}
                    </label>

                    {/* Text / Date / Number Input */}
                    {(field.type === 'text' || field.type === 'date' || field.type === 'number') && (
                      <input
                        id={field.name}
                        type={field.type}
                        value={(formData[field.name] as string | number) ?? ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={`w-full rounded-xl border bg-white px-3 py-2 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                          errors[field.name] ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
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
                          errors[field.name] ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
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
                      <p className="text-[10px] font-bold text-rose-600">{errors[field.name]}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Toast / Notification Banner */}
          {saveStatus && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center text-xs font-bold text-blue-800 animate-in fade-in-50">
              {saveStatus}
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>I-save bilang Draft</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all"
            >
              <span>Isumite ang Aplikasyon</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

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
                pupunan ng AI ang mga patlang ng form:
              </p>

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
                    onClick={() =>
                      handleAiExtract(
                        'Pangalan: Juan Dela Cruz Santos, pinanganak noong 1995-08-14 sa Sampaloc Manila. First-time jobseeker sa NBI. Mobile: 09171234567, Email: juan@example.com.',
                      )
                    }
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    👤 Demo 1: Juan Santos (Complete)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAiExtract(
                        'Ako si Maria Santos, kukuha ng PSA birth certificate. May-ari ako. Mobile: 09187654321.',
                      )
                    }
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
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
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isExtracting ? 'Sinisuri ng AI...' : 'I-extract at Punan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
