import fs from 'fs';
import path from 'path';
import { embedText, generateMockEmbedding } from '../ai/models';
import { chunkCharterMarkdown, type CharterChunk } from './chunker';
import { createServiceClient } from '../supabase/service';

function getAgencyNameByCode(code?: string): string {
  if (!code) return 'Government Agency';
  const c = code.toUpperCase();
  if (c === 'PSA') return 'Philippine Statistics Authority';
  if (c === 'NBI') return 'National Bureau of Investigation';
  if (c === 'PHILHEALTH') return 'Philippine Health Insurance Corporation';
  if (c === 'SSS') return 'Social Security System';
  if (c === 'PAGIBIG') return 'Home Development Mutual Fund (Pag-IBIG)';
  if (c === 'DFA') return 'Department of Foreign Affairs';
  if (c === 'DTI') return 'Department of Trade and Industry';
  if (c === 'BIR') return 'Bureau of Internal Revenue';
  if (c === 'PRC') return 'Professional Regulation Commission';
  if (c === 'LTO') return 'Land Transportation Office';
  if (c === 'DSWD') return 'Department of Social Welfare and Development';
  if (c === 'PHILSYS') return 'Philippine Identification System (PhilSys)';
  if (c === 'NCDA') return 'National Council on Disability Affairs';
  return 'Government Agency';
}

export interface RetrievedChunk {
  chunk: CharterChunk;
  similarity: number;
}

export interface RetrieveOptions {
  threshold?: number;
  limit?: number;
  agencyCode?: string;
  serviceCode?: string;
}

/**
 * Calculates cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface VectorIndexEntry {
  chunk: CharterChunk;
  embedding: number[];
}

let localVectorCache: VectorIndexEntry[] | null = null;

/**
 * Loads or builds in-memory vector index for fallback / offline execution.
 */
export async function getLocalVectorIndex(): Promise<VectorIndexEntry[]> {
  if (localVectorCache) return localVectorCache;

  const indexPath = path.resolve(process.cwd(), 'data/charters-index.json');
  if (fs.existsSync(indexPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      localVectorCache = data as VectorIndexEntry[];
      return localVectorCache;
    } catch {
      // ignore and rebuild
    }
  }

  // Build dynamically from data/charters directory
  const chartersDir = path.resolve(process.cwd(), 'data/charters');
  const index: VectorIndexEntry[] = [];

  if (fs.existsSync(chartersDir)) {
    const files = fs.readdirSync(chartersDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(chartersDir, file), 'utf-8');
      const chunks = chunkCharterMarkdown(content, file);
      for (const ch of chunks) {
        const emb = await embedText(ch.content);
        index.push({ chunk: ch, embedding: emb });
      }
    }
  }

  localVectorCache = index;
  return localVectorCache;
}

/**
 * Retrieves the most relevant Citizen Charter chunks for a citizen query.
 * Filters strictly against the similarity threshold.
 */
export async function retrieveCharterChunks(
  query: string,
  options: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const threshold = options.threshold ?? 0.65;
  const limit = options.limit ?? 4;
  const queryEmbedding = await embedText(query);

  // 1. Try Supabase RPC match_charter_chunks if configured
  const isSupabaseConfigured =
    Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !process.env.SUPABASE_URL?.includes('mock') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('mock');

  if (isSupabaseConfigured) {
    try {
      const supabase = createServiceClient();
      const rpcClient = supabase as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{
          data: {
            id: string;
            agency_id: string;
            service_id: string | null;
            title: string;
            content: string;
            metadata: unknown;
            similarity: number;
          }[] | null;
          error: unknown;
        }>;
      };

      const { data, error } = await rpcClient.rpc('match_charter_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        filter_agency_id: null,
        filter_service_id: null,
      });

      if (!error && data && data.length > 0) {
        return data.map((item) => {
          const aCode = (item.metadata as { agencyCode?: string })?.agencyCode || 'GOV';
          const aName = (item.metadata as { agencyName?: string })?.agencyName || getAgencyNameByCode(aCode);
          return {
            chunk: {
              id: item.id,
              agencyCode: aCode,
              agencyName: aName,
              serviceCode: (item.metadata as { serviceCode?: string })?.serviceCode || 'SERVICE',
              serviceName: (item.metadata as { serviceName?: string })?.serviceName || item.title,
              sectionTitle: item.title,
              content: item.content,
              fullBreadcrumb: item.title,
              metadata: (item.metadata as CharterChunk['metadata']) || { sourceFile: 'supabase' },
            },
            similarity: Math.round(item.similarity * 1000) / 1000,
          };
        });
      }
    } catch {
      // Continue to local index fallback
    }
  }

  // 2. Fallback to local vector search (guarantees offline test / CLI execution)
  const localIndex = await getLocalVectorIndex();
  const scored: RetrievedChunk[] = [];

  for (const entry of localIndex) {
    if (options.agencyCode && entry.chunk.agencyCode !== options.agencyCode) continue;
    if (options.serviceCode && entry.chunk.serviceCode !== options.serviceCode) continue;

    // Direct text / keyword boost for exact agency and service matching
    let baseSim = cosineSimilarity(queryEmbedding, entry.embedding);
    const queryLower = query.toLowerCase();
    const contentLower = entry.chunk.content.toLowerCase();
    const titleLower = entry.chunk.sectionTitle.toLowerCase();
    const agencyLower = entry.chunk.agencyCode.toLowerCase();

    // Agency & Service match boost
    if (
      (options.agencyCode && options.agencyCode.toLowerCase() === agencyLower) ||
      (queryLower.includes('nbi') && agencyLower === 'nbi') ||
      (queryLower.includes('psa') && agencyLower === 'psa') ||
      (queryLower.includes('philhealth') && agencyLower === 'philhealth')
    ) {
      baseSim += 0.35;
    }

    if (
      (queryLower.includes('clearance') && agencyLower === 'nbi') ||
      (queryLower.includes('birth') && agencyLower === 'psa') ||
      (queryLower.includes('pmrf') && agencyLower === 'philhealth') ||
      (queryLower.includes('registration') && agencyLower === 'philhealth')
    ) {
      baseSim += 0.25;
    }

    // Section relevance boost (Requirements, Fees, Procedures)
    if (
      (queryLower.includes('requirement') || queryLower.includes('kailangan') || queryLower.includes('dalhin')) &&
      titleLower.includes('requirement')
    ) {
      baseSim += 0.2;
    }

    if (
      (queryLower.includes('fee') || queryLower.includes('bayad') || queryLower.includes('libre') || queryLower.includes('cost')) &&
      (titleLower.includes('fee') || titleLower.includes('cost'))
    ) {
      baseSim += 0.2;
    }

    // Specific terms
    if (
      (queryLower.includes('first time') && contentLower.includes('first-time')) ||
      (queryLower.includes('hit') && contentLower.includes('hit')) ||
      (queryLower.includes('secpa') && contentLower.includes('secpa'))
    ) {
      baseSim += 0.15;
    }

    baseSim = Math.min(1.0, baseSim);

    if (baseSim >= threshold) {
      scored.push({
        chunk: entry.chunk,
        similarity: Math.round(baseSim * 1000) / 1000,
      });
    }
  }

  // Sort descending by similarity score
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}
