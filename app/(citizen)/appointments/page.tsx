'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  RotateCw,
  Plus,
  ArrowLeft,
  Copy,
  Check,
  AlertTriangle,
  Receipt,
  FileCheck2,
} from 'lucide-react';
import type { Appointment, AppointmentSlot } from '@/lib/appointments/booking';
import { listAllServices } from '@/lib/services/registry';

export default function AppointmentsPage() {
  const citizenId = 'user-juan-001'; // Default active citizen
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Booking / Reschedule Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [selectedService, setSelectedService] = useState('NBI_CLEARANCE');
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const services = listAllServices();

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/appointments?citizenId=${citizenId}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSlots = async (svcCode: string, date: string) => {
    try {
      const res = await fetch(`/api/appointments/slots?serviceCode=${svcCode}&date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      loadSlots(selectedService, selectedDate);
    }
  }, [isModalOpen, selectedService, selectedDate]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenBookModal = () => {
    setReschedulingAppointment(null);
    setSelectedSlotId(null);
    setIsModalOpen(true);
  };

  const handleOpenRescheduleModal = (apt: Appointment) => {
    setReschedulingAppointment(apt);
    setSelectedService(apt.serviceCode);
    setSelectedSlotId(null);
    setIsModalOpen(true);
  };

  const handleConfirmSlotSelection = async () => {
    if (!selectedSlotId) return;
    setIsBooking(true);

    try {
      if (reschedulingAppointment) {
        // Reschedule
        const res = await fetch(`/api/appointments/${reschedulingAppointment.id}/reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            citizenId,
            newSlotId: selectedSlotId,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Nabigo ang pag-reschedule.');

        setToastMessage('Matagumpay na nai-reschedule ang iyong appointment!');
      } else {
        // New booking
        const res = await fetch('/api/appointments/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slotId: selectedSlotId,
            citizenId,
            serviceCode: selectedService,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Nabigo ang pag-book ng appointment.');

        setToastMessage('Matagumpay na nakumpirma ang iyong appointment!');
      }

      setIsModalOpen(false);
      loadAppointments();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error in booking';
      alert(msg);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelAppointment = async (aptId: string) => {
    if (!confirm('Sigurado ka bang nais mong kanselahin ang appointment na ito?')) return;

    try {
      const res = await fetch(`/api/appointments/${aptId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citizenId, reason: 'Citizen requested cancellation' }),
      });

      if (res.ok) {
        setToastMessage('Matagumpay na nakansela ang appointment.');
        loadAppointments();
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Bumalik sa mga Serbisyo</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              Aking mga Appointment
            </h1>
            <p className="text-xs text-slate-500">
              Pamahalaan ang iyong opisyal na schedule sa counter upang walang sayang na pila.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenBookModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Bagong Appointment</span>
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-center text-xs font-bold text-emerald-800 animate-in fade-in-50">
            {toastMessage}
          </div>
        )}

        {/* Appointments List */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Kinukuha ang talaan ng mga appointment...
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-4 shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Wala Kang Aktibong Appointment</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Pumili ng ahensya at petsa upang magkaroon ng nakareserbang oras sa counter at
                makaiwas sa balik-pila.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenBookModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Mag-book Ngayon</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => {
              const dateObj = new Date(apt.slotTime);
              const formattedDate = dateObj.toLocaleDateString('fil-PH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString('fil-PH', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const isCancelled = apt.status === 'cancelled';

              return (
                <div
                  key={apt.id}
                  className={`rounded-3xl border bg-white p-5 shadow-xs transition-all space-y-4 ${
                    isCancelled ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        {apt.agencyName}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 sm:text-base">{apt.serviceName}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          apt.status === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : apt.status === 'rescheduled'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600 line-through'
                        }`}
                      >
                        {apt.status === 'confirmed'
                          ? 'Kumpirmado'
                          : apt.status === 'rescheduled'
                            ? 'Nai-reschedule'
                            : 'Nakansela'}
                      </span>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Araw ng Appointment:</span>
                        <span className="font-semibold">{formattedDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div>
                        <span className="text-[10px] text-slate-400 block">Oras ng Counter:</span>
                        <span className="font-semibold">{formattedTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reference Code */}
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Appointment Reference Code:</span>
                      <span className="font-mono font-bold text-slate-900 tracking-wider">
                        {apt.referenceCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(apt.referenceCode, apt.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
                      title="Kopyahin"
                    >
                      {copiedId === apt.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Action Buttons if active */}
                  {!isCancelled && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Kanselahin
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRescheduleModal(apt)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>I-reschedule</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Slot Booking / Reschedule Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {reschedulingAppointment ? 'Pumili ng Bagong Schedule' : 'Mag-book ng Appointment Slot'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Service Select (only if not rescheduling) */}
              {!reschedulingAppointment && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Ahensya at Serbisyo:</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                  >
                    {services.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.agencyCode} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Select */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Petsa (Date):</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              {/* Hourly Slot Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Pumili ng Oras (Available Slots):
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {availableSlots.map((slot) => {
                    const time = new Date(slot.slotTime).toLocaleTimeString('fil-PH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isFull = slot.availableCount <= 0;
                    const isSelected = selectedSlotId === slot.id;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`rounded-2xl border p-2.5 text-left text-xs transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                            : isFull
                              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{time}</span>
                          <span
                            className={`text-[9px] font-bold rounded-full px-1.5 py-0.2 ${
                              isFull
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isFull ? 'Puno' : `${slot.availableCount} slot`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Kanselahin
                </button>
                <button
                  type="button"
                  disabled={!selectedSlotId || isBooking}
                  onClick={handleConfirmSlotSelection}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isBooking ? 'Isinasagawa...' : 'Kumpirmahin'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
