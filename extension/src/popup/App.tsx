import React, { useState, useEffect } from 'react';
import type { CitizenVaultData, ExtensionSession, AgencyServiceRequest, MilestoneStatus } from '../types';

export function App() {
  const [tab, setTab] = useState<'vault' | 'tracker' | 'agency'>('vault');
  const [session, setSession] = useState<ExtensionSession | null>(null);
  const [vault, setVault] = useState<CitizenVaultData | null>(null);
  const [editFormData, setEditFormData] = useState<CitizenVaultData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Agency Tab States
  const [requests, setRequests] = useState<AgencyServiceRequest[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [officerStep, setOfficerStep] = useState<number>(3);
  const [officerStatus, setOfficerStatus] = useState<MilestoneStatus>('biometrics_or_inspection');
  const [officerStatusLabel, setOfficerStatusLabel] = useState<string>('');
  const [officerNotes, setOfficerNotes] = useState<string>('');
  const [officerName, setOfficerName] = useState<string>('');
  const [appointmentSchedule, setAppointmentSchedule] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Load Session and Vault on mount
  useEffect(() => {
    loadInitialData();

    // Listen for real-time vault updates from background (dispatched by web chat)
    const handleRuntimeMsg = (msg: any) => {
      if (msg && msg.type === 'VAULT_UPDATED' && msg.vault) {
        setVault(msg.vault);
        setEditFormData(msg.vault);
        setIsOnline(true);
        setStatusMsg({ text: '⚡ Live synchronized with GovGuide Chat details!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3500);
      }
    };
    chrome.runtime.onMessage.addListener(handleRuntimeMsg);

    return () => {
      chrome.runtime.onMessage.removeListener(handleRuntimeMsg);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Session
      chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
        if (res && res.session) {
          setSession(res.session);
          setOfficerName(res.session.officerName || 'Officer M. Gomez');
          fetchAgencyRequests(res.session.apiBaseUrl);
        }
      });

      // 2. Fetch Vault (Background will auto-sync with active session from /api/citizen/details?citizenId=active)
      chrome.runtime.sendMessage({ type: 'GET_VAULT' }, (res) => {
        if (res && res.vault) {
          setVault(res.vault);
          setEditFormData(res.vault);
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
        setLoading(false);
      });
    } catch {
      setIsOnline(false);
      setLoading(false);
    }
  };

  const fetchAgencyRequests = async (baseUrl: string) => {
    try {
      const res = await fetch(`${baseUrl}/api/agency/requests?agencyCode=ALL`);
      if (!res.ok) throw new Error('Unreachable');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRequests(json.data);
        setIsOnline(true);
        if (json.data.length > 0 && !selectedReqId) {
          const first = json.data[0];
          setSelectedReqId(first.id);
          setOfficerStep(first.currentStep);
          setOfficerStatus(first.status);
          setOfficerStatusLabel(first.statusLabel);
          setOfficerNotes(first.officerNotes);
          setAppointmentSchedule(first.appointmentSchedule || '');
        }
      }
    } catch {
      setIsOnline(false);
    }
  };

  const handleSelectRequest = (reqId: string) => {
    setSelectedReqId(reqId);
    const target = requests.find((r) => r.id === reqId);
    if (target) {
      setOfficerStep(target.currentStep);
      setOfficerStatus(target.status);
      setOfficerStatusLabel(target.statusLabel);
      setOfficerNotes(target.officerNotes);
      setAppointmentSchedule(target.appointmentSchedule || '');
    }
  };

  const handleToggleRole = () => {
    if (!session) return;
    const newRole = session.userRole === 'agency_admin' ? 'citizen' : 'agency_admin';
    const newTab = newRole === 'agency_admin' ? 'agency' : 'vault';
    setSession({ ...session, userRole: newRole });
    setTab(newTab);
    chrome.runtime.sendMessage({
      type: 'SET_SESSION',
      payload: { userRole: newRole },
    });
  };

  const handleSyncGovGuide = () => {
    setSyncing(true);
    setStatusMsg(null);
    chrome.runtime.sendMessage({ type: 'SYNC_FROM_GOVGUIDE', payload: { citizenId: 'active' } }, (res) => {
      setSyncing(false);
      if (res && res.vault) {
        setVault(res.vault);
        setEditFormData(res.vault);
        setIsOnline(true);
        setStatusMsg({ text: '✅ In sync with GovGuide PH Chat (My Details)!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3500);
      } else {
        setIsOnline(false);
        setStatusMsg({ text: '⚠️ Unable to connect to localhost:3000. Ensure GovGuide PH is running.', type: 'warning' });
        setTimeout(() => setStatusMsg(null), 4500);
      }
    });
  };

  const handleAutofillActiveTab = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'DETECT_FIELDS_REQUEST' }, (response) => {
        if (response && response.summary && response.summary.fields && response.summary.fields.length > 0) {
          const fields = response.summary.fields;
          chrome.tabs.sendMessage(tabs[0].id!, { type: 'TRIGGER_AUTOFILL', payload: { fields } }, (autofillRes) => {
            if (autofillRes && autofillRes.success) {
              setStatusMsg({
                text: `⚡ Successfully injected ${autofillRes.filledCount} verified fields into active portal!`,
                type: 'success',
              });
              setTimeout(() => setStatusMsg(null), 4000);
            }
          });
        } else {
          setStatusMsg({
            text: 'ℹ️ No recognized Philippine government form fields on this active page.',
            type: 'warning',
          });
          setTimeout(() => setStatusMsg(null), 3500);
        }
      });
    });
  };

  const handleCopyText = (key: string, val?: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleSaveEditForm = async () => {
    if (!editFormData) return;
    setVault(editFormData);
    setIsEditing(false);

    // Save to local extension encrypted vault
    chrome.runtime.sendMessage({
      type: 'SAVE_VAULT',
      payload: { vault: editFormData },
    });

    // Also push back to GovGuide PH web server to keep chat in sync
    if (session?.apiBaseUrl) {
      try {
        await fetch(`${session.apiBaseUrl}/api/citizen/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            citizenId: session.citizenId || 'active',
            applicant: {
              first_name: editFormData.firstName,
              middle_name: editFormData.middleName,
              last_name: editFormData.lastName,
              suffix: editFormData.suffix,
              display_name: `${editFormData.firstName} ${editFormData.middleName ? editFormData.middleName + ' ' : ''}${editFormData.lastName}`.trim(),
              gender: editFormData.gender,
              birth_date: editFormData.dateOfBirth,
              father_name: editFormData.fatherFullName,
              father_first_name: editFormData.fatherFirstName,
              father_middle_name: editFormData.fatherMiddleName,
              father_last_name: editFormData.fatherLastName,
              mother_maiden_name: `${editFormData.motherMaidenFirstName} ${editFormData.motherMaidenMiddleName ? editFormData.motherMaidenMiddleName + ' ' : ''}${editFormData.motherMaidenLastName}`.trim(),
              mother_first_name: editFormData.motherMaidenFirstName,
              mother_middle_name: editFormData.motherMaidenMiddleName,
              mother_last_name: editFormData.motherMaidenLastName,
              philsys_id: editFormData.philsysId,
              philsys_card_number: editFormData.philsysId,
              philhealth_number: editFormData.philhealthNumber,
              tin: editFormData.tin,
              tin_number: editFormData.tin,
              sss_number: editFormData.sssNumber,
              pagibig_number: editFormData.pagibigMid,
              street_address: editFormData.streetHouseNumber,
              barangay: editFormData.barangay,
              city: editFormData.cityMunicipality,
              province: editFormData.province,
              zip_code: editFormData.zipCode,
              phone: editFormData.mobileNumber,
              contact_number: editFormData.mobileNumber,
              email: editFormData.emailAddress,
            },
          }),
        });
        setStatusMsg({ text: '💾 Details saved & synchronized with GovGuide Chat!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3000);
      } catch {
        setStatusMsg({ text: '💾 Saved to local vault (offline mode).', type: 'warning' });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    }
  };

  const handleCommitStatusUpdate = async () => {
    if (!selectedReqId) return;
    setIsUpdating(true);
    setStatusMsg(null);

    chrome.runtime.sendMessage(
      {
        type: 'UPDATE_REQUEST_STATUS',
        payload: {
          requestId: selectedReqId,
          currentStep: officerStep,
          status: officerStatus,
          statusLabel: officerStatusLabel || getStepDefaultLabel(officerStep),
          officerNotes,
          officerName: officerName || 'Officer M. Gomez',
          appointmentSchedule,
        },
      },
      (res) => {
        setIsUpdating(false);
        if (res && res.success) {
          setStatusMsg({
            text: `🚀 Status Bar updated & citizen notified for ${selectedReqId}!`,
            type: 'success',
          });
          if (session) fetchAgencyRequests(session.apiBaseUrl);
          setTimeout(() => setStatusMsg(null), 4000);
        } else {
          setStatusMsg({
            text: `❌ Error: ${res?.error || 'Failed to update status bar'}`,
            type: 'error',
          });
          setTimeout(() => setStatusMsg(null), 4000);
        }
      }
    );
  };

  const getStepDefaultLabel = (step: number): string => {
    switch (step) {
      case 1: return 'Application Submitted & Logged';
      case 2: return 'Documents Verified by Reviewing Officer';
      case 3: return 'Biometrics / Counter Window Scheduled';
      case 4: return 'Under Processing & Production';
      case 5: return 'Ready for Release & Counter Pick-Up';
      default: return 'In Progress';
    }
  };

  const getInitials = (v: CitizenVaultData): string => {
    const f = (v.firstName || 'J')[0];
    const l = (v.lastName || 'C')[0];
    return `${f}${l}`.toUpperCase();
  };

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        <div className="spin-icon" style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
        <p style={{ fontSize: 13, fontWeight: 600 }}>Loading GovGuide PH Copilot...</p>
      </div>
    );
  }

  const isAgency = session?.userRole === 'agency_admin';

  return (
    <div className="popup-container">
      {/* 1. Header */}
      <header className="popup-header">
        <div className="brand-section">
          <span className="brand-flag">🇵🇭</span>
          <div className="brand-titles">
            <div className="brand-name">
              <span>GovGuide PH</span>
              <span className="brand-badge">Bilis-Pila</span>
            </div>
            <span className="brand-subtitle">Civic Copilot &amp; Counter Bridge</span>
          </div>
        </div>

        {/* Role Toggle Pill Button */}
        <button
          onClick={handleToggleRole}
          className={`role-pill-btn ${isAgency ? 'agency' : 'citizen'}`}
          title="Switch between Citizen Autofill and Agency Officer Mode"
        >
          <span>{isAgency ? '🏢 Officer Mode' : '👤 Citizen Mode'}</span>
          <span style={{ opacity: 0.8, fontSize: 10 }}>⇄</span>
        </button>
      </header>

      {/* 2. Sync Status Subheader */}
      <div className="sync-status-bar">
        <div className={`sync-indicator ${isOnline ? 'connected' : 'offline'}`}>
          <span className={`pulse-dot ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? 'Connected to GovGuide Chat' : 'Offline / Standalone Vault'}</span>
        </div>

        {vault && (
          <div className="active-profile-chip" title="Active synced citizen profile">
            <span>👤</span>
            <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {vault.firstName} {vault.lastName}
            </span>
          </div>
        )}
      </div>

      {/* 3. Global Notification Banner */}
      {statusMsg && (
        <div className={`notification-banner ${statusMsg.type}`}>
          <span>{statusMsg.text}</span>
          <button
            onClick={() => setStatusMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. Tab Navigation */}
      <nav className="nav-tab-bar">
        <button
          onClick={() => setTab('vault')}
          className={`tab-btn ${tab === 'vault' ? 'active' : ''}`}
        >
          <span>🔐</span>
          <span>My Details</span>
        </button>

        <button
          onClick={() => setTab('tracker')}
          className={`tab-btn ${tab === 'tracker' ? 'active' : ''}`}
        >
          <span>📊</span>
          <span>Applications</span>
          {requests.length > 0 && <span className="tab-badge">{requests.length}</span>}
        </button>

        {isAgency && (
          <button
            onClick={() => setTab('agency')}
            className={`tab-btn agency-tab ${tab === 'agency' ? 'active agency-tab' : ''}`}
          >
            <span>🏢</span>
            <span>Officer Stepper</span>
          </button>
        )}
      </nav>

      {/* 5. Tab Content Body */}
      <div className="tab-content">
        {/* TAB 1: MY DETAILS & CITIZEN VAULT */}
        {tab === 'vault' && vault && (
          <>
            {/* Action Row */}
            <div className="action-banner-row">
              <button
                onClick={handleAutofillActiveTab}
                className="btn-autofill"
                title="Detect & autofill fields on active browser tab (PSA, DFA, NBI)"
              >
                <span>⚡</span>
                <span>Autofill Active Portal</span>
              </button>

              <button
                onClick={handleSyncGovGuide}
                disabled={syncing}
                className="btn-sync"
                title="Fetch latest details learned in the main web chat"
              >
                <span className={syncing ? 'spin-icon' : ''}>🔄</span>
                <span>{syncing ? 'Syncing...' : 'Sync from Chat'}</span>
              </button>
            </div>

            {/* Profile Card */}
            <div className="vault-card">
              <div className="card-header-row">
                <div className="card-header-left">
                  <div className="avatar-initials">
                    {getInitials(vault)}
                  </div>
                  <div>
                    <div className="card-title-name">
                      {vault.firstName} {vault.middleName ? vault.middleName + ' ' : ''}{vault.lastName} {vault.suffix || ''}
                    </div>
                    <div className="card-title-sub">
                      {vault.civilStatus} · {vault.gender} · Born {vault.dateOfBirth}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="security-badge">RA 10173 Encrypted</span>
                  <button
                    onClick={() => {
                      setIsEditing(!isEditing);
                      setEditFormData(vault);
                    }}
                    className={`edit-toggle-btn ${isEditing ? 'active' : ''}`}
                  >
                    <span>{isEditing ? '✕ Cancel' : '✏️ Edit'}</span>
                  </button>
                </div>
              </div>

              {/* View Mode vs Edit Mode */}
              {!isEditing ? (
                <>
                  {/* Identity Grid */}
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Place of Birth</span>
                      <span className="info-val">{vault.placeOfBirth || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Nationality</span>
                      <span className="info-val">{vault.nationality || 'FILIPINO'}</span>
                    </div>
                  </div>

                  {/* Civil Registry & Parents Section (PSA & NBI Essential) */}
                  <div className="detail-group">
                    <div className="group-title">
                      <span>🏛️</span>
                      <span>Civil Registry &amp; Parents (PSA / NBI Essential)</span>
                    </div>
                    <div className="info-grid">
                      <div className="info-item info-col-span">
                        <span className="info-label">Mother&apos;s Maiden Name (Crucial for PSA Birth Certificate)</span>
                        <span className="info-val highlight">
                          {vault.motherMaidenFirstName} {vault.motherMaidenMiddleName} {vault.motherMaidenLastName} {vault.motherMaidenSuffix}
                        </span>
                        <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 2 }}>
                          First: {vault.motherMaidenFirstName || '—'} · Mid: {vault.motherMaidenMiddleName || '—'} · Last: {vault.motherMaidenLastName || '—'}
                        </div>
                      </div>

                      <div className="info-item info-col-span">
                        <span className="info-label">Father&apos;s Full Name</span>
                        <span className="info-val">
                          {vault.fatherFirstName || ''} {vault.fatherMiddleName || ''} {vault.fatherLastName || ''} {vault.fatherSuffix || ''}
                        </span>
                        <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 2 }}>
                          First: {vault.fatherFirstName || '—'} · Mid: {vault.fatherMiddleName || '—'} · Last: {vault.fatherLastName || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Philippine Government IDs (with 1-Click Copy Chips) */}
                  <div className="detail-group">
                    <div className="group-title">
                      <span>🇵🇭</span>
                      <span>Government Identifiers (1-Click Copy)</span>
                    </div>
                    <div className="id-chips-grid">
                      {/* PhilSys */}
                      <div className="id-card-item">
                        <div className="id-card-text">
                          <div className="id-card-label">PhilSys National ID</div>
                          <div className="id-card-val">{vault.philsysId || '—'}</div>
                        </div>
                        {vault.philsysId && (
                          <button
                            onClick={() => handleCopyText('philsys', vault.philsysId)}
                            className={`copy-mini-btn ${copiedKey === 'philsys' ? 'copied' : ''}`}
                            title="Copy PhilSys ID"
                          >
                            {copiedKey === 'philsys' ? '✓ Copied' : '📋 Copy'}
                          </button>
                        )}
                      </div>

                      {/* PhilHealth */}
                      <div className="id-card-item">
                        <div className="id-card-text">
                          <div className="id-card-label">PhilHealth PIN</div>
                          <div className="id-card-val">{vault.philhealthNumber || '—'}</div>
                        </div>
                        {vault.philhealthNumber && (
                          <button
                            onClick={() => handleCopyText('philhealth', vault.philhealthNumber)}
                            className={`copy-mini-btn ${copiedKey === 'philhealth' ? 'copied' : ''}`}
                            title="Copy PhilHealth PIN"
                          >
                            {copiedKey === 'philhealth' ? '✓ Copied' : '📋 Copy'}
                          </button>
                        )}
                      </div>

                      {/* BIR TIN */}
                      <div className="id-card-item">
                        <div className="id-card-text">
                          <div className="id-card-label">BIR TIN</div>
                          <div className="id-card-val">{vault.tin || '—'}</div>
                        </div>
                        {vault.tin && (
                          <button
                            onClick={() => handleCopyText('tin', vault.tin)}
                            className={`copy-mini-btn ${copiedKey === 'tin' ? 'copied' : ''}`}
                            title="Copy BIR TIN"
                          >
                            {copiedKey === 'tin' ? '✓ Copied' : '📋 Copy'}
                          </button>
                        )}
                      </div>

                      {/* SSS Number */}
                      <div className="id-card-item">
                        <div className="id-card-text">
                          <div className="id-card-label">SSS Number / CRN</div>
                          <div className="id-card-val">{vault.sssNumber || '—'}</div>
                        </div>
                        {vault.sssNumber && (
                          <button
                            onClick={() => handleCopyText('sss', vault.sssNumber)}
                            className={`copy-mini-btn ${copiedKey === 'sss' ? 'copied' : ''}`}
                            title="Copy SSS Number"
                          >
                            {copiedKey === 'sss' ? '✓ Copied' : '📋 Copy'}
                          </button>
                        )}
                      </div>

                      {/* Pag-IBIG MID */}
                      <div className="id-card-item">
                        <div className="id-card-text">
                          <div className="id-card-label">Pag-IBIG MID</div>
                          <div className="id-card-val">{vault.pagibigMid || '—'}</div>
                        </div>
                        {vault.pagibigMid && (
                          <button
                            onClick={() => handleCopyText('pagibig', vault.pagibigMid)}
                            className={`copy-mini-btn ${copiedKey === 'pagibig' ? 'copied' : ''}`}
                            title="Copy Pag-IBIG MID"
                          >
                            {copiedKey === 'pagibig' ? '✓ Copied' : '📋 Copy'}
                          </button>
                        )}
                      </div>

                      {/* DFA Passport */}
                      <div className="id-card-item">
                        <div className="id-card-text">
                          <div className="id-card-label">DFA Passport No.</div>
                          <div className="id-card-val">{vault.passportNumber || '—'}</div>
                        </div>
                        {vault.passportNumber && (
                          <button
                            onClick={() => handleCopyText('passport', vault.passportNumber)}
                            className={`copy-mini-btn ${copiedKey === 'passport' ? 'copied' : ''}`}
                            title="Copy Passport Number"
                          >
                            {copiedKey === 'passport' ? '✓ Copied' : '📋 Copy'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact & Address Section */}
                  <div className="detail-group">
                    <div className="group-title">
                      <span>📍</span>
                      <span>Contact &amp; Philippine Delivery Address</span>
                    </div>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Mobile Phone</span>
                        <span className="info-val">{vault.mobileNumber || '—'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email Address</span>
                        <span className="info-val" style={{ fontSize: 10.5 }}>{vault.emailAddress || '—'}</span>
                      </div>
                      <div className="info-item info-col-span">
                        <span className="info-label">Residential Address</span>
                        <span className="info-val">
                          {[vault.streetHouseNumber, vault.barangay, vault.cityMunicipality, vault.province, vault.zipCode].filter(Boolean).join(', ') || 'Not specified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Edit Mode Form */
                editFormData && (
                  <div style={{ marginTop: 10 }}>
                    <div className="edit-form-grid">
                      <div className="form-group">
                        <label className="form-label">First Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.firstName}
                          onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Middle Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.middleName}
                          onChange={(e) => setEditFormData({ ...editFormData, middleName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.lastName}
                          onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date of Birth (YYYY-MM-DD)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.dateOfBirth}
                          onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                        />
                      </div>

                      {/* Mother's Maiden Name */}
                      <div className="form-group col-span-2">
                        <label className="form-label">Mother&apos;s Maiden First Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.motherMaidenFirstName}
                          onChange={(e) => setEditFormData({ ...editFormData, motherMaidenFirstName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mother&apos;s Maiden Middle</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.motherMaidenMiddleName}
                          onChange={(e) => setEditFormData({ ...editFormData, motherMaidenMiddleName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mother&apos;s Maiden Last</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.motherMaidenLastName}
                          onChange={(e) => setEditFormData({ ...editFormData, motherMaidenLastName: e.target.value })}
                        />
                      </div>

                      {/* Father's Name */}
                      <div className="form-group">
                        <label className="form-label">Father&apos;s First Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.fatherFirstName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, fatherFirstName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Father&apos;s Last Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.fatherLastName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, fatherLastName: e.target.value })}
                        />
                      </div>

                      {/* IDs */}
                      <div className="form-group">
                        <label className="form-label">PhilSys National ID</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.philsysId || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, philsysId: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">PhilHealth PIN</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.philhealthNumber || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, philhealthNumber: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">BIR TIN</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.tin || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, tin: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">SSS Number</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.sssNumber || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, sssNumber: e.target.value })}
                        />
                      </div>

                      {/* Contact & Address */}
                      <div className="form-group col-span-2">
                        <label className="form-label">Mobile Number</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.mobileNumber}
                          onChange={(e) => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
                        />
                      </div>
                      <div className="form-group col-span-2">
                        <label className="form-label">Street / Unit / House No.</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.streetHouseNumber}
                          onChange={(e) => setEditFormData({ ...editFormData, streetHouseNumber: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Barangay</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.barangay}
                          onChange={(e) => setEditFormData({ ...editFormData, barangay: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">City / Municipality</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editFormData.cityMunicipality}
                          onChange={(e) => setEditFormData({ ...editFormData, cityMunicipality: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="edit-action-bar">
                      <button onClick={handleSaveEditForm} className="btn-save">
                        💾 Save &amp; Sync to Chat
                      </button>
                      <button onClick={() => setIsEditing(false)} className="btn-cancel">
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* TAB 2: APPLICATION TRACKER */}
        {tab === 'tracker' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>📋</span>
                <p style={{ fontSize: 13, fontWeight: 600 }}>No active agency service requests.</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>Apply for DFA Passport, PSA Birth Certificate, or NBI Clearance in the web app.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="vault-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 7px', borderRadius: 4 }}>
                      {req.agencyCode}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }}>
                      Ref #{req.referenceNumber}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 5 }}>
                    {req.serviceTitle}
                  </div>

                  {/* 5-Step Stepper Bar */}
                  <div style={{ margin: '10px 0 6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#0f172a' }}>
                        Step {req.currentStep} of {req.totalSteps}: {req.statusLabel}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: req.currentStep === 5 ? '#10b981' : '#2563eb' }}>
                        {Math.round((req.currentStep / req.totalSteps) * 100)}%
                      </span>
                    </div>

                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(req.currentStep / req.totalSteps) * 100}%`,
                          background: req.currentStep === 5 ? '#10b981' : '#2563eb',
                          borderRadius: 3,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {req.officerNotes && (
                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, fontSize: 11, color: '#334155', marginTop: 8, borderLeft: '3px solid #2563eb' }}>
                      <strong>Officer Directive:</strong> {req.officerNotes}
                    </div>
                  )}

                  {req.appointmentSchedule && (
                    <div style={{ fontSize: 11, color: '#047857', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>🗓️</span>
                      <span><strong>Counter Window:</strong> {req.appointmentSchedule}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: AGENCY OFFICER STEPPER */}
        {tab === 'agency' && isAgency && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="vault-card">
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
                Select Citizen Application to Advance
              </label>
              <select
                value={selectedReqId}
                onChange={(e) => handleSelectRequest(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#ffffff',
                }}
              >
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.agencyCode}] {r.referenceNumber} — {r.citizenName}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: 14 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 8 }}>
                  Advance Application Milestone (Click Step):
                </span>

                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map((stepNum) => {
                    const isActive = officerStep === stepNum;
                    const isPassed = officerStep > stepNum;
                    return (
                      <button
                        key={stepNum}
                        onClick={() => {
                          setOfficerStep(stepNum);
                          setOfficerStatusLabel(getStepDefaultLabel(stepNum));
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 2px',
                          borderRadius: 6,
                          border: 'none',
                          background: isActive ? '#f59e0b' : isPassed ? '#10b981' : '#f1f5f9',
                          color: isActive || isPassed ? '#ffffff' : '#64748b',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Step {stepNum}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10.5, color: '#64748b', display: 'block', marginBottom: 3 }}>
                      Status Label (Visible to Citizen)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={officerStatusLabel}
                      onChange={(e) => setOfficerStatusLabel(e.target.value)}
                      placeholder={getStepDefaultLabel(officerStep)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 10.5, color: '#64748b', display: 'block', marginBottom: 3 }}>
                      Counter Officer Directive / Notes
                    </label>
                    <textarea
                      rows={2}
                      className="form-input"
                      value={officerNotes}
                      onChange={(e) => setOfficerNotes(e.target.value)}
                      placeholder="e.g. Please bring 2 original valid IDs and PSA Birth Certificate to Window 4."
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 10.5, color: '#64748b', display: 'block', marginBottom: 3 }}>
                      Scheduled Counter Date &amp; Time
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={appointmentSchedule}
                      onChange={(e) => setAppointmentSchedule(e.target.value)}
                      placeholder="e.g. Nov 5, 2026 at 09:30 AM (Window 4)"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCommitStatusUpdate}
                  disabled={isUpdating}
                  className="btn-autofill"
                  style={{
                    width: '100%',
                    marginTop: 12,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.25)',
                  }}
                >
                  <span>{isUpdating ? 'Pushing Update...' : '🚀 Advance Citizen Milestone Status'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Footer Compliance */}
      <footer className="compliance-footer">
        <span>🔒</span>
        <span>Protected under RA 10173 (Data Privacy Act of 2012) • AES-256 Encrypted Local Vault</span>
      </footer>
    </div>
  );
}
