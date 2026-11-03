import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CitizenVaultData, ExtensionSession, AgencyServiceRequest, ProcessStatus } from '../types';
import { generateOfficialNoticeLetter, type GeneratedLetterResult } from '../lib/letter-generator';
import {
  type CitizenChatMessage,
  streamCitizenChat,
  loadStoredCitizenChat,
  saveStoredCitizenChat,
  INITIAL_GREETING_MESSAGE,
} from '../lib/citizen-chat';

const PROCESS_STATUS_OPTIONS: { value: ProcessStatus; label: string }[] = [
  { value: 'on_process', label: 'On Process' },
  { value: 'missing_details', label: 'Missing Details' },
  { value: 'complete', label: 'Complete' },
];

const processLabel = (s?: ProcessStatus) =>
  PROCESS_STATUS_OPTIONS.find((o) => o.value === s)?.label || 'On Process';

const isAgencyRole = (role?: string) => role === 'agency_admin' || role === 'platform_admin';

type StatusMsg = { text: string; type: 'success' | 'warning' | 'error' } | null;

export function App() {
  const [session, setSession] = useState<ExtensionSession | null>(null);
  const [vault, setVault] = useState<CitizenVaultData | null>(null);
  const [editFormData, setEditFormData] = useState<CitizenVaultData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<StatusMsg>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Agency side
  const [requests, setRequests] = useState<AgencyServiceRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedReq, setSelectedReq] = useState<AgencyServiceRequest | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus>('on_process');
  const [noteDraft, setNoteDraft] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<ExtensionSession | null>(null);

  // Agency AI Letter Drafter (Chatbot) States
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiGeneratedLetter, setAiGeneratedLetter] = useState<GeneratedLetterResult | null>(null);
  const [aiIsEditingLetter, setAiIsEditingLetter] = useState(false);
  const [aiLetterDraft, setAiLetterDraft] = useState('');

  // Citizen Mini Chatbot States
  const [chatMessages, setChatMessages] = useState<CitizenChatMessage[]>([INITIAL_GREETING_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const flash = useCallback((msg: StatusMsg, ms = 3500) => {
    setStatusMsg(msg);
    if (msg) setTimeout(() => setStatusMsg(null), ms);
  }, []);

  const selectRequest = (req: AgencyServiceRequest | null) => {
    setSelectedReq(req);
    setProcessStatus(req?.processStatus || 'on_process');
    setNoteDraft('');
    setAiKeywords('');
    setAiGeneratedLetter(null);
    setAiIsEditingLetter(false);
    setAiLetterDraft('');
  };

  const fetchAgencyRequests = useCallback((q: string) => {
    setSearching(true);
    chrome.runtime.sendMessage({ type: 'FETCH_AGENCY_REQUESTS', payload: { q } }, (res) => {
      setSearching(false);
      if (res && res.success && Array.isArray(res.data)) {
        const list: AgencyServiceRequest[] = res.data;
        setRequests(list);
        setIsOnline(true);
        setSelectedReq((prev) => {
          const keep = prev ? list.find((r) => r.id === prev.id) : undefined;
          const next = keep ?? list[0] ?? null;
          if (next && (!prev || prev.id !== next.id)) {
            setProcessStatus(next.processStatus || 'on_process');
          }
          return next;
        });
      } else {
        setIsOnline(false);
        if (res?.error) flash({ text: res.error, type: 'error' }, 4500);
      }
    });
  }, [flash]);

  const loadVault = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_VAULT' }, (res) => {
      if (res && res.vault) {
        setVault(res.vault);
        setEditFormData(res.vault);
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    });
  }, []);

  const routeForSession = useCallback(
    (s: ExtensionSession | null) => {
      if (!s || !s.isAuthenticated) return;
      if (isAgencyRole(s.userRole)) {
        fetchAgencyRequests('');
      } else {
        loadVault();
      }
    },
    [fetchAgencyRequests, loadVault]
  );

  // Load session on mount and listen for live updates
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (res) => {
      const s: ExtensionSession | null = res?.session || null;
      setSession(s);
      routeForSession(s);
      setLoading(false);
    });

    const handleRuntimeMsg = (msg: any) => {
      if (msg && msg.type === 'VAULT_UPDATED' && msg.vault) {
        setVault(msg.vault);
        setEditFormData(msg.vault);
        setIsOnline(true);
        flash({ text: 'Synchronized with GovGuide PH (My Details).', type: 'success' });
      }
      if (msg && msg.type === 'SESSION_UPDATED' && msg.session) {
        const prev = sessionRef.current;
        const next: ExtensionSession = msg.session;
        const changedUser =
          !prev || prev.isAuthenticated !== next.isAuthenticated || prev.userId !== next.userId;
        setSession(next);
        if (changedUser) {
          selectRequest(null);
          setRequests([]);
          setVault(null);
          routeForSession(next);
        }
      }
    };
    chrome.runtime.onMessage.addListener(handleRuntimeMsg);
    return () => {
      chrome.runtime.onMessage.removeListener(handleRuntimeMsg);
    };
  }, [flash, routeForSession]);

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter your email and password.');
      return;
    }
    setLoggingIn(true);
    chrome.runtime.sendMessage(
      { type: 'LOGIN', payload: { email: loginEmail.trim(), password: loginPassword } },
      (res) => {
        setLoggingIn(false);
        if (res && res.success && res.session) {
          setLoginPassword('');
          setSession(res.session);
          routeForSession(res.session);
        } else {
          setLoginError(res?.error || 'Unable to sign in. Ensure GovGuide PH is running.');
        }
      }
    );
  };

  const handleLogout = () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, (res) => {
      setSession(res?.session || null);
      setVault(null);
      setRequests([]);
      selectRequest(null);
      setIsEditing(false);
    });
  };

  const handleOpenWebLogin = () => {
    const base = session?.apiBaseUrl || 'http://localhost:3000';
    chrome.tabs.create({ url: `${base}/login` });
  };

  // ---------------------------------------------------------------------------
  // Citizen side
  // ---------------------------------------------------------------------------

  const handleSyncGovGuide = () => {
    setSyncing(true);
    setStatusMsg(null);
    chrome.runtime.sendMessage({ type: 'SYNC_FROM_GOVGUIDE', payload: { citizenId: 'active' } }, (res) => {
      setSyncing(false);
      if (res && res.vault) {
        setVault(res.vault);
        setEditFormData(res.vault);
        setIsOnline(true);
        flash({ text: 'In sync with GovGuide PH (My Details).', type: 'success' });
      } else {
        setIsOnline(false);
        flash({ text: 'Unable to connect to GovGuide PH. Ensure the web app is running.', type: 'warning' }, 4500);
      }
    });
  };

  const handleAutofillActiveTab = () => {
    setAutofilling(true);
    setStatusMsg(null);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs[0]?.id;
      if (!activeTabId) {
        setAutofilling(false);
        flash({ text: 'No active browser tab found.', type: 'warning' });
        return;
      }
      chrome.tabs.sendMessage(activeTabId, { type: 'DETECT_FIELDS_REQUEST' }, (response) => {
        if (chrome.runtime.lastError) {
          setAutofilling(false);
          flash({ text: 'Please refresh the active government portal page to enable autofill.', type: 'warning' }, 4500);
          return;
        }
        if (response && response.summary && response.summary.fields && response.summary.fields.length > 0) {
          const fields = response.summary.fields;
          chrome.tabs.sendMessage(activeTabId, { type: 'TRIGGER_AUTOFILL', payload: { fields } }, (autofillRes) => {
            setAutofilling(false);
            if (autofillRes && autofillRes.success) {
              flash({ text: `Filled ${autofillRes.filledCount} verified fields on the active portal.`, type: 'success' }, 4000);
            } else {
              flash({ text: 'Autofill completed.', type: 'success' }, 3500);
            }
          });
        } else {
          setAutofilling(false);
          flash({ text: 'No recognized Philippine government form fields on this page.', type: 'warning' }, 4000);
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

    // Save to local extension vault
    chrome.runtime.sendMessage({
      type: 'SAVE_VAULT',
      payload: { vault: editFormData },
    });

    // Also push back to GovGuide PH web server to keep web session in sync
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
              display_name: [editFormData.firstName, editFormData.middleName, editFormData.lastName, editFormData.suffix].filter(Boolean).join(' ').trim(),
              gender: editFormData.gender,
              birth_date: editFormData.dateOfBirth,
              father_name: editFormData.fatherFullName || [editFormData.fatherFirstName, editFormData.fatherMiddleName, editFormData.fatherLastName].filter(Boolean).join(' ').trim(),
              father_first_name: editFormData.fatherFirstName,
              father_middle_name: editFormData.fatherMiddleName,
              father_last_name: editFormData.fatherLastName,
              mother_maiden_name: [editFormData.motherMaidenFirstName, editFormData.motherMaidenMiddleName, editFormData.motherMaidenLastName].filter(Boolean).join(' ').trim(),
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
              passport_number: editFormData.passportNumber,
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
        flash({ text: 'Details saved and synchronized with GovGuide PH.', type: 'success' }, 3000);
      } catch {
        flash({ text: 'Saved to local vault (offline mode).', type: 'warning' }, 3000);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Citizen Mini Chatbot Handlers
  // ---------------------------------------------------------------------------

  useEffect(() => {
    loadStoredCitizenChat().then((msgs) => {
      if (msgs && msgs.length > 0) {
        setChatMessages(msgs);
      }
    });
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendChatMessage = (overrideText?: string) => {
    const text = (overrideText !== undefined ? overrideText : chatInput).trim();
    if (!text || isChatLoading) return;

    const userMsg: CitizenChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantMsgId = `asst-${Date.now()}`;
    const placeholderAssistantMsg: CitizenChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...chatMessages, userMsg, placeholderAssistantMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsChatLoading(true);

    let accumulatedContent = '';

    streamCitizenChat({
      messages: [...chatMessages, userMsg],
      apiBaseUrl: session?.apiBaseUrl || 'http://localhost:3000',
      onToken: (token) => {
        accumulatedContent += token;
        setChatMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m))
        );
      },
      onSources: (sources) => {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, sources } : m))
        );
      },
      onGuardrailBlocked: (category) => {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, guardrailBlocked: true, guardrailCategory: category as any } : m))
        );
      },
      onDone: () => {
        setIsChatLoading(false);
        setChatMessages((prev) => {
          saveStoredCitizenChat(prev);
          return prev;
        });
      },
      onError: () => {
        setIsChatLoading(false);
      },
    });
  };

  const handleClearCitizenChat = () => {
    const initial = [INITIAL_GREETING_MESSAGE];
    setChatMessages(initial);
    saveStoredCitizenChat(initial);
    flash({ text: 'Chat history reset.', type: 'success' }, 2000);
  };

  // ---------------------------------------------------------------------------
  // Agency side
  // ---------------------------------------------------------------------------

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchAgencyRequests(value), 300);
  };

  const pushRequestUpdate = (
    payload: { processStatus?: ProcessStatus; note?: string; appointmentSchedule?: string },
    onDone: (ok: boolean) => void,
    successText: string
  ) => {
    if (!selectedReq) return;
    chrome.runtime.sendMessage(
      {
        type: 'UPDATE_REQUEST_STATUS',
        payload: {
          requestId: selectedReq.id,
          officerName: session?.fullName,
          ...payload,
        },
      },
      (res) => {
        if (res && res.success && res.data) {
          const updated: AgencyServiceRequest = res.data;
          setSelectedReq(updated);
          setProcessStatus(updated.processStatus);
          setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          flash({ text: successText, type: 'success' }, 4000);
          onDone(true);
        } else {
          flash({ text: `Error: ${res?.error || 'Failed to update request'}`, type: 'error' }, 4500);
          onDone(false);
        }
      }
    );
  };

  const handleAddNote = () => {
    if (!selectedReq || !noteDraft.trim()) return;
    setIsAddingNote(true);
    pushRequestUpdate(
      { note: noteDraft.trim() },
      (ok) => {
        setIsAddingNote(false);
        if (ok) setNoteDraft('');
      },
      `Note added to ${selectedReq.id}.`
    );
  };

  const handleProceed = () => {
    if (!selectedReq) return;
    setIsUpdating(true);
    pushRequestUpdate(
      {
        processStatus,
        note: noteDraft.trim() || undefined,
      },
      (ok) => {
        setIsUpdating(false);
        if (ok) setNoteDraft('');
      },
      `${selectedReq.id} set to ${processLabel(processStatus)}. Citizen notified.`
    );
  };

  const handleDraftLetter = (overrideKeywords?: string) => {
    const kw = (overrideKeywords !== undefined ? overrideKeywords : aiKeywords).trim();
    if (!kw || !selectedReq) return;
    const result = generateOfficialNoticeLetter({
      keywords: kw,
      citizenName: selectedReq.citizenName || 'Citizen Applicant',
      serviceTitle: selectedReq.serviceTitle,
      referenceNumber: selectedReq.referenceNumber,
      agencyCode: selectedReq.agencyCode,
      agencyName: selectedReq.agencyName,
      officerName: session?.fullName || 'Consular Officer Maria Teresa Gomez',
      officerRole: 'Supervising Verification Officer',
      location: selectedReq.location,
    });
    setAiGeneratedLetter(result);
    setAiLetterDraft(result.letterText);
    setProcessStatus(result.suggestedStatus);
    setAiIsEditingLetter(false);
    flash({ text: `Drafted official letter for ${selectedReq.citizenName}.`, type: 'success' }, 3000);
  };

  const handleSendAiLetter = () => {
    if (!selectedReq || !aiLetterDraft) return;
    setIsUpdating(true);
    pushRequestUpdate(
      {
        processStatus: aiGeneratedLetter?.suggestedStatus || processStatus,
        note: aiLetterDraft,
        appointmentSchedule: aiGeneratedLetter?.appointmentSchedule || selectedReq.appointmentSchedule,
      },
      (ok) => {
        setIsUpdating(false);
        if (ok) {
          setAiKeywords('');
          flash({ text: `Official email letter dispatched to ${selectedReq.citizenName}'s notifications!`, type: 'success' }, 4500);
        }
      },
      `Official email letter sent directly to ${selectedReq.citizenName}'s notifications!`
    );
  };

  const getInitials = (v: CitizenVaultData): string => {
    const f = (v.firstName || '')[0];
    const l = (v.lastName || '')[0];
    return (f && l ? `${f}${l}` : (v.firstName || v.lastName || 'CA').slice(0, 2)).toUpperCase();
  };

  const formatNoteTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 10px' }} />
        <p style={{ fontSize: 13, fontWeight: 600 }}>Loading GovGuide PH...</p>
      </div>
    );
  }

  const isAuthed = !!session?.isAuthenticated;
  const isAgency = isAuthed && isAgencyRole(session?.userRole);

  const header = (
    <header className="popup-header">
      <div className="brand-section">
        <img src="icons/logo.png" alt="GovGuide PH" className="brand-logo" />
        <div className="brand-titles">
          <div className="brand-name">
            <span>GovGuide PH</span>
            <span className="brand-badge">Bilis-Pila</span>
          </div>
          {isAgency && <span className="brand-subtitle">Agency Counter Bridge</span>}
        </div>
      </div>

      {isAuthed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`role-pill-btn ${isAgency ? 'agency' : 'citizen'}`} style={{ cursor: 'default' }}>
            {isAgency ? `Agency${session?.agencyCode ? ` · ${session.agencyCode}` : ''}` : 'Citizen'}
          </span>
          <button onClick={handleLogout} className="signout-btn" title="Sign out">
            Sign out
          </button>
        </div>
      )}
    </header>
  );

  const banner = statusMsg && (
    <div className={`notification-banner ${statusMsg.type}`}>
      <span>{statusMsg.text}</span>
      <button
        onClick={() => setStatusMsg(null)}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.7 }}
      >
        ×
      </button>
    </div>
  );

  // LOGIN SCREEN
  if (!isAuthed) {
    return (
      <div className="popup-container">
        {header}
        <div className="tab-content" style={{ justifyContent: 'center' }}>
          <form className="vault-card login-card" onSubmit={handleLogin}>
            <div className="login-title">Sign in</div>
            <div className="login-subtitle">Use your GovGuide PH citizen or agency account.</div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                autoComplete="username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            {loginError && <div className="login-error">{loginError}</div>}

            <button type="submit" className="btn-autofill" disabled={loggingIn} style={{ width: '100%', marginTop: 14 }}>
              {loggingIn ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="login-divider"><span>or</span></div>

            <button type="button" className="btn-sync" onClick={handleOpenWebLogin} style={{ width: '100%' }}>
              Sign in on GovGuide PH web portal
            </button>
            <p className="login-hint">
              Keep GovGuide PH open in your browser tab to synchronize your details automatically.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // AGENCY SIDE
  if (isAgency) {
    return (
      <div className="popup-container">
        {header}
        {banner}

        <div className="tab-content">
          {/* Search */}
          <div className="vault-card">
            <label className="form-label" htmlFor="agency-search" style={{ display: 'block', marginBottom: 6, fontSize: 11 }}>
              Search Citizen Applications
            </label>
            <div className="search-wrap">
              <input
                id="agency-search"
                type="search"
                className="form-input search-input"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Reference no., request ID, citizen name, email or phone"
                autoFocus
              />
              {searching && <span className="spinner spinner-sm search-spinner" />}
            </div>

            <div className="request-results">
              {requests.length === 0 && !searching ? (
                <div className="empty-results">
                  {searchQuery ? `No applications match "${searchQuery}".` : 'No applications found for your agency.'}
                </div>
              ) : (
                requests.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectRequest(r)}
                    className={`request-row ${selectedReq?.id === r.id ? 'selected' : ''}`}
                  >
                    <div className="request-row-top">
                      <span className="agency-code-chip">{r.agencyCode}</span>
                      <span className="request-ref">{r.referenceNumber}</span>
                      <span className={`process-pill ${r.processStatus}`}>{processLabel(r.processStatus)}</span>
                    </div>
                    <div className="request-row-name">{r.citizenName}</div>
                    <div className="request-row-service">{r.serviceTitle}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Selected request */}
          {selectedReq && (
            <div className="vault-card">
              <div className="card-header-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title-name">{selectedReq.citizenName}</div>
                  <div className="card-title-sub">
                    {selectedReq.serviceTitle} · Ref {selectedReq.referenceNumber}
                  </div>
                </div>
                <span className={`process-pill ${selectedReq.processStatus}`}>{processLabel(selectedReq.processStatus)}</span>
              </div>

              {/* Status bar */}
              <span className="section-label">Status</span>
              <div className="status-bar" role="radiogroup" aria-label="Application status">
                {PROCESS_STATUS_OPTIONS.map((opt, i) => {
                  const activeIdx = PROCESS_STATUS_OPTIONS.findIndex((o) => o.value === processStatus);
                  const isActive = opt.value === processStatus;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => setProcessStatus(opt.value)}
                      className={`status-seg ${opt.value} ${isActive ? 'active' : ''} ${
                        processStatus === 'complete' && i < activeIdx ? 'passed' : ''
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* AI Chatbot: Keyword-to-Official Letter Engine */}
              <div className="agency-ai-card">
                <div className="agency-ai-header">
                  <div className="agency-ai-title">
                    <span>🤖</span> AI Notice Drafter (Keywords → Letter)
                  </div>
                  <span className="agency-ai-badge">RA 11032 Grounded</span>
                </div>

                <p style={{ fontSize: '10.5px', color: '#64748b', margin: '0 0 8px 0', lineHeight: 1.35 }}>
                  Enter keywords or counter notes. AI generates a standardized Citizen&apos;s Charter notice sent directly to the citizen&apos;s notifications &amp; email.
                </p>

                {/* Preset Keywords */}
                <div className="keyword-preset-row">
                  <button
                    type="button"
                    className="keyword-chip"
                    onClick={() => {
                      setAiKeywords('expired ID, need 2 valid government IDs');
                      handleDraftLetter('expired ID, need 2 valid government IDs');
                    }}
                  >
                    <span>⚠️</span> Expired / Missing ID
                  </button>
                  <button
                    type="button"
                    className="keyword-chip"
                    onClick={() => {
                      setAiKeywords('appointment scheduled Counter 3 Nov 10 10:00 AM biometrics');
                      handleDraftLetter('appointment scheduled Counter 3 Nov 10 10:00 AM biometrics');
                    }}
                  >
                    <span>🗓️</span> Counter Biometrics
                  </button>
                  <button
                    type="button"
                    className="keyword-chip"
                    onClick={() => {
                      setAiKeywords('unreadable PSA record, submit birth cert with clear registry number');
                      handleDraftLetter('unreadable PSA record, submit birth cert with clear registry number');
                    }}
                  >
                    <span>📑</span> PSA Record Issue
                  </button>
                  <button
                    type="button"
                    className="keyword-chip"
                    onClick={() => {
                      setAiKeywords('approved and printed, ready for pick up at counter or courier delivery');
                      handleDraftLetter('approved and printed, ready for pick up at counter or courier delivery');
                    }}
                  >
                    <span>✅</span> Ready for Release
                  </button>
                </div>

                {/* Keyword Input & Action */}
                <div className="ai-input-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Keywords: e.g. 'expired ID, need 2 valid IDs, Counter 3 Nov 5 10am'..."
                    value={aiKeywords}
                    onChange={(e) => setAiKeywords(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleDraftLetter();
                      }
                    }}
                    style={{ flex: 1, margin: 0, fontSize: '11px' }}
                  />
                  <button
                    type="button"
                    className="btn-draft-letter"
                    onClick={() => handleDraftLetter()}
                    disabled={!aiKeywords.trim()}
                  >
                    Draft ✨
                  </button>
                </div>

                {/* Generated Letter Preview Card */}
                {aiGeneratedLetter && (
                  <div className="official-letter-card">
                    <div className="official-letter-header">
                      <span className="letterhead-flag">🇵🇭</span>
                      <div className="letterhead-title">{aiGeneratedLetter.agency}</div>
                      <div className="letterhead-sub">REPUBLIC OF THE PHILIPPINES · CITIZEN&apos;S CHARTER NOTICE</div>
                    </div>

                    <div className="official-letter-meta">
                      <span>Ref: <strong>{selectedReq.referenceNumber}</strong></span>
                      <span>Date: {aiGeneratedLetter.date}</span>
                    </div>

                    <div className="official-letter-subject">
                      Subject: {aiGeneratedLetter.subject}
                    </div>

                    {aiIsEditingLetter ? (
                      <textarea
                        rows={7}
                        className="form-input"
                        value={aiLetterDraft}
                        onChange={(e) => setAiLetterDraft(e.target.value)}
                        style={{
                          width: '100%',
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '10px',
                          lineHeight: 1.4,
                          margin: '4px 0 8px 0',
                        }}
                      />
                    ) : (
                      <div className="official-letter-body">
                        {aiLetterDraft}
                      </div>
                    )}

                    <div className="letter-action-row">
                      <button
                        type="button"
                        className="btn-send-letter"
                        onClick={handleSendAiLetter}
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Sending...' : '📨 Send Email Notice to Citizen'}
                      </button>
                      <button
                        type="button"
                        className="btn-edit-letter"
                        onClick={() => setAiIsEditingLetter(!aiIsEditingLetter)}
                      >
                        {aiIsEditingLetter ? '💾 Done' : '✏️ Edit'}
                      </button>
                      <button
                        type="button"
                        className="btn-edit-letter"
                        onClick={() => {
                          setAiGeneratedLetter(null);
                          setAiLetterDraft('');
                        }}
                      >
                        🔄 Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <span className="section-label" style={{ marginTop: 12 }}>Notes</span>
              {selectedReq.notes && selectedReq.notes.length > 0 ? (
                <div className="notes-list">
                  {[...selectedReq.notes].reverse().map((n) => (
                    <div key={n.id} className="note-item">
                      <div className="note-meta">
                        <span>{n.author}</span>
                        <span>{formatNoteTime(n.createdAt)}</span>
                      </div>
                      <div className="note-text">{n.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-results" style={{ padding: '6px 0' }}>No notes yet.</div>
              )}

              <textarea
                rows={2}
                className="form-input"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Write a note for this application..."
                style={{ marginTop: 6, resize: 'vertical' }}
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={isAddingNote || !noteDraft.trim()}
                className="btn-sync"
                style={{ width: '100%', marginTop: 6 }}
              >
                {isAddingNote ? 'Adding...' : 'Add Note'}
              </button>

              <button
                type="button"
                onClick={handleProceed}
                disabled={isUpdating}
                className="btn-autofill btn-proceed"
                style={{ width: '100%', marginTop: 12 }}
              >
                {isUpdating ? 'Saving...' : 'Proceed'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // CITIZEN SIDE
  return (
    <div className="popup-container">
      {header}
      {banner}

      <div className="tab-content">
        {!vault ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 12, fontWeight: 600 }}>Loading your details...</p>
          </div>
        ) : (
          <>
            {/* Action Row */}
            <div className="action-banner-row">
              <button
                onClick={handleAutofillActiveTab}
                disabled={autofilling}
                className="btn-autofill"
                title="Detect & autofill fields on active browser tab (PSA, DFA, NBI)"
              >
                {autofilling && <span className="spinner spinner-sm" />}
                <span>{autofilling ? 'Filling Fields...' : 'Autofill Form'}</span>
              </button>

              <button
                onClick={handleSyncGovGuide}
                disabled={syncing || autofilling}
                className="btn-sync"
                title="Fetch latest details from GovGuide PH"
              >
                {syncing && <span className="spinner spinner-sm" />}
                <span>{syncing ? 'Syncing...' : 'Sync from My Details'}</span>
              </button>
            </div>

            {/* Profile Card */}
            <div className="vault-card">
              <div className={`card-header-row ${!isProfileExpanded && !isEditing ? 'collapsed' : ''}`}>
                <div
                  className="card-header-left clickable"
                  onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                  title={isProfileExpanded ? 'Click to collapse details' : 'Click to expand details'}
                >
                  <div className="avatar-initials">{getInitials(vault)}</div>
                  <div>
                    <div className="card-title-name">
                      {[vault.firstName, vault.middleName, vault.lastName, vault.suffix].filter(Boolean).join(' ') || 'Citizen Applicant'}
                    </div>
                    <div className="card-title-sub">
                      {[vault.civilStatus, vault.gender, vault.dateOfBirth ? `Born ${vault.dateOfBirth}` : ''].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(!isEditing);
                      if (!isProfileExpanded) setIsProfileExpanded(true);
                      setEditFormData(vault);
                    }}
                    className={`edit-toggle-btn ${isEditing ? 'active' : ''}`}
                  >
                    <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                    className="collapse-toggle-btn"
                    title={isProfileExpanded ? 'Collapse details' : 'Expand all details'}
                    aria-expanded={isProfileExpanded}
                  >
                    <span>{isProfileExpanded ? 'Less' : 'More'}</span>
                    <span
                      style={{
                        fontSize: 9,
                        display: 'inline-block',
                        transition: 'transform 0.2s ease',
                        transform: isProfileExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▼
                    </span>
                  </button>
                </div>
              </div>

              {(isProfileExpanded || isEditing) && (
                <>
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
                      <span>Civil Registry &amp; Parents (PSA / NBI Essential)</span>
                    </div>
                    <div className="info-grid">
                      <div className="info-item info-col-span">
                        <span className="info-label">Mother&apos;s Maiden Name (Crucial for PSA Birth Certificate)</span>
                        <span className="info-val highlight">
                          {[vault.motherMaidenFirstName, vault.motherMaidenMiddleName, vault.motherMaidenLastName, vault.motherMaidenSuffix].filter(Boolean).join(' ') || 'Not specified'}
                        </span>
                        <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 2 }}>
                          First: {vault.motherMaidenFirstName || '—'} · Mid: {vault.motherMaidenMiddleName || '—'} · Last: {vault.motherMaidenLastName || '—'}
                        </div>
                      </div>

                      <div className="info-item info-col-span">
                        <span className="info-label">Father&apos;s Full Name</span>
                        <span className="info-val">
                          {[vault.fatherFirstName, vault.fatherMiddleName, vault.fatherLastName, vault.fatherSuffix].filter(Boolean).join(' ') || vault.fatherFullName || 'Not specified'}
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
                      <span>Government Identifiers (1-Click Copy)</span>
                    </div>
                    <div className="id-chips-grid">
                      {[
                        { key: 'philsys', label: 'PhilSys National ID', val: vault.philsysId },
                        { key: 'philhealth', label: 'PhilHealth PIN', val: vault.philhealthNumber },
                        { key: 'tin', label: 'BIR TIN', val: vault.tin },
                        { key: 'sss', label: 'SSS Number / CRN', val: vault.sssNumber },
                        { key: 'pagibig', label: 'Pag-IBIG MID', val: vault.pagibigMid },
                        { key: 'passport', label: 'DFA Passport No.', val: vault.passportNumber },
                      ].map((id) => (
                        <div key={id.key} className="id-card-item">
                          <div className="id-card-text">
                            <div className="id-card-label">{id.label}</div>
                            <div className="id-card-val">{id.val || '—'}</div>
                          </div>
                          {id.val && (
                            <button
                              onClick={() => handleCopyText(id.key, id.val)}
                              className={`copy-mini-btn ${copiedKey === id.key ? 'copied' : ''}`}
                              title={`Copy ${id.label}`}
                            >
                              {copiedKey === id.key ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact & Address Section */}
                  <div className="detail-group">
                    <div className="group-title">
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
                      {(
                        [
                          { field: 'firstName', label: 'First Name' },
                          { field: 'middleName', label: 'Middle Name' },
                          { field: 'lastName', label: 'Last Name' },
                          { field: 'dateOfBirth', label: 'Date of Birth (YYYY-MM-DD)' },
                          { field: 'motherMaidenFirstName', label: "Mother's Maiden First Name", span: true },
                          { field: 'motherMaidenMiddleName', label: "Mother's Maiden Middle" },
                          { field: 'motherMaidenLastName', label: "Mother's Maiden Last" },
                          { field: 'fatherFirstName', label: "Father's First Name" },
                          { field: 'fatherLastName', label: "Father's Last Name" },
                          { field: 'philsysId', label: 'PhilSys National ID' },
                          { field: 'philhealthNumber', label: 'PhilHealth PIN' },
                          { field: 'tin', label: 'BIR TIN' },
                          { field: 'sssNumber', label: 'SSS Number' },
                          { field: 'mobileNumber', label: 'Mobile Number', span: true },
                          { field: 'streetHouseNumber', label: 'Street / Unit / House No.', span: true },
                          { field: 'barangay', label: 'Barangay' },
                          { field: 'cityMunicipality', label: 'City / Municipality' },
                        ] as { field: keyof CitizenVaultData; label: string; span?: boolean }[]
                      ).map(({ field, label, span }) => (
                        <div key={field} className={`form-group ${span ? 'col-span-2' : ''}`}>
                          <label className="form-label">{label}</label>
                          <input
                            type="text"
                            className="form-input"
                            value={(editFormData[field] as string) || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, [field]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="edit-action-bar">
                      <button onClick={handleSaveEditForm} className="btn-save">
                        Save &amp; Sync Details
                      </button>
                      <button onClick={() => setIsEditing(false)} className="btn-cancel">
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              )}
                </>
              )}
            </div>

            {/* Citizen Mini Chatbot (Embedded RAG & RA 11032 Guardrails) */}
            <div className="citizen-mini-chat-card">
              <div className="mini-chat-header">
                <div className="mini-chat-title">
                  GovGuidePH ChatBot
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleClearCitizenChat}
                    className="btn-clear-chat"
                    title="Clear chat history"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="mini-chat-thread">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`mini-chat-bubble ${msg.role}`}>
                    <div className="mini-chat-content">
                      {msg.content || (isChatLoading && msg.role === 'assistant' ? 'Nagiisip...' : '')}
                    </div>

                    {msg.guardrailBlocked && (
                      <div className="mini-guardrail-banner">
                        <span>🛡️</span> Guardrail Active: {msg.guardrailCategory || 'RA 11032 Anti-Fixer Policy'}
                      </div>
                    )}

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mini-chat-sources">
                        {msg.sources.map((s, idx) => (
                          <span key={idx} className="mini-source-chip" title={`${s.service} · ${s.section || ''}`}>
                            📖 {s.agency}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Row */}
              <div className="mini-chat-input-row">
                <input
                  type="text"
                  className="mini-chat-input"
                  placeholder="Tanong sa requirements, valid IDs, fees (e.g. 'DFA passport')..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  disabled={isChatLoading}
                />
                <button
                  type="button"
                  onClick={() => handleSendChatMessage()}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="btn-mini-send"
                >
                  {isChatLoading ? '...' : 'Send ➤'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
