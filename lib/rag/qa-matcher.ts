import fs from 'fs';
import path from 'path';

export interface GovGuideQAEntry {
  id: string;
  section: string;
  question: string;
  answer: string;
  basis: 'design' | 'source-summary' | 'safe-response' | 'synthetic-scenario' | 'research-recommendation';
  source_ids: string[];
  checked: string;
  review_status: string;
  service?: string;
  template_family?: string;
  expected_behavior?: string;
  fixture?: string;
  resource?: string;
}

export interface GovGuideSource {
  id: string;
  title: string;
  url: string;
  scope: string;
  status: string;
  edition: string;
  checked: string;
}

export interface GovGuideDataResource {
  name: string;
  kind: string;
  source_ids: string[];
  format: string;
  license: string;
  role: string;
  limit: string;
  ingest: string;
  metric: string;
  status: string;
}

export interface QAMatchResult {
  entry: GovGuideQAEntry;
  score: number;
  sources: GovGuideSource[];
  isDirectMatch: boolean;
  serviceMatched?: string;
}

export interface QABankStats {
  totalRecords: number;
  sourcesCount: number;
  resourcesCount: number;
  sections: Record<string, number>;
  bases: Record<string, number>;
  services: Record<string, number>;
}

// In-memory cache
let qaCache: GovGuideQAEntry[] | null = null;
let sourcesCache: Map<string, GovGuideSource> | null = null;
let resourcesCache: GovGuideDataResource[] | null = null;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
    'it', 'its', 'my', 'your', 'ang', 'mga', 'sa', 'ng', 'ko', 'mo', 'akin', 'iyo', 'ba', 'po',
    'paano', 'ano', 'kailan', 'saan', 'bakit', 'pwede', 'puwede', 'how', 'what', 'can', 'should',
    'would', 'could', 'does', 'did', 'do'
  ]);
  return normalizeText(text)
    .split(' ')
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

/**
 * Loads and caches the 1,000 Q&A pairs, primary sources, and data resources.
 */
export function loadQABank(): {
  entries: GovGuideQAEntry[];
  sources: Map<string, GovGuideSource>;
  resources: GovGuideDataResource[];
} {
  if (qaCache && sourcesCache && resourcesCache) {
    return { entries: qaCache, sources: sourcesCache, resources: resourcesCache };
  }

  const baseDir = path.resolve(process.cwd(), 'data/research');

  // Load sources
  const sourcesPath = path.join(baseDir, 'sources.json');
  sourcesCache = new Map<string, GovGuideSource>();
  if (fs.existsSync(sourcesPath)) {
    try {
      const rawSources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8')) as GovGuideSource[];
      for (const s of rawSources) {
        sourcesCache.set(s.id, s);
      }
    } catch (err) {
      console.warn('[loadQABank] Failed reading sources.json:', err);
    }
  }

  // Load resources
  const resourcesPath = path.join(baseDir, 'data-resources.json');
  resourcesCache = [];
  if (fs.existsSync(resourcesPath)) {
    try {
      resourcesCache = JSON.parse(fs.readFileSync(resourcesPath, 'utf-8')) as GovGuideDataResource[];
    } catch (err) {
      console.warn('[loadQABank] Failed reading data-resources.json:', err);
    }
  }

  // Load Q&A entries
  const qaPath = path.join(baseDir, 'govguide-ph-qa.jsonl');
  qaCache = [];
  if (fs.existsSync(qaPath)) {
    try {
      const content = fs.readFileSync(qaPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        qaCache.push(JSON.parse(line) as GovGuideQAEntry);
      }
    } catch (err) {
      console.warn('[loadQABank] Failed reading govguide-ph-qa.jsonl:', err);
    }
  }

  return { entries: qaCache, sources: sourcesCache, resources: resourcesCache };
}

/**
 * Maps common query terms to standardized government service names.
 */
