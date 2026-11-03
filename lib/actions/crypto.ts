import crypto from 'crypto';

/**
 * Produces a deterministic canonical string representation of an object
 * by recursively sorting object keys.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalizeJson).join(',')}]`;
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${canonicalizeJson(val)}`;
  });

  return `{${pairs.join(',')}}`;
}

/**
 * Computes a SHA-256 cryptographic hash of canonicalized payload
 * to detect any post-proposal tampering.
 */
export function computePayloadHash(payload: unknown): string {
  const canonical = canonicalizeJson(payload);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Validates whether a provided payload matches an expected hash.
 */
export function verifyPayloadHash(payload: unknown, expectedHash: string): boolean {
  const currentHash = computePayloadHash(payload);
  return crypto.timingSafeEqual(Buffer.from(currentHash), Buffer.from(expectedHash));
}
