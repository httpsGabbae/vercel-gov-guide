import crypto from 'crypto';
import { computePayloadHash, verifyPayloadHash } from './crypto';
import { getServiceFormConfig } from '../services/forms';
import { getServiceByCode } from '../services/registry';
import { createServiceClient } from '../supabase/service';

export type ActionStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';
export type ExecutionMode = 'assisted' | 'agent';

export interface PendingAction {
  id: string;
  requestId: string | null;
  citizenId: string;
  serviceCode: string;
  actionType: 'submit_application' | 'book_slot' | 'cancel_application';
  payload: Record<string, unknown>;
  payloadHash: string;
  status: ActionStatus;
  executionMode: ExecutionMode;
  expiresAt: string; // ISO date
  createdAt: string; // ISO date
}

export interface ProposeSubmitParams {
  citizenId: string;
  serviceCode: string;
  payload: Record<string, unknown>;
  executionMode?: ExecutionMode;
  expiresInMinutes?: number;
}

export interface CitizenConsent {
  declarationConfirmed: boolean;
  agentModeConsent?: boolean;
}

export interface ConfirmActionResult {
  success: boolean;
  actionId: string;
  trackingNumber?: string;
  status: ActionStatus;
  error?: string;
  requestId?: string;
}

// In-memory fallback repository for offline test suite
const memoryPendingActions = new Map<string, PendingAction>();
const memoryServiceRequests = new Map<string, Record<string, unknown>>();
const memoryAuditLogs: Record<string, unknown>[] = [];

export function getMemoryAuditLogs() {
  return [...memoryAuditLogs];
}

export function clearMemoryStores() {
  memoryPendingActions.clear();
  memoryServiceRequests.clear();
  memoryAuditLogs.length = 0;
}

function generateTrackingNumber(serviceCode: string): string {
  const agency = serviceCode.split('_')[0] || 'GOV';
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `GG-${agency}-2026-${rand}`;
}

/**
 * Phase 1: Propose Submit
 * Validates data, calculates cryptographic hash, sets 15-minute expiry gate.
 */
