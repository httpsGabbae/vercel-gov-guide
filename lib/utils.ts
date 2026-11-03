import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses JSON from a fetch Response, handling non-JSON error payloads
 * (e.g. 500 "Internal Server Error", HTML error pages, or empty bodies)
 * without throwing a SyntaxError.
 */
export async function parseResponseJson<T = any>(res: Response): Promise<T> {
  const text = await res.text().catch(() => '');
  let data: any = null;
  if (text && text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      // Body is not JSON (e.g. Next.js "Internal Server Error" or plain string)
      throw new Error(text.length < 200 ? text.trim() : `Request failed with status ${res.status}`);
    }
  }

  if (!res.ok) {
    const errorMsg =
      data?.message ||
      data?.error ||
      (typeof data === 'string' ? data : null) ||
      (text.length < 200 && text.trim() ? text.trim() : null) ||
      `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

/**
 * Safely parses response without throwing, returning a normalized result object.
 */
export async function safeResponseJson<T = any>(
  res: Response,
  fallback?: T
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const text = await res.text().catch(() => '');
    let data: any = null;
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        return {
          ok: false,
          status: res.status,
          data: fallback ?? null,
          error: text.length < 200 ? text.trim() : `Request failed with status ${res.status}`,
        };
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: data ?? fallback ?? null,
        error:
          data?.message ||
          data?.error ||
          (text.length < 200 && text.trim() ? text.trim() : null) ||
          `Request failed with status ${res.status}`,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: (data ?? fallback ?? null) as T,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: res.status,
      data: fallback ?? null,
      error: err?.message || 'Failed to parse response',
    };
  }
}
