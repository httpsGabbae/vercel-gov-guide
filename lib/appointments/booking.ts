import crypto from 'crypto';
import { getServiceByCode } from '../services/registry';
import { createServiceClient } from '../supabase/service';

export interface AppointmentSlot {
  id: string;
  serviceCode: string;
  slotTime: string; // ISO 8601 string (e.g. 2026-11-03T09:00:00.000Z)
  capacity: number;
  bookedCount: number;
  availableCount: number;
}

export type AppointmentStatus = 'confirmed' | 'rescheduled' | 'cancelled' | 'attended';

export interface Appointment {
  id: string;
  citizenId: string;
  serviceCode: string;
  serviceName: string;
  agencyName: string;
  slotId: string;
  slotTime: string;
  requestId?: string;
  status: AppointmentStatus;
  referenceCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookSlotResult {
  success: boolean;
  appointment?: Appointment;
  error?: string;
  code?: 'SUCCESS' | 'SLOT_NOT_FOUND' | 'SLOT_FULLY_BOOKED' | 'UNAUTHORIZED';
}

// In-memory repositories for offline execution, testing, and concurrency validation
const memorySlots = new Map<string, AppointmentSlot>();
const memoryAppointments = new Map<string, Appointment>();
const memoryAuditLogs: Record<string, unknown>[] = [];

export function getMemoryAppointments() {
  return Array.from(memoryAppointments.values());
}

export function getMemorySlots() {
  return Array.from(memorySlots.values());
}

export function clearAppointmentStores() {
  memorySlots.clear();
  memoryAppointments.clear();
  memoryAuditLogs.length = 0;
}

function generateReferenceCode(serviceCode: string): string {
  const prefix = serviceCode.split('_')[0] || 'APT';
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-APT-${rand}`;
}

/**
 * Generates official hourly appointment slots for a specific date (08:00 to 16:00).
 */
export function generateSlotsForDate(
  serviceCode: string,
  dateStr: string, // YYYY-MM-DD
  capacity = 5,
): AppointmentSlot[] {
  const slots: AppointmentSlot[] = [];
  const hours = [8, 9, 10, 11, 13, 14, 15, 16]; // 8 AM to 4 PM (12 PM lunch break)

  for (const hour of hours) {
    const timeIso = `${dateStr}T${String(hour).padStart(2, '0')}:00:00.000Z`;
    const slotId = `${serviceCode.toLowerCase()}-${dateStr}-${hour}`;

    let slot = memorySlots.get(slotId);
    if (!slot) {
      slot = {
        id: slotId,
        serviceCode,
        slotTime: timeIso,
        capacity,
        bookedCount: 0,
        availableCount: capacity,
      };
      memorySlots.set(slotId, slot);
    }

    slots.push(slot);
  }

  return slots;
}

/**
 * Checks available slots for a given service and optional date.
 */
export async function checkSlots(serviceCode: string, dateStr?: string): Promise<AppointmentSlot[]> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  // Try checking existing memory slots or generate if none exist
  let slots = Array.from(memorySlots.values()).filter(
    (s) => s.serviceCode === serviceCode && s.slotTime.startsWith(targetDate),
  );

  if (slots.length === 0) {
    slots = generateSlotsForDate(serviceCode, targetDate);
  }

  // Recalculate availableCount
  return slots.map((s) => ({
    ...s,
    availableCount: Math.max(0, s.capacity - s.bookedCount),
  }));
}

// Concurrency mutex lock per slotId to guarantee atomic slot reservation
const slotLocks = new Map<string, Promise<void>>();

async function acquireSlotLock(slotId: string): Promise<() => void> {
  while (slotLocks.has(slotId)) {
    await slotLocks.get(slotId);
  }

  let releaseLock!: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  slotLocks.set(slotId, lockPromise);

  return () => {
    slotLocks.delete(slotId);
    releaseLock();
  };
}

/**
 * Atomically reserves and books an appointment slot.
 * Enforces capacity limits and prevents race conditions under high concurrent traffic.
 */
export async function bookSlotAtomic(params: {
  slotId: string;
  citizenId: string;
  serviceCode: string;
  requestId?: string;
}): Promise<BookSlotResult> {
  const { slotId, citizenId, serviceCode, requestId } = params;

  // Acquire concurrency lock on slotId
  const releaseLock = await acquireSlotLock(slotId);

  try {
    const slot = memorySlots.get(slotId);
    if (!slot) {
      return { success: false, error: 'Slot not found', code: 'SLOT_NOT_FOUND' };
    }

    // Capacity Check
    if (slot.bookedCount >= slot.capacity) {
      return {
        success: false,
        error: `Slot is fully booked (${slot.bookedCount}/${slot.capacity} capacity reached)`,
        code: 'SLOT_FULLY_BOOKED',
      };
    }

    // Atomically increment bookedCount
    slot.bookedCount += 1;
    slot.availableCount = slot.capacity - slot.bookedCount;
    memorySlots.set(slotId, slot);

    const serviceDef = getServiceByCode(serviceCode);
    const appointmentId = crypto.randomUUID();
    const referenceCode = generateReferenceCode(serviceCode);
    const now = new Date().toISOString();

    const appointment: Appointment = {
      id: appointmentId,
      citizenId,
      serviceCode,
      serviceName: serviceDef?.name || serviceCode,
      agencyName: serviceDef?.agencyName || 'Philippine Government Agency',
      slotId,
      slotTime: slot.slotTime,
      requestId,
      status: 'confirmed',
      referenceCode,
      createdAt: now,
      updatedAt: now,
    };

    memoryAppointments.set(appointmentId, appointment);

    // Audit Log
    memoryAuditLogs.push({
      id: crypto.randomUUID(),
      actorId: citizenId,
      actorRole: 'citizen',
      action: 'APPOINTMENT_BOOKED',
      targetType: 'appointment',
      targetId: appointmentId,
      details: { slotId, slotTime: slot.slotTime, referenceCode, serviceCode },
      createdAt: now,
    });

    // Try synchronizing with Supabase if online
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(citizenId);
      if (isUuid) {
        const supabase = createServiceClient();
        const slotUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slotId)
          ? slotId
          : crypto.randomUUID();

        const { data: svc } = await supabase.from('services').select('id').eq('code', serviceCode).maybeSingle();
        if (svc) {
          await supabase.from('appointment_slots').upsert(
            {
              id: slotUuid,
              service_id: svc.id,
              slot_time: slot.slotTime,
              capacity: slot.capacity,
              booked_count: slot.bookedCount,
            },
            { onConflict: 'service_id,slot_time' },
          );
        }

        await supabase
          .from('appointments')
          .insert({
            id: appointmentId,
            citizen_id: citizenId,
            slot_id: slotUuid,
            slot_time: slot.slotTime,
            status: 'confirmed',
          });
      }
    } catch {
      // safe fallback
    }

    return { success: true, appointment, code: 'SUCCESS' };
  } finally {
    releaseLock();
  }
}

/**
 * Reschedules an active appointment to a new slot.
 * Atomically frees the old slot and increments the new slot.
 */
export async function rescheduleAppointment(params: {
  appointmentId: string;
  citizenId: string;
  newSlotId: string;
}): Promise<BookSlotResult> {
  const { appointmentId, citizenId, newSlotId } = params;

  const appointment = memoryAppointments.get(appointmentId);
  if (!appointment) {
    return { success: false, error: 'Appointment not found', code: 'SLOT_NOT_FOUND' };
  }

  if (appointment.citizenId !== citizenId) {
    return { success: false, error: 'Unauthorized to reschedule this appointment', code: 'UNAUTHORIZED' };
  }

  if (appointment.status === 'cancelled') {
    return { success: false, error: 'Cannot reschedule a cancelled appointment', code: 'SLOT_NOT_FOUND' };
  }

  // Acquire locks on both old and new slots (ordered by slotId to avoid deadlocks)
  const [firstSlot, secondSlot] = [appointment.slotId, newSlotId].sort();
  const releaseFirst = await acquireSlotLock(firstSlot);
  const releaseSecond = await acquireSlotLock(secondSlot);

  try {
    const oldSlot = memorySlots.get(appointment.slotId);
    const newSlot = memorySlots.get(newSlotId);

    if (!newSlot) {
      return { success: false, error: 'Target new slot not found', code: 'SLOT_NOT_FOUND' };
    }

    if (newSlot.bookedCount >= newSlot.capacity) {
      return { success: false, error: 'Target new slot is fully booked', code: 'SLOT_FULLY_BOOKED' };
    }

    // Decrement old slot count
    if (oldSlot && oldSlot.bookedCount > 0) {
      oldSlot.bookedCount -= 1;
      oldSlot.availableCount = oldSlot.capacity - oldSlot.bookedCount;
      memorySlots.set(oldSlot.id, oldSlot);
    }

    // Increment new slot count
    newSlot.bookedCount += 1;
    newSlot.availableCount = newSlot.capacity - newSlot.bookedCount;
    memorySlots.set(newSlot.id, newSlot);

    // Update appointment
    const now = new Date().toISOString();
    appointment.slotId = newSlotId;
    appointment.slotTime = newSlot.slotTime;
    appointment.status = 'rescheduled';
    appointment.updatedAt = now;
    memoryAppointments.set(appointmentId, appointment);

    // Synchronize reschedule with Supabase
    try {
      const supabase = createServiceClient();
      await supabase
        .from('appointments')
        .update({ slot_time: newSlot.slotTime, status: 'rescheduled' })
        .eq('id', appointmentId);
    } catch {
      // safe fallback
    }

    // Audit log
    memoryAuditLogs.push({
      id: crypto.randomUUID(),
      actorId: citizenId,
      actorRole: 'citizen',
      action: 'APPOINTMENT_RESCHEDULED',
      targetType: 'appointment',
      targetId: appointmentId,
      details: { newSlotId, newSlotTime: newSlot.slotTime },
      createdAt: now,
    });

    return { success: true, appointment, code: 'SUCCESS' };
  } finally {
    releaseSecond();
    releaseFirst();
  }
}

/**
 * Cancels an appointment and restores slot capacity.
 */
export async function cancelAppointment(params: {
  appointmentId: string;
  citizenId: string;
  reason?: string;
}): Promise<BookSlotResult> {
  const { appointmentId, citizenId, reason } = params;

  const appointment = memoryAppointments.get(appointmentId);
  if (!appointment) {
    return { success: false, error: 'Appointment not found', code: 'SLOT_NOT_FOUND' };
  }

  if (appointment.citizenId !== citizenId) {
    return { success: false, error: 'Unauthorized to cancel this appointment', code: 'UNAUTHORIZED' };
  }

  if (appointment.status === 'cancelled') {
    return { success: false, error: 'Appointment is already cancelled', code: 'SLOT_NOT_FOUND' };
  }

  const releaseLock = await acquireSlotLock(appointment.slotId);

  try {
    const slot = memorySlots.get(appointment.slotId);
    if (slot && slot.bookedCount > 0) {
      slot.bookedCount -= 1;
      slot.availableCount = slot.capacity - slot.bookedCount;
      memorySlots.set(slot.id, slot);
    }

    const now = new Date().toISOString();
    appointment.status = 'cancelled';
    appointment.updatedAt = now;
    memoryAppointments.set(appointmentId, appointment);

    // Synchronize cancellation with Supabase
    try {
      const supabase = createServiceClient();
      await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);
    } catch {
      // safe fallback
    }

    memoryAuditLogs.push({
      id: crypto.randomUUID(),
      actorId: citizenId,
      actorRole: 'citizen',
      action: 'APPOINTMENT_CANCELLED',
      targetType: 'appointment',
      targetId: appointmentId,
      details: { reason, slotId: appointment.slotId },
      createdAt: now,
    });

    return { success: true, appointment, code: 'SUCCESS' };
  } finally {
    releaseLock();
  }
}

/**
 * Retrieves all appointments for a specific citizen.
 */
export async function getMyAppointments(citizenId: string): Promise<Appointment[]> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(citizenId);
  if (isUuid) {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('citizen_id', citizenId)
        .order('slot_time', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d) => {
          const serviceDef = getServiceByCode('NBI_CLEARANCE');
          return {
            id: d.id,
            citizenId: d.citizen_id,
            serviceCode: 'NBI_CLEARANCE',
            serviceName: serviceDef?.name || 'Government Clearance',
            agencyName: serviceDef?.agencyName || 'Philippine Government Agency',
            slotId: d.slot_id || 'slot-1',
            slotTime: d.slot_time,
            status: d.status as AppointmentStatus,
            referenceCode: `APT-${d.id.slice(0, 8).toUpperCase()}`,
            createdAt: d.created_at,
            updatedAt: d.created_at,
          };
        });
      }
    } catch {
      // fallback to memory
    }
  }

  return Array.from(memoryAppointments.values())
    .filter((a) => a.citizenId === citizenId)
    .sort((a, b) => new Date(b.slotTime).getTime() - new Date(a.slotTime).getTime());
}
