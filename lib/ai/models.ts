import { GoogleGenAI } from '@google/genai';

export const GEMINI_FLASH_MODEL = 'gemini-3.8-flash';
export const GEMINI_PRO_MODEL = 'gemini-4-argon';
export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSION = 768;

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Deterministic bag-of-words pseudo-embedding for testing or offline environments
 * when GEMINI_API_KEY is not configured. Produces high similarity for overlapping
 * concepts and near-zero similarity for unrelated queries.
 */
export function generateMockEmbedding(text: string, dimension = EMBEDDING_DIMENSION): number[] {
  const vector: number[] = new Array(dimension).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) {
    return vector;
  }

  for (const word of words) {
    let wordHash = 5381;
    for (let i = 0; i < word.length; i++) {
      wordHash = (wordHash * 33) ^ word.charCodeAt(i);
    }
    // Distribute word hash into sparse dimensions
    for (let d = 0; d < 12; d++) {
      const idx = Math.abs((wordHash + d * 1337) % dimension);
      const sign = (wordHash + d) % 2 === 0 ? 1 : -1;
      vector[idx] += sign;
    }
  }

  // Normalize vector to unit length
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

/**
 * Generates vector embedding for a single text chunk.
 * Uses official Gemini text-embedding-004 model or mock fallback if key is missing.
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return generateMockEmbedding(text);
  }

  try {
    const ai = getGeminiClient();
    const response = await ai.models.embedContent({
      model: GEMINI_EMBEDDING_MODEL,
      contents: text,
    });

    const values =
      response.embeddings?.[0]?.values ||
      (response as unknown as { embedding?: { values?: number[] } }).embedding?.values;

    if (values && Array.isArray(values)) {
      return values;
    }
    return generateMockEmbedding(text);
  } catch (err) {
    console.warn('[embedText] Fallback to mock embedding due to error:', err);
    return generateMockEmbedding(text);
  }
}

/**
 * Generates vector embeddings for a batch of text chunks.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const emb = await embedText(text);
    results.push(emb);
  }
  return results;
}
