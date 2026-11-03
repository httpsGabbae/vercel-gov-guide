'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  DpwhProject,
  DpwhProjectCategory,
  DpwhProjectDocument,
  DpwhReview,
  IslandGroup,
} from '@/lib/dpwh/projects';
import {
  Building2,
  FileText,
  Image as ImageIcon,
  Star,
  Download,
  ThumbsUp,
  X,
  Plus,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  Search,
  Filter,
} from 'lucide-react';
import { safeResponseJson, parseResponseJson } from '@/lib/utils';

interface DpwhProjectsViewProps {
  citizenName?: string;
  onAskInChat?: (prompt: string) => void;
}

const CATEGORIES: (DpwhProjectCategory | 'ALL')[] = [
  'ALL',
  'Bridge & Marine Link',
  'Expressway & Bypass Road',
  'Flood Control & Drainage',
  'Tunnel & Mountain Pass',
  'Public Facility & Hospital',
];

function formatPhpBillions(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `₱${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `₱${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `₱${amount.toLocaleString()}`;
}

const DEFAULT_DOCUMENTS: DpwhProjectDocument[] = [
  {
    id: 'doc-001',
    title: 'Contract Agreement & Official Notice to Proceed (NTP)',
    fileType: 'PDF',
    fileSize: '4.2 MB',
    category: 'Contract & Award',
    publishedDate: '2024-10-15',
    downloadUrl: '#',
  },
  {
    id: 'doc-002',
    title: 'Detailed Engineering Design (DED) & Geotechnical Borehole Survey',
    fileType: 'PDF',
    fileSize: '18.5 MB',
    category: 'Detailed Engineering Design',
    publishedDate: '2024-06-20',
    downloadUrl: '#',
  },
  {
    id: 'doc-003',
    title: 'DENR-EMB Environmental Compliance Certificate (ECC)',
    fileType: 'PDF',
    fileSize: '2.1 MB',
    category: 'Environmental Compliance',
    publishedDate: '2024-03-12',
    downloadUrl: '#',
  },
  {
    id: 'doc-004',
    title: 'COA & DPWH Verified Physical Accomplishment Audit Report',
    fileType: 'PDF',
    fileSize: '1.4 MB',
    category: 'Progress Audit',
    publishedDate: '2026-09-30',
    downloadUrl: '#',
  },
];

const DEFAULT_PHOTOS_BY_CATEGORY: Record<string, string[]> = {
  'Bridge & Marine Link': [
    'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
  ],
  'Tunnel & Mountain Pass': [
    'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=1200&q=80',
  ],
  'Expressway & Bypass Road': [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=1200&q=80',
  ],
  'Flood Control & Drainage': [
    'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
  ],
  'Public Facility & Hospital': [
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
  ],
};

function getProjectPhotos(project: DpwhProject): string[] {
  if (Array.isArray(project.photos) && project.photos.length > 0) {
    return project.photos;
  }
  return DEFAULT_PHOTOS_BY_CATEGORY[project.category] || DEFAULT_PHOTOS_BY_CATEGORY['Bridge & Marine Link'];
}

function getProjectDocuments(project: DpwhProject): DpwhProjectDocument[] {
  if (Array.isArray(project.documents) && project.documents.length > 0) {
    return project.documents;
  }
  return DEFAULT_DOCUMENTS;
}

export function DpwhProjectsView({
  citizenName = 'Citizen',
  onAskInChat,
}: DpwhProjectsViewProps) {
  const [projects, setProjects] = useState<DpwhProject[]>([]);
  const [reviews, setReviews] = useState<DpwhReview[]>([]);
  const [loading, setLoading] = useState(true);

  const [islandFilter, setIslandFilter] = useState<IslandGroup | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<DpwhProjectCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({
    totalCount: 0,
    nationwideTotal: 12,
    totalBudgetPhp: 0,
    averageProgress: 0,
    byIsland: { Luzon: 6, Visayas: 2, Mindanao: 4 },
  });

  // Modal State
  const [activeModalProject, setActiveModalProject] = useState<DpwhProject | null>(null);
  const [modalTab, setModalTab] = useState<'info_docs' | 'reviews'>('info_docs');

  // Google Review Form State
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState(citizenName);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);

  // Lightbox for photos
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const loadProjectsAndReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (islandFilter !== 'ALL') params.set('islandGroup', islandFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/dpwh/projects?${params.toString()}`);
      if (res.ok) {
        const { data } = await safeResponseJson(res);
        setProjects(data?.projects || []);
        if (data?.stats) setStats(data.stats);
      }

      // Load reviews
      const revRes = await fetch('/api/dpwh/reviews');
      if (revRes.ok) {
        const { data: revData } = await safeResponseJson(revRes);
        if (revData && Array.isArray(revData.reviews)) {
          setReviews(revData.reviews);
        }
      }
    } catch (err) {
      console.error('Failed loading DPWH projects or reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [islandFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    void loadProjectsAndReviews();
  }, [loadProjectsAndReviews]);

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalProject || !reviewComment.trim()) return;

    try {
      setSubmittingReview(true);
      const res = await fetch('/api/dpwh/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeModalProject.id,
          authorName: reviewAuthor.trim() || citizenName,
          rating: reviewRating,
          comment: reviewComment.trim(),
          photos: reviewPhotos,
        }),
      });

      const data = await parseResponseJson(res);

      if (data.review) {
        setReviews((prev) => [data.review, ...prev]);
        setReviewComment('');
        setReviewPhotos([]);
        setIsWritingReview(false);
        setReviewSuccessMessage('Maraming salamat! Naipost na ang iyong review at mga larawan.');
        setTimeout(() => setReviewSuccessMessage(null), 4000);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddSamplePhoto = (url: string) => {
    if (!reviewPhotos.includes(url)) {
      setReviewPhotos((prev) => [...prev, url]);
    }
  };

  const getProjectReviews = (projectId: string) => {
    return reviews.filter((r) => r.projectId === projectId);
  };

  const computeProjectRating = (projectId: string) => {
    const projRevs = getProjectReviews(projectId);
    if (projRevs.length === 0) return { avg: 4.8, count: 5 };
    const avg = projRevs.reduce((sum, r) => sum + r.rating, 0) / projRevs.length;
    return { avg: Math.round(avg * 10) / 10, count: projRevs.length };
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Banner (No emojis) */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 text-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300">
                <Building2 className="w-3.5 h-3.5" />
                <span>DPWH INFRASTRUCTURE TRANSPARENCY PORTAL</span>
                <span>•</span>
                <span>NATIONWIDE TRACKER</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Department of Public Works and Highways (DPWH)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Opisyal na monitoring ng mga pangunahing tulay, kalsada, bypass expressways, flood control, at ospital. Bukas sa mga review at larawan mula sa mga mamamayan.
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-xs border border-white/10">
              <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">
                DPWH Citizen Hotline
              </span>
              <span className="text-lg font-bold">165-02 / (02) 5304-3000</span>
              <span className="text-[11px] text-slate-300">citizens_feedback@dpwh.gov.ph</span>
            </div>
          </div>

          {/* Summary KPI Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 p-3.5 border border-white/10">
              <p className="text-[11px] font-medium text-slate-300">Active Projects</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {stats.totalCount}{' '}
                <span className="text-xs font-normal text-slate-300">
                  of {stats.nationwideTotal}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3.5 border border-white/10">
              <p className="text-[11px] font-medium text-slate-300">Combined Allocation</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">
                {formatPhpBillions(stats.totalBudgetPhp)}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3.5 border border-white/10">
              <p className="text-[11px] font-medium text-slate-300">Avg. Accomplishment</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{stats.averageProgress}%</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3.5 border border-white/10">
              <p className="text-[11px] font-medium text-slate-300">Coverage</p>
              <p className="mt-1 text-xs font-semibold text-white leading-relaxed">
                Luzon: {stats.byIsland.Luzon} · Visayas: {stats.byIsland.Visayas} · Mindanao: {stats.byIsland.Mindanao}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Island Group Tabs */}
            <div className="flex flex-wrap items-center gap-1.5" role="tablist">
              {(['ALL', 'Luzon', 'Visayas', 'Mindanao'] as const).map((island) => {
                const active = islandFilter === island;
                return (
                  <button
                    key={island}
                    type="button"
                    onClick={() => setIslandFilter(island)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {island === 'ALL' ? 'All Regions' : island}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bridge, tunnel, road, province, or contract ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  {cat === 'ALL' ? 'All Categories' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Loading nationwide DPWH projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-2">
            <p className="text-base font-semibold text-slate-800">
              Walang DPWH project na tumugma sa filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setIslandFilter('ALL');
                setCategoryFilter('ALL');
                setSearchQuery('');
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              I-reset ang Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const isNearCompletion = project.physicalProgress >= 80;
              const { avg, count } = computeProjectRating(project.id);

              return (
                <article
                  key={project.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          {project.islandGroup}
                        </span>
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                          {project.category}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isNearCompletion
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>

                    {/* Title & Location */}
                    <div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Contract ID: {project.contractId} · {project.region}
                      </div>
                      <h2 className="mt-0.5 text-base font-bold text-slate-900 leading-snug">
                        {project.title}
                      </h2>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        {project.cityMunicipality} ({project.province})
                      </p>
                    </div>

                    {/* Physical Progress Bar */}
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Physical Accomplishment</span>
                        <span className="font-bold text-slate-900">
                          {project.physicalProgress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isNearCompletion ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, project.physicalProgress)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>Scope: {project.lengthOrScope}</span>
                        <span>Target: {project.targetCompletionDate}</span>
                      </div>
                    </div>

                    {/* Simple Description */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {project.description}
                    </p>

                    {/* Budget & Review Badge */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10.5px] text-slate-400 block">Budget / Allocation</span>
                        <span className="font-bold text-slate-900">
                          {formatPhpBillions(project.budgetPhp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span className="font-bold text-xs text-amber-950">{avg}</span>
                        <span className="text-[11px] text-slate-500">({count} reviews)</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons (WHAT TO SEE & GOOGLE REVIEWS) */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModalProject(project);
                        setModalTab('info_docs');
                        setIsWritingReview(false);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-xs"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Photos &amp; Documents</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveModalProject(project);
                        setModalTab('reviews');
                        setIsWritingReview(false);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Google Reviews</span>
                    </button>

                    {onAskInChat && (
                      <button
                        type="button"
                        onClick={() =>
                          onAskInChat(
                            `Sabihin ang detalye ng DPWH ${project.title} (${project.contractId}) sa ${project.cityMunicipality}, physical progress nito, budget, at target completion date.`,
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        title="Tanungin sa AI Chat"
                      >
                        Ask AI
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* DPWH Project Details, Photos, Docs & Google Reviews Modal */}
      {activeModalProject && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl space-y-4 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                    {activeModalProject.category}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    Contract ID: {activeModalProject.contractId}
                  </span>
                </div>
                <h2 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {activeModalProject.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalProject(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 gap-6">
              <button
                type="button"
                onClick={() => setModalTab('info_docs')}
                className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
                  modalTab === 'info_docs'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photos &amp; Documents</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('reviews')}
                className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
                  modalTab === 'reviews'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Star className="w-4 h-4 text-amber-500" />
                <span>Google Reviews ({getProjectReviews(activeModalProject.id).length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 pb-6 space-y-6">
              {modalTab === 'info_docs' && (
                <div className="space-y-6">
                  {/* WHAT TO SEE: Information Bar */}
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Project Information Summary
                    </h3>

                    {/* Simple project description */}
                    <p className="text-sm text-slate-800 leading-relaxed">
                      {activeModalProject.description}
                    </p>

                    {/* Key Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Location</span>
                        <span className="font-bold text-slate-900">
                          {activeModalProject.cityMunicipality}, {activeModalProject.province}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {activeModalProject.region} ({activeModalProject.islandGroup})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Budget / Allocation</span>
                        <span className="font-bold text-slate-900">
                          {formatPhpBillions(activeModalProject.budgetPhp)}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Funded by {activeModalProject.fundingSource}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Status &amp; Target</span>
                        <span className="font-bold text-emerald-700">
                          {activeModalProject.status} ({activeModalProject.physicalProgress}%)
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Completion: {activeModalProject.targetCompletionDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Photos Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-blue-600" />
                        <span>Construction Site Photos</span>
                      </h3>
                      <span className="text-xs text-slate-500">
                        {getProjectPhotos(activeModalProject).length} Verified Photos
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {getProjectPhotos(activeModalProject).map((photoUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewPhoto(photoUrl)}
                          className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-video hover:shadow-md transition-all"
                        >
                          <img
                            src={photoUrl}
                            alt={`${activeModalProject.title} Site Photo ${idx + 1}`}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                            View Photo
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PROVIDE THE DOCS: Official Documents Section */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span>Official Project Documents &amp; Certificates</span>
                      </h3>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        FOI Public Access
                      </span>
                    </div>

                    <div className="space-y-2">
                      {getProjectDocuments(activeModalProject).map((doc) => (
                        <div
                          key={doc.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:bg-slate-100/70 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 font-bold text-xs">
                              {doc.fileType}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{doc.title}</p>
                              <p className="text-[11px] text-slate-500">
                                {doc.category} · {doc.fileSize} · Published: {doc.publishedDate}
                              </p>
                            </div>
                          </div>

                          <a
                            href={doc.downloadUrl}
                            onClick={(e) => {
                              e.preventDefault();
                              alert(`Downloading official document: "${doc.title}" (${doc.fileSize})`);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>Download PDF</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* GOOGLE REVIEWS STYLE SECTION */}
              {modalTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Google Reviews Header Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Left: Overall score & stars */}
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <span className="text-4xl font-extrabold text-slate-900">
                            {computeProjectRating(activeModalProject.id).avg}
                          </span>
                          <div className="flex items-center justify-center gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= Math.round(computeProjectRating(activeModalProject.id).avg)
                                    ? 'fill-amber-400 text-amber-500'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            {getProjectReviews(activeModalProject.id).length} citizen reviews
                          </span>
                        </div>

                        {/* Breakdown bars */}
                        <div className="space-y-1 text-[11px] text-slate-600 w-40 sm:w-48">
                          <div className="flex items-center gap-1.5">
                            <span>5</span>
                            <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: '75%' }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>4</span>
                            <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: '20%' }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>3</span>
                            <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: '5%' }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>2</span>
                            <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: '0%' }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>1</span>
                            <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: '0%' }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Write Review Trigger */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsWritingReview((prev) => !prev)}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{isWritingReview ? 'Close Review Form' : 'Write a Review'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {reviewSuccessMessage && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>{reviewSuccessMessage}</span>
                    </div>
                  )}

                  {/* Interactive Review Composer Form (Like Google Review) */}
                  {isWritingReview && (
                    <form
                      onSubmit={handlePostReview}
                      className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                          Submit Your Citizen Review &amp; Photos
                        </span>
                        <span className="text-[11px] text-blue-700">Verified Citizen Feedback</span>
                      </div>

                      {/* Star Rating Picker */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          How would you rate this infrastructure project?
                        </label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-1 text-slate-300 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= reviewRating
                                    ? 'fill-amber-400 text-amber-500'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-xs font-bold text-slate-800">
                            {reviewRating} out of 5 stars
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Your Name
                          </label>
                          <input
                            type="text"
                            value={reviewAuthor}
                            onChange={(e) => setReviewAuthor(e.target.value)}
                            placeholder="Your Name (e.g. Juan Santos Dela Cruz)"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>

                      {/* Review Text */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Share your experience and site observation
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Tell citizens about the construction progress, road condition, traffic flow, safety signage, or equipment on site..."
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                        />
                      </div>

                      {/* Photo Upload / Attachment */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Add Site Photos (Click specimen photo or add URL)
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleAddSamplePhoto(
                                'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80',
                              )
                            }
                            className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Sample Site Photo 1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddSamplePhoto(
                                'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80',
                              )
                            }
                            className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Sample Site Photo 2
                          </button>
                        </div>

                        {/* Photo Previews */}
                        {reviewPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {reviewPhotos.map((url, idx) => (
                              <div
                                key={idx}
                                className="relative rounded-lg overflow-hidden border border-slate-200 w-16 h-16 bg-slate-100"
                              >
                                <img
                                  src={url}
                                  alt="Attached"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReviewPhotos((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Post Review Button */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-blue-200/60">
                        <button
                          type="button"
                          onClick={() => setIsWritingReview(false)}
                          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingReview || !reviewComment.trim()}
                          className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                          {submittingReview ? 'Posting...' : 'Post Citizen Review'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Citizen Reviews Feed (Google Reviews Style) */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      All Citizen Reviews &amp; Site Photos
                    </h4>

                    {getProjectReviews(activeModalProject.id).length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                        Wala pang review para sa proyektong ito. Ikaw ang unang mag-iwan ng review at larawan!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getProjectReviews(activeModalProject.id).map((rev) => (
                          <div
                            key={rev.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs"
                          >
                            {/* Reviewer Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 font-bold text-xs text-white">
                                  {rev.authorName[0]?.toUpperCase() || 'C'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900">
                                      {rev.authorName}
                                    </span>
                                    <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 border border-blue-200">
                                      Verified Citizen
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">{rev.date}</span>
                                </div>
                              </div>

                              {/* Star Rating */}
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3.5 h-3.5 ${
                                      star <= rev.rating
                                        ? 'fill-amber-400 text-amber-500'
                                        : 'text-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Comment */}
                            <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                            {/* Citizen Tags */}
                            {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {rev.tags.map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Citizen Uploaded Photos */}
                            {Array.isArray(rev.photos) && rev.photos.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {rev.photos.map((photoUrl, pIdx) => (
                                  <div
                                    key={pIdx}
                                    onClick={() => setPreviewPhoto(photoUrl)}
                                    className="cursor-pointer overflow-hidden rounded-lg border border-slate-200 w-20 h-20 bg-slate-100 hover:opacity-90 transition-opacity"
                                  >
                                    <img
                                      src={photoUrl}
                                      alt="Citizen site photo"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Helpful button */}
                            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                              <button
                                type="button"
                                onClick={async () => {
                                  setReviews((prev) =>
                                    prev.map((r) =>
                                      r.id === rev.id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r,
                                    ),
                                  );
                                  try {
                                    await fetch('/api/dpwh/reviews', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: 'vote_helpful', reviewId: rev.id }),
                                    });
                                  } catch (err) {
                                    console.error('Failed to register helpful vote:', err);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-700 font-medium transition-colors"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                                <span>Makatulong / Helpful ({rev.helpfulCount})</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Photo Preview */}
      {previewPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-black">
            <img
              src={previewPhoto}
              alt="Site Photo Preview"
              className="max-h-[85vh] max-w-full object-contain"
            />
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 rounded-full bg-black/70 p-2 text-white hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