export function detectServiceFromQuery(query: string): string | null {
  const q = query.toLowerCase();
  if (q.includes('nbi') || q.includes('clearance')) return 'NBI clearance';
  if (q.includes('birth') || q.includes('kapanganakan')) return 'PSA birth certificate';
  if (q.includes('marriage') || q.includes('kasal')) return 'PSA marriage certificate';
  if (q.includes('cenomar') || q.includes('singleness')) return 'PSA CENOMAR';
  if (q.includes('philhealth') || q.includes('pmrf') || q.includes('mdr')) return 'PhilHealth registration';
  if (q.includes('sss') || q.includes('social security') || q.includes('e-1')) return 'SSS registration';
  if (q.includes('pag-ibig') || q.includes('pagibig') || q.includes('hdmf')) return 'Pag-IBIG membership';
  if (q.includes('passport') || q.includes('dfa')) return 'DFA passport preparation';
  if (q.includes('business name') || q.includes('dti') || q.includes('bnrs')) return 'DTI business-name registration';
  if (q.includes('tin') || q.includes('bir') || q.includes('tax identification')) return 'BIR Digital TIN and updates';
  if (q.includes('prc') || q.includes('leris') || q.includes('board exam') || q.includes('professional license')) return 'PRC LERIS services';
  if (q.includes('student permit') || q.includes('lto') || q.includes('driver')) return 'LTO student permit';
  if (q.includes('aics') || q.includes('dswd') || q.includes('financial assistance')) return 'DSWD AICS assistance';
  if (q.includes('national id') || q.includes('philsys') || q.includes('ephilid')) return 'Digital National ID';
  if (q.includes('pwd') || q.includes('disability') || q.includes('ncda') || q.includes('pdao')) return 'PWD ID routing';
  if (
    q.includes('dpwh') ||
    q.includes('infrastructure') ||
    q.includes('bridge') ||
    q.includes('expressway') ||
    q.includes('flood control') ||
    q.includes('tunnel') ||
    q.includes('bypass')
  ) {
    return 'DPWH nationwide infrastructure';
  }
  return null;
}

/**
 * Searches the 1,000 Q&A bank using hybrid BM25-style keyword matching,
 * section filters, and service relevance scoring.
 */