export async function proposeSubmitAction(params: ProposeSubmitParams): Promise<PendingAction> {
  const { citizenId, serviceCode, payload, executionMode = 'assisted', expiresInMinutes = 15 } = params;

  const formConfig = getServiceFormConfig(serviceCode);
  if (!formConfig) {
    throw new Error(`Unknown service code: ${serviceCode}`);
  }

  // Validate payload against service schema
  const validation = formConfig.schema.safeParse(payload);
  if (!validation.success) {
    const errorDetails = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid form payload: ${errorDetails}`);
  }

  const actionId = crypto.randomUUID();
  const payloadHash = computePayloadHash(payload);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000).toISOString();
  const createdAt = now.toISOString();

  const pendingAction: PendingAction = {
    id: actionId,
    requestId: null,
    citizenId,
    serviceCode,
    actionType: 'submit_application',
    payload,
    payloadHash,
    status: 'pending',
    executionMode,
    expiresAt,
    createdAt,
  };

  // Persist to in-memory store
  memoryPendingActions.set(actionId, pendingAction);

  // Try saving to Supabase if configured
  try {
    const supabase = createServiceClient();
    await (supabase as unknown as { from: (t: string) => { insert: (d: unknown) => Promise<unknown> } })
      .from('pending_actions')
      .insert({
        id: actionId,
        citizen_id: citizenId,
        action_type: 'submit_application',
        payload,
        payload_hash: payloadHash,
        status: 'pending',
        expires_at: expiresAt,
      });
  } catch {
    // Safe ignore for offline mode
  }

  return pendingAction;
}

/**
 * Phase 2A: Confirm Action
 * Verifies cryptographic integrity, expiry, and citizen confirmation before committing to service_requests.
 */
export async function confirmPendingAction(
  actionId: string,
  citizenConsent: CitizenConsent,
): Promise<ConfirmActionResult> {
  // Retrieve action
  let action: PendingAction | undefined = memoryPendingActions.get(actionId);

  if (!action) {
    // Try Supabase
    try {
      const supabase = createServiceClient();
      const { data } = await (supabase as unknown as {
        from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } };
      })
        .from('pending_actions')
        .select('*')
        .eq('id', actionId)
        .single();

      if (data) {
        action = {
          id: data.id as string,
          requestId: data.request_id as string | null,
          citizenId: data.citizen_id as string,
          serviceCode: 'NBI_CLEARANCE',
          actionType: data.action_type as PendingAction['actionType'],
          payload: data.payload as Record<string, unknown>,
          payloadHash: data.payload_hash as string,
          status: data.status as ActionStatus,
          executionMode: 'assisted',
          expiresAt: data.expires_at as string,
          createdAt: data.created_at as string,
        };
      }
    } catch {
      // ignore
    }
  }

  if (!action) {
    return { success: false, actionId, status: 'expired', error: 'Action not found' };
  }

  // Check 1: Idempotency & double-confirmation prevention
  if (action.status !== 'pending') {
    return {
      success: false,
      actionId,
      status: action.status,
      error: `Action has already been ${action.status}`,
    };
  }

  // Check 2: Expiry check
  const now = new Date();
  if (now > new Date(action.expiresAt)) {
    action.status = 'expired';
    memoryPendingActions.set(actionId, action);
    return { success: false, actionId, status: 'expired', error: 'Action has expired (TTL exceeded 15 minutes)' };
  }

  // Check 3: Cryptographic payload hash verification (Tamper-proof check)
  const isHashValid = verifyPayloadHash(action.payload, action.payloadHash);
  if (!isHashValid) {
    return {
      success: false,
      actionId,
      status: 'pending',
      error: 'CRITICAL SECURITY ERROR: Payload hash mismatch. Data was tampered with after proposal.',
    };
  }

  // Check 4: Citizen declaration consent check
  if (!citizenConsent.declarationConfirmed) {
    return {
      success: false,
      actionId,
      status: 'pending',
      error: 'Citizen declaration of truthfulness must be acknowledged.',
    };
  }

  // Check 5: Agent-mode consent check
  if (action.executionMode === 'agent' && !citizenConsent.agentModeConsent) {
    return {
      success: false,
      actionId,
      status: 'pending',
      error: 'Autonomous agent mode submission is disabled by citizen consent settings.',
    };
  }

  // Execute Submission: Generate tracking number & service request
  const trackingNumber = generateTrackingNumber(action.serviceCode);
  const requestId = crypto.randomUUID();
  const serviceDef = getServiceByCode(action.serviceCode);
  const counterFee = (serviceDef?.processingFee || 0) + (serviceDef?.convenienceFee || 0);

  const requestRecord = {
    id: requestId,
    trackingNumber,
    citizenId: action.citizenId,
    serviceCode: action.serviceCode,
    status: 'submitted',
    formData: action.payload,
    counterFee,
    createdAt: new Date().toISOString(),
  };

  memoryServiceRequests.set(requestId, requestRecord);

  // Mark action confirmed
  action.status = 'confirmed';
  action.requestId = requestId;
  memoryPendingActions.set(actionId, action);

  // Write Immutable Audit Log
  const auditLogEntry = {
    id: crypto.randomUUID(),
    actorId: action.citizenId,
    actorRole: 'citizen',
    action: 'APPLICATION_SUBMITTED',
    targetType: 'service_request',
    targetId: requestId,
    details: {
      actionId,
      trackingNumber,
      serviceCode: action.serviceCode,
      executionMode: action.executionMode,
      counterFee,
    },
    createdAt: new Date().toISOString(),
  };

  memoryAuditLogs.push(auditLogEntry);

  return {
    success: true,
    actionId,
    requestId,
    trackingNumber,
    status: 'confirmed',
  };
}

/**
 * Phase 2B: Cancel Action
 */
export async function cancelPendingAction(
  actionId: string,
  reason = 'Citizen cancelled action',
): Promise<ConfirmActionResult> {
  const action = memoryPendingActions.get(actionId);
  if (!action) {
    return { success: false, actionId, status: 'cancelled', error: 'Action not found' };
  }

  if (action.status !== 'pending') {
    return {
      success: false,
      actionId,
      status: action.status,
      error: `Cannot cancel action with status ${action.status}`,
    };
  }

  action.status = 'cancelled';
  memoryPendingActions.set(actionId, action);

  memoryAuditLogs.push({
    id: crypto.randomUUID(),
    actorId: action.citizenId,
    actorRole: 'citizen',
    action: 'APPLICATION_CANCELLED',
    targetType: 'pending_action',
    targetId: actionId,
    details: { reason, serviceCode: action.serviceCode },
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    actionId,
    status: 'cancelled',
  };
}

export function getPendingActionById(actionId: string): PendingAction | null {
  return memoryPendingActions.get(actionId) || null;
}
