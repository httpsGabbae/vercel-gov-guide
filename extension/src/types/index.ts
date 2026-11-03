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
  relationshipToOwner?: string; // Default 'Self' for civil registry requests
}

export type FieldKey =
  | keyof CitizenVaultData
  | 'fullName'
  | 'motherMaidenFullName'
  | 'fullAddress'
  | 'relationshipToOwner';

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

export type ProcessStatus = 'on_process' | 'missing_details' | 'complete';

export interface RequestNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
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
  processStatus: ProcessStatus;
  notes: RequestNote[];
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

export type UserRole = 'citizen' | 'agency_admin' | 'platform_admin' | 'guest';

export interface ExtensionSession {
  userRole: UserRole;
  isAuthenticated: boolean;
  /** 'extension' = signed in via popup; 'web' = mirrored from the GovGuide web chat session */
  authSource?: 'extension' | 'web';
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  email?: string;
  fullName?: string;
  agencyName?: string;
  citizenId?: string;
  officerName?: string;
  agencyCode?: string;
  apiBaseUrl: string;
  isOnlineSyncEnabled: boolean;
  lastSyncedAt?: string;
}

// Background & Content Script messaging actions
export type ExtensionMessage =
  | { type: 'CLEAR_WEB_DETAILS'; payload?: { apiBaseUrl?: string } }
  | {
      type: 'REQUEST_WEB_DETAILS';
      payload: { userId?: string; applicant?: Record<string, unknown> };
    }
  | { type: 'SAVE_WEB_DETAILS'; payload: { applicant: Record<string, unknown> } }
  | { type: 'GET_VAULT' }
  | { type: 'SAVE_VAULT'; payload: { vault: CitizenVaultData; pin?: string } }
  | { type: 'SYNC_FROM_GOVGUIDE'; payload?: { citizenId?: string } }
  | {
      type: 'PUSH_VAULT_FROM_WEB';
      payload: { applicant: any; citizenId?: string; apiBaseUrl?: string };
    }
  | { type: 'VAULT_UPDATED'; vault: CitizenVaultData }
  | { type: 'GET_SESSION' }
  | { type: 'SET_SESSION'; payload: Partial<ExtensionSession> }
  | { type: 'TRIGGER_AUTOFILL'; payload: { fields: DetectedField[] } }
  | { type: 'LOGIN'; payload: { email: string; password: string } }
  | { type: 'LOGOUT' }
  | {
      type: 'SYNC_WEB_AUTH';
      payload: {
        accessToken?: string;
        refreshToken?: string;
        signedOut?: boolean;
        apiBaseUrl?: string;
      };
    }
  | { type: 'SESSION_UPDATED'; session: ExtensionSession }
  | { type: 'FETCH_AGENCY_REQUESTS'; payload?: { q?: string } }
  | {
      type: 'UPDATE_REQUEST_STATUS';
      payload: {
        requestId: string;
        processStatus?: ProcessStatus;
        officerName?: string;
        note?: string;
        appointmentSchedule?: string;
      };
    }
  | { type: 'DETECT_FIELDS_REQUEST' }
  | { type: 'FIELDS_DETECTED'; payload: DetectionSummary }
  | { type: 'DETECTED_REFERENCE_NUMBER'; payload: { referenceNumber: string; agencyCode?: string } }
  | { type: 'SHOW_NOTIFICATION'; payload: { title: string; message: string; requestId?: string } };
