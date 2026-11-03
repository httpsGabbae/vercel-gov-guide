'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  Star,
  CheckSquare,
  Square,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { type CitizenServiceRequest, getCitizenRequests } from '@/lib/citizen/requests';
import type { InspectionReport } from '@/lib/services/charter-sources';

export interface EmailNotificationItem {
  id: string;
  senderName: string;
  senderEmail: string;
  senderAgencyCode: string;
  subject: string;
  snippet: string;
  paragraphs: string[];
  date: string;
  timestamp: string;
  isUnread: boolean;
  isStarred: boolean;
  badgeLabel?: string;
  badgeColor?: 'blue' | 'amber' | 'emerald' | 'slate';
  milestoneData: CitizenServiceRequest;
  aiPrompt: string;
}

interface GmailNotificationsViewProps {
  agencyMilestones: CitizenServiceRequest[];
  readNotificationIds?: string[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  inspections?: InspectionReport[];
  applicantName?: string;
  onAskInChat: (prompt: string) => void;
  onViewTasks?: () => void;
  onViewDetails?: () => void;
  onBackToChat?: () => void;
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative flex rounded-[9px] bg-[var(--fill-2)] p-[2px]"
    >
      <span
        aria-hidden="true"
        className="seg-pill absolute top-[2px] bottom-[2px] left-[2px] rounded-[7px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)]"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${100 * idx}%)`,
        }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={`seg-option press relative z-10 h-7 flex-1 rounded-[7px] text-[13px] font-medium transition-colors ${
            opt.value === value ? 'text-[var(--fg)]' : 'text-[var(--label-2)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function GmailNotificationsView({
  agencyMilestones,
  readNotificationIds = [],
  onMarkAsRead,
  onMarkAllAsRead,
  applicantName = 'Citizen Applicant',
  onAskInChat,
}: GmailNotificationsViewProps) {
  // Notifications are strictly from the ahensya extension
  const initialEmails: EmailNotificationItem[] = useMemo(() => {
    const list = agencyMilestones && agencyMilestones.length > 0 ? agencyMilestones : [];
    return list.map((req, idx) => {
      const isDfa = req.agencyCode === 'DFA';
      const isPsa = req.agencyCode === 'PSA';
      const isPhilhealth = req.agencyCode === 'PHILHEALTH';
      const isDpwh = req.agencyCode === 'DPWH';

      const senderEmail = isDfa
        ? 'passport.scheduling@dfa.gov.ph'
        : isPsa
        ? 'doorstep.delivery@psahelpline.ph'
        : isPhilhealth
        ? 'membership.verification@philhealth.gov.ph'
        : isDpwh
        ? 'publicworks.transparency@dpwh.gov.ph'
        : 'clearance.support@nbi.gov.ph';

      const subject = `[${req.agencyCode}] Update sa Inyong ${req.serviceTitle}`;

      // Extra text shown when collapsed, hidden when expanded
      const snippet = req.officerNotes
        ? `${req.statusLabel}: "${req.officerNotes}"`
        : `Hakbang ${req.currentStep}/5: ${req.statusLabel} · Ref #${req.referenceNumber}`;

      // Plain paragraphs for expanded message without warning icons or bg colors
      const paragraphs: string[] = [];
      if (req.officerNotes) {
        paragraphs.push(req.officerNotes);
      } else {
        paragraphs.push(
          `Magandang araw. Ang inyong aplikasyon para sa ${req.serviceTitle} (Reference #${req.referenceNumber}) ay kasalukuyang nasa Hakbang ${req.currentStep}/5: ${req.statusLabel}.`
        );
      }

      if (req.actionRequiredNotice) {
        paragraphs.push(`Paalala: ${req.actionRequiredNotice}`);
      }

      if (req.location) {
        paragraphs.push(`Opisyal na Sangay: ${req.location}`);
      }

      let formattedTime = '10:42 AM';
      try {
        if (req.updatedAt) {
          formattedTime = new Date(req.updatedAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        formattedTime = '10:42 AM';
      }

      const badgeColor =
        req.statusBadgeColor === 'emerald'
          ? 'emerald'
          : req.statusBadgeColor === 'amber'
          ? 'amber'
          : 'blue';

      const aiPrompt = `Kausapin ang AI tungkol sa update sa aking ${req.serviceTitle} (${req.statusLabel}). Ano ang kailangan kong malaman at gawin?`;

      return {
        id: `email-milestone-${req.id || idx}`,
        senderName: `${req.agencyName} (${req.agencyCode})`,
        senderEmail,
        senderAgencyCode: req.agencyCode,
        subject,
        snippet,
        paragraphs,
        date: 'Today',
        timestamp: formattedTime,
        isUnread: !readNotificationIds.includes(req.id),
        isStarred: false,
        badgeLabel: `Step ${req.currentStep}/5 · ${req.statusLabel}`,
        badgeColor,
        milestoneData: req,
        aiPrompt,
      };
    });
  }, [agencyMilestones, readNotificationIds]);

  // UI States
  const [emails, setEmails] = useState<EmailNotificationItem[]>(initialEmails);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
  const [expandedEmailIds, setExpandedEmailIds] = useState<Record<string, boolean>>({
    [initialEmails[0]?.id || '']: true,
  });
  const [selectedEmailIds, setSelectedEmailIds] = useState<Record<string, boolean>>({});

  // Sync state when incoming agency milestones change
  useEffect(() => {
    setEmails(initialEmails);
  }, [initialEmails]);

  // Toggle single email expand/collapse
  const toggleExpand = (id: string, reqId?: string) => {
    setExpandedEmailIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    // Mark as read when expanded
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isUnread: false } : e))
    );
    if (reqId && onMarkAsRead) {
      onMarkAsRead(reqId);
    }
  };

  // Expand all / Collapse all toggle
  const isAllExpanded = useMemo(() => {
    return emails.length > 0 && emails.every((e) => Boolean(expandedEmailIds[e.id]));
  }, [emails, expandedEmailIds]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedEmailIds({});
    } else {
      const all: Record<string, boolean> = {};
      emails.forEach((e) => {
        all[e.id] = true;
      });
      setExpandedEmailIds(all);
    }
  };

  // Toggle star
  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isStarred: !item.isStarred } : item
      )
    );
  };

  // Toggle select checkbox
  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedEmailIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const markSelectedAsRead = () => {
    setEmails((prev) =>
      prev.map((e) => (selectedEmailIds[e.id] ? { ...e, isUnread: false } : e))
    );
    if (onMarkAsRead) {
      emails.forEach((e) => {
        if (selectedEmailIds[e.id]) {
          onMarkAsRead(e.milestoneData.id);
        }
      });
    }
    setSelectedEmailIds({});
  };

  // Filtered emails by tab and search
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      if (activeTab === 'starred' && !item.isStarred) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.senderName.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.snippet.toLowerCase().includes(q) ||
        item.senderAgencyCode.toLowerCase().includes(q)
      );
    });
  }, [emails, activeTab, searchQuery]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-[1104px] px-4 sm:px-8 pt-10 pb-16">
        {/* Page Header — Replicating My Details Page Header Design */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[var(--hairline)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em] text-[var(--fg)]">
                Mga Abiso
              </h1>
            </div>
          </div>

          {/* Quick Search Field — Clean Input Design System */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--label-3)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Maghanap sa mga abiso..."
              className="field h-9 w-full pl-9 pr-3 text-[13px] text-[var(--fg)]"
            />
          </div>
        </header>

        {/* Filter Controls Row (Lahat & Starred tabs only, with Expand/Collapse All) */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="w-full sm:w-[280px]">
            <SegmentedControl
              label="Notification filters"
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: 'all', label: `Lahat (${emails.length})` },
                {
                  value: 'starred',
                  label: `Starred (${emails.filter((e) => e.isStarred).length})`,
                },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            {Object.values(selectedEmailIds).some(Boolean) && (
              <button
                type="button"
                onClick={markSelectedAsRead}
                className="row-btn press flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--hairline)] bg-white px-2.5 text-[12px] font-medium text-[var(--fg)] hover:bg-[var(--fill)] transition-colors shadow-2xs"
                title="I-mark as read ang napili"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                <span>I-mark as read</span>
              </button>
            )}

            {onMarkAllAsRead && emails.some((e) => e.isUnread) && (
              <button
                type="button"
                onClick={() => {
                  setEmails((prev) => prev.map((e) => ({ ...e, isUnread: false })));
                  onMarkAllAsRead();
                }}
                className="row-btn press flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--hairline)] bg-white px-2.5 text-[12px] font-medium text-[var(--fg)] hover:bg-[var(--fill)] transition-colors shadow-2xs"
                title="I-mark as read lahat"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>I-mark as read lahat</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleExpandAll}
              className="row-btn press flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--hairline)] bg-white px-2.5 text-[12px] font-medium text-[var(--fg)] hover:bg-[var(--fill)] transition-colors shadow-2xs"
              title={isAllExpanded ? 'I-collapse lahat' : 'I-expand lahat'}
            >
              {isAllExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 text-[var(--label-2)]" />
                  <span>I-collapse Lahat</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--label-2)]" />
                  <span>I-expand Lahat</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[12px] border border-[var(--hairline)] bg-white py-16 text-center shadow-xs">
              <Mail className="h-10 w-10 text-[var(--label-3)] mb-2" />
              <h3 className="text-sm font-semibold text-[var(--fg)]">Walang nahanap na abiso</h3>
              <p className="mt-1 text-xs text-[var(--label-2)]">
                {searchQuery
                  ? 'Walang tumutugma sa iyong hinahanap na keyword.'
                  : 'Walang aktibong abiso mula sa ahensya sa kasalukuyan.'}
              </p>
            </div>
          ) : (
            filteredEmails.map((email) => {
              const isExpanded = Boolean(expandedEmailIds[email.id]);
              const isSelected = Boolean(selectedEmailIds[email.id]);

              return (
                <div
                  key={email.id}
                  className={`overflow-hidden rounded-[12px] border transition-all duration-200 ${
                    isExpanded
                      ? 'border-blue-200 bg-white shadow-xs'
                      : email.isUnread
                      ? 'border-[var(--hairline)] bg-white shadow-2xs hover:border-slate-300'
                      : 'border-[var(--hairline)] bg-white/90 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Collapsed Header Bar — Click to toggle expansion */}
                  <div
                    onClick={() => toggleExpand(email.id, email.milestoneData.id)}
                    className={`flex cursor-pointer items-center gap-3 px-3.5 py-3 text-xs sm:px-4.5 select-none ${
                      email.isUnread ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleSelect(e, email.id)}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      aria-label="Select notification"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    {/* Star */}
                    <button
                      type="button"
                      onClick={(e) => toggleStar(e, email.id)}
                      className={`transition-colors ${
                        email.isStarred
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300 hover:text-amber-400'
                      }`}
                      aria-label="Star notification"
                    >
                      <Star className={`h-4 w-4 ${email.isStarred ? 'fill-amber-400' : ''}`} />
                    </button>

                    {/* Sender Name (No emoji icons) */}
                    <div className="flex w-36 shrink-0 items-center sm:w-44">
                      <span
                        className={`truncate text-xs ${
                          email.isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {email.senderName}
                      </span>
                    </div>

                    {/* Badge */}
                    {email.badgeLabel && (
                      <span
                        className={`hidden md:inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10.5px] font-bold tracking-tight uppercase ${
                          email.badgeColor === 'emerald'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : email.badgeColor === 'amber'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {email.badgeLabel}
                      </span>
                    )}

                    {/* Subject & Extra Text (Hidden when expanded, shown when collapsed) */}
                    <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
                      <span
                        className={`truncate ${
                          email.isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                        }`}
                      >
                        {email.subject}
                      </span>
                      {!isExpanded && (
                        <span className="truncate text-slate-400 font-normal">
                          — {email.snippet}
                        </span>
                      )}
                    </div>

                    {/* Timestamp & Expand Chevron */}
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                        {email.timestamp}
                      </span>
                      <span
                        className={`text-slate-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </div>
                  </div>

                  {/* Collapsible Expanded Message Body */}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                      isExpanded
                        ? 'grid-rows-[1fr] opacity-100 border-t border-[var(--hairline)]'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="p-4 sm:p-6 bg-white space-y-4">
                        {/* Sender & Receiver Info */}
                        <div className="border-b border-[var(--hairline)] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">
                              {email.senderName}
                            </span>
                            <span className="text-xs text-slate-400">
                              &lt;{email.senderEmail}&gt;
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Para kay: <strong className="text-slate-700">{applicantName}</strong> &lt;citizen@govguide.ph&gt;
                          </p>
                        </div>

                        {/* Plain Message Body — No warning icons, no bg color, no extra decorations */}
                        <div className="text-[13px] text-slate-700 leading-relaxed space-y-2">
                          {email.paragraphs.map((p, pIdx) => (
                            <p key={pIdx}>{p}</p>
                          ))}
                        </div>

                        {/* Single Action Button — Kausapin ang AI */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => onAskInChat(email.aiPrompt)}
                            className="row-btn press inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--fg)] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-slate-800 transition-colors shadow-2xs"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                            <span>Kausapin ang AI</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
