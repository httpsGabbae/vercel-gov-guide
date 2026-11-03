import { describe, it, expect } from 'vitest';
import { cosineSimilarity, retrieveCharterChunks } from '../lib/rag/retrieve';
import { generateGroundedAnswer } from '../lib/rag/answer';

describe('M2 RAG Retrieval & Grounded Answering Tests', () => {
  describe('Cosine Similarity Math', () => {
    it('returns 1.0 for identical unit vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [1, 0, 0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
    });

    it('returns 0.0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0);
    });

    it('returns 0 for zero or mismatched vectors', () => {
      expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
      expect(cosineSimilarity([1, 2], [1])).toBe(0);
    });
  });

  describe('Charter Retrieval & Threshold Filtering', () => {
    it('retrieves relevant NBI clearance chunks for first-time jobseeker queries', async () => {
      const results = await retrieveCharterChunks('Libre ba ang NBI clearance para sa first-time jobseeker?');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.65);

      const hasNbi = results.some((r) => r.chunk.agencyCode === 'NBI');
      expect(hasNbi).toBe(true);
    });

    it('retrieves relevant PSA SECPA birth certificate chunks', async () => {
      const results = await retrieveCharterChunks('Paano kumuha ng birth certificate sa PSA gamit ang SECPA?');
      expect(results.length).toBeGreaterThan(0);

      const hasPsa = results.some((r) => r.chunk.agencyCode === 'PSA');
      expect(hasPsa).toBe(true);
    });

    it('filters out chunks that do not meet the strict threshold', async () => {
      const results = await retrieveCharterChunks('quantum mechanics semiconductor fabrication', {
        threshold: 0.99,
      });
      expect(results.length).toBe(0);
    });
  });

  describe('Grounded Answering & Fallback Behavior', () => {
    it('generates a grounded answer with sources and checklist for valid queries', async () => {
      const answerResult = await generateGroundedAnswer(
        'Ano ang mga kailangang dalhin para sa PhilHealth registration PMRF?',
      );

      expect(answerResult.isGrounded).toBe(true);
      expect(answerResult.sources.length).toBeGreaterThan(0);
      expect(answerResult.sources[0].breadcrumb).toBeDefined();
      expect(answerResult.answer).toContain('Citizen');
    });

    it('triggers graceful fallback with official agency hotline when no charter matches', async () => {
      const fallbackResult = await generateGroundedAnswer('Paano magluto ng authentic Ilocano Pinakbet?', {
        threshold: 0.95,
      });

      expect(fallbackResult.isGrounded).toBe(false);
      expect(fallbackResult.sources.length).toBe(0);
      expect(fallbackResult.answer).toContain('Paumanhin');
      expect(fallbackResult.fallbackContact).toBeDefined();
      expect(fallbackResult.fallbackContact?.hotline).toBeDefined();
    });
  });
});
