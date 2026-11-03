'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  RefreshCw,
  XCircle,
  Sparkles,
  UserCheck,
  Building2,
  ArrowRight,
  Info,
} from 'lucide-react';
import type {
  DfaConsularOffice,
  DfaApplicationType,
  DfaApplicationCategoryInfo,
  DfaProcessingSpeed,
  DfaTimeSlot,
  DfaAppointmentBooking,
} from '@/lib/dfa/appointments';
import { safeResponseJson } from '@/lib/utils';

interface DfaAppointmentViewProps {
  initialApplicant?: {
    fullName?: string;
    birthDate?: string;
    email?: string;
    mobileNumber?: string;
    address?: string;
  };
  onAskInChat?: (prompt: string) => void;
  onBookingCreated?: (booking: DfaAppointmentBooking) => void;
}

const ISLAND_TABS: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'All Offices (10)' },
  { id: 'NCR', label: 'NCR / Metro Manila' },
  { id: 'Luzon', label: 'Luzon' },
  { id: 'Visayas', label: 'Visayas' },
  { id: 'Mindanao', label: 'Mindanao' },
];

export function DfaAppointmentView({
  initialApplicant,
  onAskInChat,
  onBookingCreated,
}: DfaAppointmentViewProps) {
  const [offices, setOffices] = useState<DfaConsularOffice[]>([]);
  const [categories, setCategories] = useState<DfaApplicationCategoryInfo[]>([]);
  const [appointments, setAppointments] = useState<DfaAppointmentBooking[]>([]);
  const [slots, setSlots] = useState<DfaTimeSlot[]>([]);

  const [islandFilter, setIslandFilter] = useState<string>('ALL');
  const [selectedSiteCode, setSelectedSiteCode] = useState<string>('DFA-ASEANA');
  const [selectedCategory, setSelectedCategory] = useState<DfaApplicationType>('NEW_ADULT');
  const [processingSpeed, setProcessingSpeed] = useState<DfaProcessingSpeed>('REGULAR');
  const [appointmentDate, setAppointmentDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 2 * 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // Applicant Form State
  const [fullName, setFullName] = useState<string>(
    initialApplicant?.fullName || ''
  );
  const [birthDate, setBirthDate] = useState<string>(initialApplicant?.birthDate || '');
  const [mobileNumber, setMobileNumber] = useState<string>(
    initialApplicant?.mobileNumber || ''
  );
  const [email, setEmail] = useState<string>(
    initialApplicant?.email || ''
  );
  const [primaryIdPresented, setPrimaryIdPresented] = useState<string>('PhilSys National ID');
  const [dressCodeConfirmed, setDressCodeConfirmed] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<DfaAppointmentBooking | null>(null);

  // Reschedule state
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dfa/appointments?siteCode=${encodeURIComponent(selectedSiteCode)}&date=${encodeURIComponent(appointmentDate)}`
      );
      const { data } = await safeResponseJson(res);
      if (data?.offices) setOffices(data.offices);
      if (data?.categories) {
        setCategories(
          Array.isArray(data.categories) ? data.categories : Object.values(data.categories)
        );
      }
      if (data?.appointments) setAppointments(data.appointments);
      if (data?.slots) {
        setSlots(data.slots);
        const firstAvailable = data.slots.find((s: DfaTimeSlot) => s.availableCount > 0);
        if (firstAvailable) {
          setSelectedSlotId(firstAvailable.id);
        }
      }
    } catch {
      setErrorMessage('Unable to load DFA Consular Office schedule.');
    } finally {
      setLoading(false);
    }
  }, [selectedSiteCode, appointmentDate]);

  useEffect(() => {
    void fetchInitialData();
  }, [fetchInitialData]);

  const filteredOffices = offices.filter((office) =>
    islandFilter === 'ALL' ? true : office.islandGroup === islandFilter
  );

  const activeOffice = offices.find((o) => o.code === selectedSiteCode) || offices[0];
  const activeCategoryObj =
    categories.find((c) => c.type === selectedCategory) || categories[0];

  // Fee Breakdown Calculation
  const baseFee = processingSpeed === 'EXPEDITED' ? 1200 : 950;
  const lostPenaltyFee = selectedCategory === 'LOST_VALID' ? 350 : 0;
  const convenienceFee = 50;
  const totalFee = baseFee + lostPenaltyFee + convenienceFee;

  const handleBookOrReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessBooking(null);

    if (!selectedSlotId) {
      setErrorMessage('Please select an available appointment time slot.');
      return;
    }

    if (reschedulingAppointmentId) {
      setSubmitting(true);
      try {
        const res = await fetch('/api/dfa/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reschedule',
            appointmentId: reschedulingAppointmentId,
            siteCode: selectedSiteCode,
            date: appointmentDate,
            newSlotId: selectedSlotId,
          }),
        });
        const { data, ok, error } = await safeResponseJson(res);
        if (!ok || !data) {
          setErrorMessage(data?.error || error || 'Failed to reschedule appointment.');
        } else if (data.appointment) {
          setSuccessBooking(data.appointment);
          setReschedulingAppointmentId(null);
          await fetchInitialData();
        }
      } catch {
        setErrorMessage('Network error while rescheduling DFA appointment.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!dressCodeConfirmed) {
      setErrorMessage(
        'Please confirm the DFA Biometrics Dress Code & Original Documents requirement before booking.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/dfa/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book',
          siteCode: selectedSiteCode,
          date: appointmentDate,
          slotId: selectedSlotId,
          applicationType: selectedCategory,
          processingSpeed,
          applicantName: fullName,
          birthDate,
          phone: mobileNumber,
          email,
          primaryIdPresented,
          dressCodeAcknowledged: dressCodeConfirmed,
        }),
      });
      const { data, ok, error } = await safeResponseJson(res);
      if (!ok || !data) {
        setErrorMessage(data?.error || error || 'Failed to book DFA passport appointment.');
      } else if (data.appointment) {
        setSuccessBooking(data.appointment);
        onBookingCreated?.(data.appointment);
        await fetchInitialData();
      }
    } catch {
      setErrorMessage('Network error while booking DFA passport appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    setErrorMessage(null);
    try {
      const res = await fetch('/api/dfa/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          appointmentId,
        }),
      });
      const { data, ok, error } = await safeResponseJson(res);
      if (!ok || !data) {
        setErrorMessage(data?.error || error || 'Failed to cancel appointment.');
      } else {
        await fetchInitialData();
      }
    } catch {
      setErrorMessage('Network error while cancelling appointment.');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1e3a8a] text-white p-6 shadow-lg border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              DEPARTMENT OF FOREIGN AFFAIRS (DFA) • CONSULAR PASSPORT SYSTEM
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              DFA Online Passport Appointment & Slot Booking
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Book verified slots at 10 DFA Consular Offices across NCR, Luzon, Visayas, and
              Mindanao. Pre-verified against the 2024 DFA Citizen&apos;s Charter to prevent
              repeat queueing (&ldquo;balik-pila&rdquo;).
            </p>
          </div>
          {onAskInChat && (
            <button
              type="button"
              onClick={() =>
                onAskInChat(
                  `What are the exact requirements and fees for a ${selectedCategory.replace(/_/g, ' ')} DFA passport application?`
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition shadow-md shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              Ask AI Charter Assistant
            </button>
          )}
        </div>
      </div>

      {/* Reschedule Banner if active */}
      {reschedulingAppointmentId && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
            <div>
              <p className="text-sm font-bold text-amber-950">
                Rescheduling Mode Active (Appointment ID: {reschedulingAppointmentId})
              </p>
              <p className="text-xs text-amber-800">
                Select a new Consular Office, Date, and Time Slot below, then click &ldquo;Confirm
                Reschedule&rdquo;.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReschedulingAppointmentId(null)}
            className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            Cancel Reschedule
          </button>
        </div>
      )}

      {/* Alerts */}
      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-900">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Booking Notice</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successBooking && (
        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-500/40 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold">
                    CONFIRMED SLOT
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-950">
                    Ref: {successBooking.referenceCode}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {successBooking.applicantName} — {successBooking.siteName}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Date: <strong>{successBooking.date}</strong> • Time:{' '}
                  <strong>{successBooking.timeWindow}</strong> • Total Fee:{' '}
                  <strong>₱{successBooking.totalFeePhp.toLocaleString()}</strong> (
                  {successBooking.processingSpeed} · {successBooking.estimatedReleaseDays})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBooking(null)}
              className="text-xs font-semibold text-emerald-800 hover:underline self-end md:self-center"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left (Office, Category, Slot Picker) & Right (Applicant Form + Active Bookings) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Step 1-3 */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Step 1: Select DFA Consular Office */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0f172a] text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Select DFA Consular Office Nationwide
                </h2>
              </div>
              <span className="text-xs text-slate-500">{filteredOffices.length} sites shown</span>
            </div>

            {/* Island Group Tabs */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {ISLAND_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setIslandFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    islandFilter === tab.id
                      ? 'bg-[#0f172a] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Consular Office Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredOffices.map((office) => {
                const isSelected = office.code === selectedSiteCode;
                return (
                  <button
                    key={office.code}
                    type="button"
                    onClick={() => setSelectedSiteCode(office.code)}
                    className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {office.code}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {office.region}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1.5">{office.name}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{office.address}</span>
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Cap: {office.dailyCapacity}/day</span>
                      {office.courtesyLaneAvailable && (
                        <span className="text-emerald-700 font-medium">Courtesy Lane ✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {activeOffice && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{activeOffice.name}:</span>{' '}
                  {activeOffice.address}
                </div>
                <span className="font-mono text-[11px] text-slate-600 shrink-0">
                  {activeOffice.operatingHours}
                </span>
              </div>
            )}
          </div>

          {/* Step 2: Application Category & Charter Requirements */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#0f172a] text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Application Type, Processing Speed & Charter Checklist
              </h2>
            </div>

            {/* Category Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              {categories.map((cat) => {
                const active = cat.type === selectedCategory;
                return (
                  <button
                    key={cat.type}
                    type="button"
                    onClick={() => setSelectedCategory(cat.type)}
                    className={`p-3 rounded-xl border text-left transition ${
                      active
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{cat.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {cat.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Processing Speed Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setProcessingSpeed('REGULAR')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                  processingSpeed === 'REGULAR'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">Regular Processing</p>
                  <p className="text-[11px] text-slate-600">Release in 10–12 working days</p>
                </div>
                <span className="text-sm font-extrabold text-emerald-800">₱950</span>
              </button>

              <button
                type="button"
                onClick={() => setProcessingSpeed('EXPEDITED')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                  processingSpeed === 'EXPEDITED'
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-slate-900">Expedited Processing</p>
                  <p className="text-[11px] text-slate-600">Release in 5–7 working days</p>
                </div>
                <span className="text-sm font-extrabold text-amber-800">₱1,200</span>
              </button>
            </div>

            {/* Official Charter Checklist */}
            {activeCategoryObj && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Mandatory Documentary Requirements ({activeCategoryObj.label})
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {activeCategoryObj.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>{req.name}:</strong> {req.detail}
                      </span>
                    </li>
                  ))}
                </ul>
                {activeCategoryObj.clearingDaysNote && (
                  <p className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] text-amber-900 bg-amber-50/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{activeCategoryObj.clearingDaysNote}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Step 3: Date & Hourly Time Slot Picker */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0f172a] text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Choose Appointment Date & Time Window
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  aria-label="Appointment Date"
                  value={appointmentDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading real-time consular slots...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {slots.map((slot) => {
                  const isFull = slot.availableCount <= 0;
                  const isSelected = slot.id === selectedSlotId;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        isFull
                          ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                          : isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : 'border-slate-200 hover:border-blue-400 bg-white text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{slot.timeWindow.split(' – ')[0]}</span>
                      </div>
                      <p
                        className={`text-[10px] mt-0.5 ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        to {slot.timeWindow.split(' – ')[1] || slot.timeWindow}
                      </p>
                      <div className="mt-2 pt-1.5 border-t border-current/10 flex items-center justify-between text-[10px] font-semibold">
                        <span>{slot.availableCount} slots left</span>
                        <span>{isFull ? 'FULL' : slot.availableCount <= 5 ? 'FAST' : 'OPEN'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Applicant Form & Active Appointments */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Applicant Form */}
          <form
            onSubmit={handleBookOrReschedule}
            className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {reschedulingAppointmentId
                    ? 'Confirm New Appointment Schedule'
                    : 'Applicant Details & Confirmation'}
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                RA 10173 Protected
              </span>
            </div>

            {!reschedulingAppointmentId && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Full Name (as shown on PSA Birth Cert)
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Primary Government ID to Present
                    </label>
                    <select
                      aria-label="Primary Government ID to Present"
                      value={primaryIdPresented}
                      onChange={(e) => setPrimaryIdPresented(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                    >
                      <option value="PhilSys National ID">PhilSys National ID (Card / ePhilID)</option>
                      <option value="LTO Driver's License">LTO Driver&apos;s License</option>
                      <option value="SSS / GSIS UMID Card">SSS / GSIS UMID Card</option>
                      <option value="PRC Professional ID">PRC Professional ID</option>
                      <option value="Philippine Postal ID">Philippine Postal ID</option>
                      <option value="Current ePassport (Renewal)">Current ePassport (Renewal)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Mobile Number (SMS Slot Alerts)
                    </label>
                    <input
                      type="text"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Email Address (e-Receipt & Packet PDF Delivery)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                {/* Fee Summary Box */}
                <div className="rounded-xl bg-slate-900 text-white p-4">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      Passport Processing ({processingSpeed})
                    </span>
                    <span>₱{baseFee.toLocaleString()}</span>
                  </div>
                  {lostPenaltyFee > 0 && (
                    <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
                      <span>Lost Valid Passport Verification Penalty</span>
                      <span>₱{lostPenaltyFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 pb-2 border-b border-slate-700">
                    <span>Authorized e-Payment Convenience Fee</span>
                    <span>₱{convenienceFee}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>Total Official DFA Fee</span>
                    <span className="text-amber-400 text-base">₱{totalFee.toLocaleString()}</span>
                  </div>
                </div>

                {/* Biometrics Dress Code & Counter-Ready Gate */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dressCodeConfirmed}
                    onChange={(e) => setDressCodeConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-amber-400 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-700 leading-relaxed">
                    <strong>Counter-Ready & Biometrics Dress Code Gate:</strong> I confirm I will
                    bring original PSA/Valid IDs and wear a collared shirt (no sleeveless tops,
                    colored contact lenses, or facial piercings/earrings during photo capture).
                  </span>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
            >
              <span>
                {submitting
                  ? 'Processing Consular Slot...'
                  : reschedulingAppointmentId
                    ? 'Confirm Reschedule Slot'
                    : `Confirm DFA Passport Slot (₱${totalFee.toLocaleString()})`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Active Citizen Appointments List */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Your DFA Consular Appointments ({appointments.length})
                </h3>
              </div>
            </div>

            {appointments.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No passport appointments booked yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      apt.status === 'CANCELLED'
                        ? 'border-slate-200 bg-slate-50 opacity-60'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-blue-700">{apt.referenceCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          apt.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'RESCHEDULED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 mt-1">{apt.siteName}</p>
                    <p className="text-slate-600 mt-0.5">
                      {apt.date} • {apt.timeWindow}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Applicant: {apt.applicantName} ({apt.applicationTypeLabel})
                    </p>

                    {apt.status !== 'CANCELLED' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReschedulingAppointmentId(apt.id);
                            setSelectedSiteCode(apt.siteCode);
                            setAppointmentDate(apt.date);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px]"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelAppointment(apt.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px]"
                        >
                          <XCircle className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