export function searchQABank(
  query: string,
  options: {
    topK?: number;
    threshold?: number;
    serviceFilter?: string;
    sectionFilter?: string;
    basisFilter?: GovGuideQAEntry['basis'][];
  } = {},
): QAMatchResult[] {
  const { topK = 4, threshold = 0.25, serviceFilter, sectionFilter, basisFilter } = options;
  const { entries, sources } = loadQABank();
  if (entries.length === 0) return [];

  const normQuery = normalizeText(query);
  const queryWords = extractKeywords(query);
  const detectedService = serviceFilter || detectServiceFromQuery(query);

  const scored: { entry: GovGuideQAEntry; score: number; isDirectMatch: boolean }[] = [];

  for (const entry of entries) {
    // Basis filter
    if (basisFilter && !basisFilter.includes(entry.basis)) continue;

    // Section filter
    if (sectionFilter && !entry.section.toLowerCase().includes(sectionFilter.toLowerCase())) continue;

    // Service filter
    if (serviceFilter && entry.service && entry.service.toLowerCase() !== serviceFilter.toLowerCase()) continue;

    const normQ = normalizeText(entry.question);
    const normA = normalizeText(entry.answer);

    // 1. Exact or substring match on question
    if (normQuery === normQ) {
      scored.push({ entry, score: 1.0, isDirectMatch: true });
      continue;
    }
    if (normQ.includes(normQuery) && normQuery.length > 15) {
      scored.push({ entry, score: 0.95, isDirectMatch: true });
      continue;
    }

    // 2. Keyword overlap scoring
    const questionWords = extractKeywords(entry.question);
    let matchedInQuestion = 0;
    for (const w of queryWords) {
      if (questionWords.includes(w) || normQ.includes(w)) {
        matchedInQuestion++;
      }
    }

    let matchedInAnswer = 0;
    for (const w of queryWords) {
      if (normA.includes(w)) {
        matchedInAnswer++;
      }
    }

    const questionScore = queryWords.length > 0 ? (matchedInQuestion / queryWords.length) * 0.7 : 0;
    const answerScore = queryWords.length > 0 ? (matchedInAnswer / queryWords.length) * 0.3 : 0;
    let totalScore = questionScore + answerScore;

    // 3. Service alignment boost
    if (detectedService && entry.service) {
      if (entry.service.toLowerCase() === detectedService.toLowerCase()) {
        totalScore += 0.25;
      }
    }

    // 4. Specific keyphrase boosts for civic topics
    const boostKeywords = [
      'balik-pila', 'hit', 'jobseeker', 'ra 11261', 'secpa', 'pmrf', 'tin', 'orus',
      'leris', 'aics', 'pwd', 'philsys', 'qr', 'rotation', 'blurry', 'dry seal',
      'fixer', 'peke', 'fake', 'lagay', 'spa', 'authorization', 'double', 'timeout'
    ];
    for (const bk of boostKeywords) {
      if (normQuery.includes(bk) && (normQ.includes(bk) || normA.includes(bk))) {
        totalScore += 0.15;
      }
    }

    totalScore = Math.min(1.0, Math.round(totalScore * 1000) / 1000);

    if (totalScore >= threshold) {
      scored.push({
        entry,
        score: totalScore,
        isDirectMatch: totalScore >= 0.85,
      });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(({ entry, score, isDirectMatch }) => {
    const resolvedSources = (entry.source_ids || [])
      .map((sid) => sources.get(sid))
      .filter((s): s is GovGuideSource => Boolean(s));

    return {
      entry,
      score,
      sources: resolvedSources,
      isDirectMatch,
      serviceMatched: entry.service,
    };
  });
}

/**
 * Returns a specific Q&A by ID (e.g. GGPH-0001).
 */
export function getQAById(id: string): { entry: GovGuideQAEntry; sources: GovGuideSource[] } | null {
  const { entries, sources } = loadQABank();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;

  const resolvedSources = (entry.source_ids || [])
    .map((sid) => sources.get(sid))
    .filter((s): s is GovGuideSource => Boolean(s));

  return { entry, sources: resolvedSources };
}

/**
 * Returns all Q&As for a specific government service.
 */
export function getQAsByService(serviceName: string): GovGuideQAEntry[] {
  const { entries } = loadQABank();
  const lower = serviceName.toLowerCase();
  return entries.filter(
    (e) => e.service && e.service.toLowerCase().includes(lower)
  );
}

/**
 * Returns document inspection scenarios (Section 12).
 */
export function getInspectionScenarios(serviceName?: string): GovGuideQAEntry[] {
  const { entries } = loadQABank();
  return entries.filter((e) => {
    const isInspection = e.section.startsWith('12 — Document inspection scenarios');
    if (!isInspection) return false;
    if (serviceName) {
      return e.service?.toLowerCase().includes(serviceName.toLowerCase());
    }
    return true;
  });
}

/**
 * Returns action confirmation scenarios (Section 13).
 */
export function getActionConfirmationScenarios(): GovGuideQAEntry[] {
  const { entries } = loadQABank();
  return entries.filter((e) => e.section.startsWith('13 — Action confirmation scenarios'));
}

/**
 * Returns statistics and coverage breakdown of the Q&A knowledge base.
 */
export function getQABankStats(): QABankStats {
  const { entries, sources, resources } = loadQABank();
  const sections: Record<string, number> = {};
  const bases: Record<string, number> = {};
  const services: Record<string, number> = {};

  for (const e of entries) {
    sections[e.section] = (sections[e.section] || 0) + 1;
    bases[e.basis] = (bases[e.basis] || 0) + 1;
    if (e.service) {
      services[e.service] = (services[e.service] || 0) + 1;
    }
  }

  return {
    totalRecords: entries.length,
    sourcesCount: sources.size,
    resourcesCount: resources.length,
    sections,
    bases,
    services,
  };
}
