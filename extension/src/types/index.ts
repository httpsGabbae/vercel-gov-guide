/**
 * GovGuide PH Chrome Extension — Data Models & Messaging Contracts
 * Compliant with RA 10173 (Data Privacy Act of 2012)
 */

export interface CitizenVaultData {
  // Identity & Personal Information
  firstName: string;
  middleName: string;
  lastName: string;
  suffix?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string; // YYYY-MM-DD
  placeOfBirth: string;
  civilStatus: 'SINGLE' | 'MARRIED' | 'WIDOWED' | 'SEPARATED';
  nationality: string; // Default 'FILIPINO'

  // Family Background (Crucial for PSA & NBI clearances)
  fatherFullName: string;
  fatherFirstName?: string;
  fatherMiddleName?: string;
  fatherLastName?: string;
  fatherSuffix?: string;

  motherMaidenFirstName: string;
  motherMaidenMiddleName: string;
  motherMaidenLastName: string;
  motherMaidenSuffix?: string;

  // Contact Info
  mobileNumber: string; // e.g., 09171234567 or +63 917 123 4567
  emailAddress: string;
  landline?: string;

  // Address (Philippine Hierarchy)
  region: string;
  province: string;
  cityMunicipality: string;
  barangay: string;
  streetHouseNumber: string;
  zipCode: string;

  // Philippine Government Identifiers
  philsysId?: string; // National ID (PSN / ePhilID)
  tin?: string; // BIR Taxpayer Identification Number
  sssNumber?: string; // Social Security System CRN
  philhealthNumber?: string; // PhilHealth PIN
  pagibigMid?: string; // Pag-IBIG Member ID
  passportNumber?: string; // DFA Passport Number
}

export type FieldKey = keyof CitizenVaultData | 'fullName' | 'motherMaidenFullName' | 'fullAddress';

export interface DetectedField {
  id: string;
  fieldKey: FieldKey;
  label: string;
  suggestedValue: string;
  elementSelector: string;
  elementTag: string;
  confidence: number;
  confirmed: boolean;
  livewireModel?: string;
  livewireComponentId?: string;
}

export interface DetectionSummary {
  agencyName: string;
  domain: string;
  fields: DetectedField[];
  totalFieldsFound: number;
}

export type MilestoneStatus =
  | 'submitted'
  | 'under_review'
  | 'biometrics_or_inspection'
  | 'processing_production'
  | 'ready_released'
  | 'action_required'
  | 'rejected';

export interface MilestoneStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  completed: boolean;
  isCurrent: boolean;
  completedAt?: string;
}

export interface AgencyServiceRequest {
  id: string;
  referenceNumber: string;
  citizenId: string;
  citizenName: string;
  citizenEmail?: string;
  citizenPhone?: string;
  agencyCode: 'DFA' | 'DPWH' | 'PSA' | 'PHILHEALTH' | 'NBI';
  agencyName: string;
  serviceCode: string;
  serviceTitle: string;
  serviceType: string;
  currentStep: number; // 1 to 5
  totalSteps: number; // 5
  status: MilestoneStatus;
  statusLabel: string;
  statusBadgeColor: 'blue' | 'amber' | 'emerald' | 'purple' | 'rose' | 'slate';
  officerName: string;
  officerRole: string;
  officerNotes: string;
  actionRequiredNotice?: string;
  appointmentSchedule?: string;
  location: string;
  submittedAt: string;
  updatedAt: string;
  steps: MilestoneStep[];
}

export type UserRole = 'citizen' | 'agency_admin' | 'guest';

export interface ExtensionSession {
  userRole: UserRole;
  citizenId?: string;
  officerName?: string;
  agencyCode?: string;
  apiBaseUrl: string;
  isOnlineSyncEnabled: boolean;
  lastSyncedAt?: string;
}

// Background & Content Script messaging actions
export type ExtensionMessage =
  | { type: 'GET_VAULT' }
  | { type: 'SAVE_VAULT'; payload: { vault: CitizenVaultData; pin?: string } }
  | { type: 'SYNC_FROM_GOVGUIDE'; payload?: { citizenId?: string } }
  | { type: 'PUSH_VAULT_FROM_WEB'; payload: { applicant: any; citizenId?: string } }
  | { type: 'VAULT_UPDATED'; vault: CitizenVaultData }
  | { type: 'GET_SESSION' }
  | { type: 'SET_SESSION'; payload: Partial<ExtensionSession> }
  | { type: 'TRIGGER_AUTOFILL'; payload: { fields: DetectedField[] } }
  | { type: 'UPDATE_REQUEST_STATUS'; payload: {
      requestId: string;
      currentStep: number;
      status: MilestoneStatus;
      statusLabel: string;
      officerNotes: string;
      officerName: string;
      appointmentSchedule?: string;
      actionRequiredNotice?: string;
    } }
  | { type: 'DETECT_FIELDS_REQUEST' }
  | { type: 'FIELDS_DETECTED'; payload: DetectionSummary }
  | { type: 'DETECTED_REFERENCE_NUMBER'; payload: { referenceNumber: string; agencyCode?: string } }
  | { type: 'SHOW_NOTIFICATION'; payload: { title: string; message: string; requestId?: string } };
