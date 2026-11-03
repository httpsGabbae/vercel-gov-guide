import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSlotsForDate,
  checkSlots,
  bookSlotAtomic,
  rescheduleAppointment,
  cancelAppointment,
  getMyAppointments,
  clearAppointmentStores,
  getMemorySlots,
  getMemoryAppointments,
} from '../lib/appointments/booking';

describe('M6 Appointments & Concurrency Stress Tests', () => {
  beforeEach(() => {
    clearAppointmentStores();
  });

  const TEST_DATE = '2026-11-05';
  const SERVICE_CODE = 'NBI_CLEARANCE';

  describe('Slot Generation & Availability Checking', () => {
    it('generates 8 hourly slots for the business day with specified capacity', async () => {
      const slots = generateSlotsForDate(SERVICE_CODE, TEST_DATE, 5);

      expect(slots.length).toBe(8);
      expect(slots[0].capacity).toBe(5);
      expect(slots[0].bookedCount).toBe(0);
      expect(slots[0].availableCount).toBe(5);
      expect(slots[0].slotTime).toContain(`${TEST_DATE}T08:00:00`);
    });

    it('correctly reports available slots when checking', async () => {
      const slots = await checkSlots(SERVICE_CODE, TEST_DATE);
      expect(slots.length).toBe(8);
      expect(slots.every((s) => s.availableCount > 0)).toBe(true);
    });
  });

  describe('Atomic Concurrency Stress Test: 10 Concurrent Bookings on Capacity 3', () => {
    it('guarantees atomic locking, allows exactly 3 bookings, rejects 7, and prevents race conditions', async () => {
      // 1. Generate slots with strict capacity = 3
      const slots = generateSlotsForDate(SERVICE_CODE, TEST_DATE, 3);
      const targetSlot = slots[0]; // 8:00 AM slot
      expect(targetSlot.capacity).toBe(3);

      // 2. Simulate 10 simultaneous citizen booking attempts via Promise.all
      const attempts = Array.from({ length: 10 }, (_, i) => ({
        slotId: targetSlot.id,
        citizenId: `citizen-stress-${i + 1}`,
        serviceCode: SERVICE_CODE,
      }));

      const results = await Promise.all(attempts.map((params) => bookSlotAtomic(params)));

      // 3. Verify exactly 3 succeeded and 7 failed with SLOT_FULLY_BOOKED
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      expect(successful.length).toBe(3);
      expect(failed.length).toBe(7);

      failed.forEach((f) => {
        expect(f.code).toBe('SLOT_FULLY_BOOKED');
        expect(f.error).toContain('capacity reached');
      });

      // 4. Verify slot state in repository
      const finalSlots = getMemorySlots();
      const updatedSlot = finalSlots.find((s) => s.id === targetSlot.id);
      expect(updatedSlot).toBeDefined();
      expect(updatedSlot?.bookedCount).toBe(3);
      expect(updatedSlot?.availableCount).toBe(0);

      // 5. Verify total appointments created
      const allAppointments = getMemoryAppointments();
      expect(allAppointments.length).toBe(3);
    });
  });

  describe('Reschedule Flow & Capacity Consistency', () => {
    it('atomically decrements old slot and increments new slot when rescheduled', async () => {
      const slots = generateSlotsForDate(SERVICE_CODE, TEST_DATE, 2);
      const slotA = slots[0];
      const slotB = slots[1];

      // Citizen 1 books Slot A
      const bookRes = await bookSlotAtomic({
        slotId: slotA.id,
        citizenId: 'citizen-reschedule-001',
        serviceCode: SERVICE_CODE,
      });

      expect(bookRes.success).toBe(true);
      expect(slotA.bookedCount).toBe(1);
      expect(slotB.bookedCount).toBe(0);

      // Reschedule to Slot B
      const rescheduleRes = await rescheduleAppointment({
        appointmentId: bookRes.appointment!.id,
        citizenId: 'citizen-reschedule-001',
        newSlotId: slotB.id,
      });

      expect(rescheduleRes.success).toBe(true);
      expect(rescheduleRes.appointment?.status).toBe('rescheduled');
      expect(rescheduleRes.appointment?.slotId).toBe(slotB.id);

      // Verify Slot A was decremented back to 0 and Slot B was incremented to 1
      expect(slotA.bookedCount).toBe(0);
      expect(slotA.availableCount).toBe(2);
      expect(slotB.bookedCount).toBe(1);
      expect(slotB.availableCount).toBe(1);
    });

    it('rejects rescheduling to a slot that is already fully booked', async () => {
      const slots = generateSlotsForDate(SERVICE_CODE, TEST_DATE, 1);
      const slotA = slots[0];
      const slotB = slots[1];

      // Citizen 1 books Slot A
      const book1 = await bookSlotAtomic({
        slotId: slotA.id,
        citizenId: 'citizen-001',
        serviceCode: SERVICE_CODE,
      });

      // Citizen 2 books Slot B (filling it up to capacity 1)
      await bookSlotAtomic({
        slotId: slotB.id,
        citizenId: 'citizen-002',
        serviceCode: SERVICE_CODE,
      });

      expect(slotB.bookedCount).toBe(1);

      // Citizen 1 attempts to reschedule to full Slot B -> Fails
      const res = await rescheduleAppointment({
        appointmentId: book1.appointment!.id,
        citizenId: 'citizen-001',
        newSlotId: slotB.id,
      });

      expect(res.success).toBe(false);
      expect(res.code).toBe('SLOT_FULLY_BOOKED');
      expect(slotA.bookedCount).toBe(1); // Slot A untouched
    });
  });

  describe('Cancellation Flow & Slot Restoration', () => {
    it('restores available capacity when an appointment is cancelled', async () => {
      const slots = generateSlotsForDate(SERVICE_CODE, TEST_DATE, 1);
      const slot = slots[0];

      const book = await bookSlotAtomic({
        slotId: slot.id,
        citizenId: 'citizen-cancel-001',
        serviceCode: SERVICE_CODE,
      });

      expect(slot.bookedCount).toBe(1);
      expect(slot.availableCount).toBe(0);

      const cancelRes = await cancelAppointment({
        appointmentId: book.appointment!.id,
        citizenId: 'citizen-cancel-001',
        reason: 'Change of schedule',
      });

      expect(cancelRes.success).toBe(true);
      expect(cancelRes.appointment?.status).toBe('cancelled');
      expect(slot.bookedCount).toBe(0);
      expect(slot.availableCount).toBe(1);
    });
  });

  describe('Security & Authorization Isolation', () => {
    it('prevents a citizen from cancelling or rescheduling another citizen appointment', async () => {
      const slots = generateSlotsForDate(SERVICE_CODE, TEST_DATE, 2);
      const slotA = slots[0];
      const slotB = slots[1];

      const book = await bookSlotAtomic({
        slotId: slotA.id,
        citizenId: 'legit-citizen-001',
        serviceCode: SERVICE_CODE,
      });

      // Rogue citizen attempts to cancel
      const cancelRes = await cancelAppointment({
        appointmentId: book.appointment!.id,
        citizenId: 'malicious-citizen-999',
      });

      expect(cancelRes.success).toBe(false);
      expect(cancelRes.code).toBe('UNAUTHORIZED');

      // Rogue citizen attempts to reschedule
      const reschedRes = await rescheduleAppointment({
        appointmentId: book.appointment!.id,
        citizenId: 'malicious-citizen-999',
        newSlotId: slotB.id,
      });

      expect(reschedRes.success).toBe(false);
      expect(reschedRes.code).toBe('UNAUTHORIZED');
    });

    it('retrieves only the authenticated citizen appointments in my-appointments', async () => {
      const slots = generateSlotsForDate(SERVICE_CODE, TEST_DATE, 5);

      await bookSlotAtomic({
        slotId: slots[0].id,
        citizenId: 'citizen-juan',
        serviceCode: SERVICE_CODE,
      });
      await bookSlotAtomic({
        slotId: slots[1].id,
        citizenId: 'citizen-juan',
        serviceCode: SERVICE_CODE,
      });
      await bookSlotAtomic({
        slotId: slots[2].id,
        citizenId: 'citizen-maria',
        serviceCode: SERVICE_CODE,
      });

      const juanAppointments = await getMyAppointments('citizen-juan');
      const mariaAppointments = await getMyAppointments('citizen-maria');

      expect(juanAppointments.length).toBe(2);
      expect(mariaAppointments.length).toBe(1);
      expect(juanAppointments.every((a) => a.citizenId === 'citizen-juan')).toBe(true);
    });
  });
});
