export type DfaIslandFilter = 'NCR' | 'Luzon' | 'Visayas' | 'Mindanao';

export type DfaApplicationType =
  | 'NEW_ADULT'
  | 'RENEWAL_ADULT'
  | 'MINOR_NEW_RENEWAL'
  | 'LOST_VALID';

export type DfaProcessingSpeed = 'REGULAR' | 'EXPEDITED';

export interface DfaConsularOffice {
  code: string;
  name: string;
  islandGroup: DfaIslandFilter;
  region: string;
  city: string;
  address: string;
  dailyCapacity: number;
  courtesyLaneAvailable: boolean;
  operatingHours: string;
}

export interface DfaTimeSlot {
  id: string;
  siteCode: string;
  date: string; // YYYY-MM-DD
  timeWindow: string; // e.g. "09:00 AM - 10:00 AM"
  hour24: number;
  capacity: number;
  bookedCount: number;
  availableCount: number;
}

export interface DfaApplicationCategoryInfo {
  type: DfaApplicationType;
  label: string;
  description: string;
  penaltyFeePhp: number;
  clearingDaysNote?: string;
  requirements: {
    name: string;
    detail: string;
    mandatory: boolean;
  }[];
}

export interface DfaAppointmentBooking {
  id: string;
  referenceCode: string; // e.g., DFA-2026-ASEANA-9A4F12
  citizenId: string;
  applicantName: string;
  birthDate: string;
  email: string;
  phone: string;
  siteCode: string;
  siteName: string;
  siteAddress: string;
  slotId: string;
  date: string;
  timeWindow: string;
  applicationType: DfaApplicationType;
  applicationTypeLabel: string;
  processingSpeed: DfaProcessingSpeed;
  baseFeePhp: number;
  convenienceFeePhp: number;
  penaltyFeePhp: number;
  totalFeePhp: number;
  estimatedReleaseDays: string;
  primaryIdPresented: string;
  status: 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED';
  dressCodeAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DFA_CONSULAR_OFFICES: DfaConsularOffice[] = [
  {
    code: 'DFA-ASEANA',
    name: 'DFA OCA Aseana (Main Consular Office)',
    islandGroup: 'NCR',
    region: 'NCR (Metro Manila)',
    city: 'Parañaque City',
    address: 'ASEANA Business Park, Bradco Ave. cor. Macapagal Blvd., Parañaque City',
    dailyCapacity: 120,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Fri · 08:00 AM – 05:00 PM',
  },
  {
    code: 'DFA-MEGAMALL',
    name: 'DFA CO NCR East (SM Megamall)',
    islandGroup: 'NCR',
    region: 'NCR (Metro Manila)',
    city: 'Mandaluyong City',
    address: '7th Floor, Building C, SM Megamall, EDSA, Mandaluyong City',
    dailyCapacity: 80,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Sat · 10:00 AM – 06:00 PM',
  },
  {
    code: 'DFA-NORTH',
    name: 'DFA CO NCR North (Robinsons Novaliches)',
    islandGroup: 'NCR',
    region: 'NCR (Metro Manila)',
    city: 'Quezon City',
    address: '3rd Level, Lingkod Pinoy Center, Robinsons Place Novaliches, Quirino Hwy, QC',
    dailyCapacity: 70,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Sat · 09:00 AM – 05:00 PM',
  },
  {
    code: 'DFA-PAMPANGA',
    name: 'DFA CO San Fernando, Pampanga',
    islandGroup: 'Luzon',
    region: 'Region III (Central Luzon)',
    city: 'City of San Fernando',
    address: '2nd Level, Robinsons Starmills, Jose Abad Santos Ave., San Fernando, Pampanga',
    dailyCapacity: 75,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Fri · 09:00 AM – 05:00 PM',
  },
  {
    code: 'DFA-BAGUIO',
    name: 'DFA CO Baguio (Cordillera)',
    islandGroup: 'Luzon',
    region: 'CAR (Cordillera)',
    city: 'Baguio City',
    address: 'Upper Basement, SM City Baguio, Luneta Hill, Baguio City',
    dailyCapacity: 60,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Sat · 09:00 AM – 05:00 PM',
  },
  {
    code: 'DFA-CALAMBA',
    name: 'DFA CO Calamba (CALABARZON)',
    islandGroup: 'Luzon',
    region: 'Region IV-A (CALABARZON)',
    city: 'Calamba City, Laguna',
    address: '3rd Floor, SM City Calamba, National Rd., Brgy. Real, Calamba, Laguna',
    dailyCapacity: 75,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Sat · 09:00 AM – 05:00 PM',
  },
  {
    code: 'DFA-CEBU',
    name: 'DFA CO Cebu (Pacific Mall Mandaue)',
    islandGroup: 'Visayas',
    region: 'Region VII (Central Visayas)',
    city: 'Mandaue City, Cebu',
    address: '4th Floor, Pacific Mall Metro Mandaue, UN Ave. cor. MC Briones St., Mandaue City',
    dailyCapacity: 90,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Fri · 08:30 AM – 05:00 PM',
  },
  {
    code: 'DFA-ILOILO',
    name: 'DFA CO Iloilo (Western Visayas)',
    islandGroup: 'Visayas',
    region: 'Region VI (Western Visayas)',
    city: 'Iloilo City',
    address: '3rd Level, Robinsons Place Iloilo, Quezon Wing, Ledesma St., Iloilo City',
    dailyCapacity: 65,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Fri · 09:00 AM – 05:00 PM',
  },
  {
    code: 'DFA-DAVAO',
    name: 'DFA CO Davao (SM City Davao)',
    islandGroup: 'Mindanao',
    region: 'Region XI (Davao Region)',
    city: 'Davao City',
    address: '3rd Floor, SM City Davao, Quimpo Blvd., Ecoland, Matina, Davao City',
    dailyCapacity: 85,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Fri · 09:00 AM – 05:00 PM',
  },
  {
    code: 'DFA-CDO',
    name: 'DFA CO Cagayan de Oro (Northern Mindanao)',
    islandGroup: 'Mindanao',
    region: 'Region X (Northern Mindanao)',
    city: 'Cagayan de Oro City',
    address: '3rd Floor, BPO Tower, Centrio Mall, Corrales Ave., Cagayan de Oro City',
    dailyCapacity: 70,
    courtesyLaneAvailable: true,
    operatingHours: 'Mon–Fri · 09:00 AM – 05:00 PM',
  },
];

export const DFA_APPLICATION_CATEGORIES: Record<DfaApplicationType, DfaApplicationCategoryInfo> = {
  NEW_ADULT: {
    type: 'NEW_ADULT',
    label: 'Adult New Application (First-Time ePassport)',
    description: 'For Filipino citizens aged 18 and above applying for a Philippine ePassport for the first time.',
    penaltyFeePhp: 0,
    requirements: [
      {
        name: 'Confirmed Online Appointment Slip & Application Form',
        detail: 'Printed on A4 bond paper with barcode intact.',
        mandatory: true,
      },
      {
        name: 'Original PSA Birth Certificate on Security Paper (SECPA)',
        detail: 'Plus 1 clear photocopy. Local Civil Registrar (LCR) copy required if PSA copy is blurred.',
        mandatory: true,
      },
      {
        name: 'One (1) Valid Primary Government Photo ID',
        detail: 'PhilSys National ID / ePhilID, Driver’s License, UMID, PRC ID, or Voter’s Certification.',
        mandatory: true,
      },
      {
        name: 'Original PSA Marriage Certificate on SECPA (If Married Female)',
        detail: 'Required only for married female applicants opting to adopt their husband’s surname.',
        mandatory: false,
      },
    ],
  },
  RENEWAL_ADULT: {
    type: 'RENEWAL_ADULT',
    label: 'Adult ePassport Renewal',
    description: 'For adults renewing an existing or expiring Philippine ePassport with no contested identity changes.',
    penaltyFeePhp: 0,
    requirements: [
      {
        name: 'Confirmed Online Appointment Slip & Renewal Form',
        detail: 'Printed on A4 bond paper.',
        mandatory: true,
      },
      {
        name: 'Current / Expiring Original ePassport',
        detail: 'Plus 1 photocopy of the Passport Data Page (Page 2).',
        mandatory: true,
      },
      {
        name: 'Supporting PSA Document (Only for Name / Civil Status Change)',
        detail: 'Original PSA Marriage Certificate or Annotated Birth/Marriage Certificate if changing surname.',
        mandatory: false,
      },
    ],
  },
  MINOR_NEW_RENEWAL: {
    type: 'MINOR_NEW_RENEWAL',
    label: 'Minor Applicant (Below 18 Years Old)',
    description: 'New or renewal passport application for children accompanied by a parent or legal guardian.',
    penaltyFeePhp: 0,
    requirements: [
      {
        name: 'Personal Appearance of Minor + Either Parent',
        detail: 'Mother only if minor is illegitimate; either parent if legitimate.',
        mandatory: true,
      },
      {
        name: 'Original PSA Birth Certificate of Minor (SECPA)',
        detail: 'Issued by the Philippine Statistics Authority plus 1 photocopy.',
        mandatory: true,
      },
      {
        name: 'Valid Passport or Primary Government ID of Accompanying Parent',
        detail: 'Original and photocopy showing parent’s full name and signature.',
        mandatory: true,
      },
      {
        name: 'School ID or Form 137 (For Enrolled Minors)',
        detail: 'If minor is 8–17 years old, present valid School ID or Certificate of Enrollment.',
        mandatory: false,
      },
    ],
  },
  LOST_VALID: {
    type: 'LOST_VALID',
    label: 'Lost or Damaged Valid ePassport Replacement',
    description: ' Treated as a new application subject to a mandatory 15-working-day verification clearing period.',
    penaltyFeePhp: 350,
    clearingDaysNote: 'Includes +₱350.00 Lost/Mutilated Penalty Fee & 15-working-day DFA clearing verification.',
    requirements: [
      {
        name: 'Original Police Report (in English)',
        detail: 'Required if the lost passport is still unexpired/valid.',
        mandatory: true,
      },
      {
        name: 'Notarized Affidavit of Loss',
        detail: 'Detailing exact date, place, and circumstances of loss.',
        mandatory: true,
      },
      {
        name: 'Original PSA Birth Certificate (SECPA) & 1 Valid Primary ID',
        detail: 'Lost valid passport replacements undergo full identity re-verification.',
        mandatory: true,
      },
    ],
  },
};

const TIME_WINDOWS: { hour24: number; label: string }[] = [
  { hour24: 8, label: '08:00 AM – 09:00 AM' },
  { hour24: 9, label: '09:00 AM – 10:00 AM' },
  { hour24: 10, label: '10:00 AM – 11:00 AM' },
  { hour24: 11, label: '11:00 AM – 12:00 PM' },
  { hour24: 13, label: '01:00 PM – 02:00 PM' },
  { hour24: 14, label: '02:00 PM – 03:00 PM' },
  { hour24: 15, label: '03:00 PM – 04:00 PM' },
  { hour24: 16, label: '04:00 PM – 05:00 PM' },
];

const memoryDfaSlots = new Map<string, DfaTimeSlot>();
const memoryDfaBookings = new Map<string, DfaAppointmentBooking>();

export function getDfaSlotsForSiteAndDate(
  siteCode: string,
  dateStr: string,
  capacityPerHour = 12,
): DfaTimeSlot[] {
  const slots: DfaTimeSlot[] = [];

  for (const tw of TIME_WINDOWS) {
    const slotId = `${siteCode.toLowerCase()}-${dateStr}-${tw.hour24}`;
    let slot = memoryDfaSlots.get(slotId);
    if (!slot) {
      // Deterministic initial booked count so UI looks realistic (between 2 and 7 booked)
      const hash = slotId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const seededBooked = hash % 6;
      slot = {
        id: slotId,
        siteCode,
        date: dateStr,
        timeWindow: tw.label,
        hour24: tw.hour24,
        capacity: capacityPerHour,
        bookedCount: seededBooked,
        availableCount: Math.max(0, capacityPerHour - seededBooked),
      };
      memoryDfaSlots.set(slotId, slot);
    } else {
      slot.availableCount = Math.max(0, slot.capacity - slot.bookedCount);
    }
    slots.push(slot);
  }

  return slots;
}

export function calculateDfaFees(
  applicationType: DfaApplicationType,
  processingSpeed: DfaProcessingSpeed,
) {
  const baseFeePhp = processingSpeed === 'EXPEDITED' ? 1200 : 950;
  const convenienceFeePhp = 50;
  const penaltyFeePhp = DFA_APPLICATION_CATEGORIES[applicationType]?.penaltyFeePhp || 0;
  const totalFeePhp = baseFeePhp + convenienceFeePhp + penaltyFeePhp;
  const estimatedReleaseDays =
    processingSpeed === 'EXPEDITED'
      ? applicationType === 'LOST_VALID'
        ? '5–7 Working Days (+15 Days Clearing)'
        : '5–7 Working Days'
      : applicationType === 'LOST_VALID'
        ? '10–12 Working Days (+15 Days Clearing)'
        : '10–12 Working Days';

  return {
    baseFeePhp,
    convenienceFeePhp,
    penaltyFeePhp,
    totalFeePhp,
    estimatedReleaseDays,
  };
}

export function createDfaAppointmentBooking(params: {
  citizenId: string;
  applicantName: string;
  birthDate: string;
  email: string;
  phone: string;
  siteCode: string;
  slotId: string;
  applicationType: DfaApplicationType;
  processingSpeed: DfaProcessingSpeed;
  primaryIdPresented: string;
  dressCodeAcknowledged: boolean;
}): DfaAppointmentBooking {
  if (!params.dressCodeAcknowledged) {
    throw new Error(
      'You must confirm the DFA Biometrics Dress Code and Counter-Ready Document Declaration before booking.',
    );
  }

  const office = DFA_CONSULAR_OFFICES.find((o) => o.code === params.siteCode);
  if (!office) {
    throw new Error(`Invalid DFA Consular Office: ${params.siteCode}`);
  }

  const slot = memoryDfaSlots.get(params.slotId);
  if (!slot) {
    throw new Error(`Selected time slot not found: ${params.slotId}`);
  }

  if (slot.bookedCount >= slot.capacity) {
    throw new Error('Selected time slot is already full. Please select another time window.');
  }

  // Reserve slot
  slot.bookedCount += 1;
  slot.availableCount = Math.max(0, slot.capacity - slot.bookedCount);

  const fees = calculateDfaFees(params.applicationType, params.processingSpeed);
  const rand = Math.floor(0x100000 + Math.random() * 0xef0000)
    .toString(16)
    .toUpperCase()
    .slice(0, 6);
  const shortSite = params.siteCode.replace('DFA-', '');
  const now = new Date().toISOString();

  const booking: DfaAppointmentBooking = {
    id: `dfa-apt-${Date.now()}-${rand}`,
    referenceCode: `DFA-2026-${shortSite}-${rand}`,
    citizenId: params.citizenId,
    applicantName: params.applicantName.trim(),
    birthDate: params.birthDate,
    email: params.email.trim(),
    phone: params.phone.trim(),
    siteCode: office.code,
    siteName: office.name,
    siteAddress: office.address,
    slotId: slot.id,
    date: slot.date,
    timeWindow: slot.timeWindow,
    applicationType: params.applicationType,
    applicationTypeLabel: DFA_APPLICATION_CATEGORIES[params.applicationType].label,
    processingSpeed: params.processingSpeed,
    ...fees,
    primaryIdPresented: params.primaryIdPresented,
    status: 'CONFIRMED',
    dressCodeAcknowledged: true,
    createdAt: now,
    updatedAt: now,
  };

  memoryDfaBookings.set(booking.id, booking);
  return booking;
}

export function rescheduleDfaAppointment(params: {
  appointmentId: string;
  newSlotId: string;
  newSiteCode?: string;
}): DfaAppointmentBooking {
  const existing = memoryDfaBookings.get(params.appointmentId);
  if (!existing) {
    throw new Error('Appointment not found.');
  }
  if (existing.status === 'CANCELLED') {
    throw new Error('Cannot reschedule a cancelled appointment.');
  }

  const newSlot = memoryDfaSlots.get(params.newSlotId);
  if (!newSlot) {
    throw new Error('New time slot not found.');
  }
  if (newSlot.bookedCount >= newSlot.capacity) {
    throw new Error('Selected new slot is already full.');
  }

  // Release old slot
  const oldSlot = memoryDfaSlots.get(existing.slotId);
  if (oldSlot && oldSlot.bookedCount > 0) {
    oldSlot.bookedCount -= 1;
    oldSlot.availableCount = Math.max(0, oldSlot.capacity - oldSlot.bookedCount);
  }

  // Reserve new slot
  newSlot.bookedCount += 1;
  newSlot.availableCount = Math.max(0, newSlot.capacity - newSlot.bookedCount);

  const targetOffice =
    DFA_CONSULAR_OFFICES.find((o) => o.code === (params.newSiteCode || newSlot.siteCode)) ||
    DFA_CONSULAR_OFFICES[0];

  existing.siteCode = targetOffice.code;
  existing.siteName = targetOffice.name;
  existing.siteAddress = targetOffice.address;
  existing.slotId = newSlot.id;
  existing.date = newSlot.date;
  existing.timeWindow = newSlot.timeWindow;
  existing.status = 'RESCHEDULED';
  existing.updatedAt = new Date().toISOString();

  return existing;
}

export function cancelDfaAppointment(appointmentId: string): DfaAppointmentBooking {
  const existing = memoryDfaBookings.get(appointmentId);
  if (!existing) {
    throw new Error('Appointment not found.');
  }

  if (existing.status !== 'CANCELLED') {
    const slot = memoryDfaSlots.get(existing.slotId);
    if (slot && slot.bookedCount > 0) {
      slot.bookedCount -= 1;
      slot.availableCount = Math.max(0, slot.capacity - slot.bookedCount);
    }
    existing.status = 'CANCELLED';
    existing.updatedAt = new Date().toISOString();
  }

  return existing;
}

export function listDfaAppointments(citizenId?: string): DfaAppointmentBooking[] {
  const all = Array.from(memoryDfaBookings.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  if (!citizenId) return all;
  return all.filter((b) => b.citizenId === citizenId);
}
