'use client';

import { useState, useEffect } from 'react';
import type { CitizenPersonalizationProfile, UserPreferences } from '@/lib/ai/memory-store';

interface AdaptivePreferencesCardProps {
  citizenId: string;
}

export function AdaptivePreferencesCard({ citizenId }: AdaptivePreferencesCardProps) {
  const [profile, setProfile] = useState<CitizenPersonalizationProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/citizen/preferences?citizenId=${encodeURIComponent(citizenId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && isMounted) {
            setProfile(data.profile);
          }
        }
      } catch {
        // safe ignore
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [citizenId]);

  const handleUpdate = async (updates: Partial<UserPreferences>) => {
    setIsLoading(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/citizen/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId,
          preferences: updates,
          learning_enabled: updates.learning_enabled,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setProfile(data.profile);
          setSaveStatus('Nai-save ang mga kagustuhan!');
          setTimeout(() => setSaveStatus(null), 3000);
        }
      }
    } catch {
      setSaveStatus('Hindi nai-save, subukan muli.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Sigurado ka bang nais mong burahin ang naka-save na memory at bumalik sa default?')) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/citizen/preferences?citizenId=${encodeURIComponent(citizenId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setProfile(data.profile);
          setSaveStatus('Matagumpay na nabura ang memory.');
          setTimeout(() => setSaveStatus(null), 3000);
        }
      }
    } catch {
      setSaveStatus('Nagkaroon ng problema sa pagbura.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5h-2v-2h2zm0-4h-2V7h2z" />
            </svg>
          </span>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">AI Preferences</h3>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <span className="text-[12px] font-medium text-slate-700">Learning:</span>
          <input
            type="checkbox"
            checked={profile.learning_enabled}
            onChange={(e) => handleUpdate({ learning_enabled: e.target.checked })}
            disabled={isLoading}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className={`text-[11px] font-semibold ${profile.learning_enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
            {profile.learning_enabled ? 'Aktibo' : 'Naka-off'}
          </span>
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {/* Preferred Language */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Wika
          </label>
          <select
            value={profile.preferred_language}
            onChange={(e) =>
              handleUpdate({
                preferred_language: e.target.value as UserPreferences['preferred_language'],
              })
            }
            disabled={isLoading}
            className="h-9 w-full rounded-lg border border-[var(--hairline)] bg-[var(--fill)] px-2.5 text-[12px] font-medium text-slate-800"
          >
            <option value="Auto">Auto (Ayon sa Mensahe)</option>
            <option value="Taglish">Taglish (Natural PH Civic)</option>
            <option value="Tagalog">Filipino / Tagalog</option>
            <option value="English">English</option>
          </select>
        </div>

        {/* Response Length */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Haba ng Sagot
          </label>
          <select
            value={profile.preferred_response_length}
            onChange={(e) =>
              handleUpdate({
                preferred_response_length: e.target.value as UserPreferences['preferred_response_length'],
              })
            }
            disabled={isLoading}
            className="h-9 w-full rounded-lg border border-[var(--hairline)] bg-[var(--fill)] px-2.5 text-[12px] font-medium text-slate-800"
          >
            <option value="balanced">Balanced (Karaniwan)</option>
            <option value="concise">Concise (Maikli at Diretso)</option>
            <option value="detailed">Detailed (Step-by-Step at Buo)</option>
          </select>
        </div>

        {/* Communication Style */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Estilo
          </label>
          <select
            value={profile.communication_style}
            onChange={(e) =>
              handleUpdate({
                communication_style: e.target.value as UserPreferences['communication_style'],
              })
            }
            disabled={isLoading}
            className="h-9 w-full rounded-lg border border-[var(--hairline)] bg-[var(--fill)] px-2.5 text-[12px] font-medium text-slate-800"
          >
            <option value="warm">Warm & Magalang</option>
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] pt-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Zero PII stored</span>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && <span className="font-semibold text-emerald-600">{saveStatus}</span>}
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="rounded px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
          >
            I-reset
          </button>
        </div>
      </div>
    </div>
  );
}
