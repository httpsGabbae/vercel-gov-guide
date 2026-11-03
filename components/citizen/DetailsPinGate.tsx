'use client';

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import {
  acceptDetailsAccess,
  clearDetailsAccess,
  detailsFetch,
  hasDetailsAccess,
  lockDetailsAccess,
  DETAILS_LOCK_EVENT,
} from '@/lib/citizen/details-access';

function PinBoxes({
  label,
  value,
  onChange,
  autoFocus = false,
  disabled = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  autoComplete: string;
}) {
  const id = useId();
  return (
    <div className="mx-auto w-full max-w-[272px]">
      <label htmlFor={id} className="mb-3 block text-center text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="group relative">
        <input
          id={id}
          aria-label={label}
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          minLength={4}
          maxLength={4}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          required
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 4))}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
        />
        <div aria-hidden="true" className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={
                'flex aspect-square items-center justify-center rounded-xl border text-2xl font-semibold text-blue-700 transition-colors motion-reduce:transition-none ' +
                (value[index] ? 'border-blue-200 bg-blue-50 ' : 'border-slate-200 bg-slate-100 ') +
                (index === Math.min(value.length, 3)
                  ? 'group-focus-within:border-blue-600 group-focus-within:ring-2 group-focus-within:ring-blue-100 '
                  : '') +
                (disabled ? 'opacity-50' : '')
              }
            >
              {value[index] ? '●' : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailsPinGate({
  userId,
  onUnlocked,
  onBack,
  children,
}: {
  userId?: string;
  onUnlocked: () => Promise<void>;
  onBack: () => void;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<'loading' | 'setup' | 'unlock' | 'open' | 'error'>('loading');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setMode('loading');
      if (!userId) {
        setMode('error');
        setMessage('Sign in to set up a PIN and access My Details.');
        return;
      }
      if (hasDetailsAccess(userId)) {
        setMode('open');
        return;
      }
      try {
        const response = await detailsFetch('/api/citizen/details/pin');
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to load PIN settings.');
        if (active) {
          setMode(result.configured ? 'unlock' : 'setup');
          setMessage('');
        }
      } catch (error) {
        if (active) {
          setMode('error');
          setMessage(error instanceof Error ? error.message : 'Please try again.');
        }
      }
    }
    void load();
    const locked = () => {
      setPin('');
      setConfirmation('');
      setMode('unlock');
    };
    window.addEventListener(DETAILS_LOCK_EVENT, locked);
    return () => {
      active = false;
      window.removeEventListener(DETAILS_LOCK_EVENT, locked);
    };
  }, [userId, reload]);

  useEffect(() => {
    if (!retryAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [retryAt]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !userId || retryAt > Date.now()) return;
    if (mode === 'setup' && pin !== confirmation) {
      setMessage('The PINs do not match. Please enter them again.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await detailsFetch('/api/citizen/details/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, pin, confirmPin: confirmation }),
      });
      const result = await response.json();
      setPin('');
      setConfirmation('');
      if (!response.ok) {
        if (result.code === 'ALREADY_CONFIGURED') setMode('unlock');
        if (result.code === 'SETUP_REQUIRED') setMode('setup');
        if (response.status === 429)
          setRetryAt(Date.now() + Number(response.headers.get('Retry-After') || 900) * 1000);
        throw new Error(result.message || 'Unable to unlock My Details.');
      }
      acceptDetailsAccess(userId, result.token, result.expiresAt);
      await onUnlocked();
      if (hasDetailsAccess(userId)) setMode('open');
    } catch (error) {
      if (hasDetailsAccess(userId)) clearDetailsAccess();
      setMessage(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'open' && userId && hasDetailsAccess(userId))
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex justify-end border-b border-slate-200 bg-white px-5 py-2">
          <button
            type="button"
            onClick={() => {
              void lockDetailsAccess().catch(() => {});
            }}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Lock My Details
          </button>
        </div>
        {children}
      </div>
    );
  const waiting = Math.max(0, Math.ceil((retryAt - now) / 1000));
  return (
    <section
      className="flex flex-1 items-center justify-center overflow-y-auto bg-slate-50 p-6"
      aria-label="My Details security"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
          My Details · PIN protection
        </p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">
          {mode === 'setup' ? 'Create your 4-digit PIN' : 'Unlock My Details'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {mode === 'setup'
            ? 'Set up your PIN once to protect your personal details and saved documents. Enter it again below to confirm.'
            : 'Enter your 4-digit PIN to access your personal details and saved documents.'}
        </p>
        {mode === 'loading' ? (
          <p role="status" className="mt-5 text-sm">
            Checking security settings…
          </p>
        ) : (
          mode !== 'error' && (
            <form onSubmit={submit} className="mt-7 space-y-6">
              <PinBoxes
                label="My Details PIN"
                value={pin}
                onChange={setPin}
                autoFocus
                disabled={busy || waiting > 0}
                autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
              />
              {mode === 'setup' && (
                <PinBoxes
                  label="Confirm My Details PIN"
                  value={confirmation}
                  onChange={setConfirmation}
                  disabled={busy || waiting > 0}
                  autoComplete="new-password"
                />
              )}
              <button
                type="submit"
                disabled={
                  busy ||
                  waiting > 0 ||
                  pin.length !== 4 ||
                  (mode === 'setup' && confirmation.length !== 4)
                }
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy
                  ? 'Verifying…'
                  : waiting > 0
                    ? `Try again in ${waiting}s`
                    : mode === 'setup'
                      ? 'Create PIN & unlock'
                      : 'Unlock'}
              </button>
            </form>
          )
        )}
        {message && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {message}
          </p>
        )}
        {mode === 'error' && userId && (
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="mt-4 text-sm font-semibold text-blue-700"
          >
            Try again
          </button>
        )}
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Access locks after 15 minutes or when you refresh. Your PIN stays set. Five wrong attempts
          pause unlocking for 15 minutes.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 text-sm font-semibold text-slate-600 hover:text-blue-700"
        >
          Back to chat
        </button>
      </div>
    </section>
  );
}
