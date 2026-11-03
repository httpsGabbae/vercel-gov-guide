/** Classify failures without returning provider messages, document data, or credentials. */
export function inspectionProviderError(error: unknown) {
  const err = (error || {}) as {
    status?: number | string;
    name?: string;
    message?: string;
    cause?: { code?: string };
  };
  const providerStatus = Number(err.status) || 0;
  const timedOut =
    providerStatus === 408 ||
    providerStatus === 504 ||
    /timeout|timed out|abort/i.test(`${err.name || ''} ${err.message || ''}`) ||
    ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT'].includes(
      err.cause?.code || '',
    );

  if (providerStatus === 401 || providerStatus === 403)
    return {
      status: 503,
      providerStatus,
      code: 'INSPECTION_CREDENTIAL_ERROR',
      message:
        'The document service rejected its server credential. Check GEMINI_API_KEY on this deployment and redeploy.',
    };
  if (providerStatus === 429)
    return {
      status: 503,
      providerStatus,
      code: 'INSPECTION_RATE_LIMIT',
      message: 'The document service quota or rate limit was reached. Please retry later.',
    };
  if (providerStatus === 404)
    return {
      status: 503,
      providerStatus,
      code: 'INSPECTION_MODEL_UNAVAILABLE',
      message:
        'The configured inspection model is unavailable. Check GEMINI_INSPECTION_MODEL on the server.',
    };
  if (timedOut)
    return {
      status: 504,
      providerStatus,
      code: 'INSPECTION_TIMEOUT',
      message:
        'The document service took too long to respond. Please retry. Your document has not been verified.',
    };
  if (
    providerStatus === 400 ||
    providerStatus === 413 ||
    providerStatus === 415 ||
    providerStatus === 422
  )
    return {
      status: 422,
      providerStatus,
      code: 'INSPECTION_REQUEST_REJECTED',
      message:
        'The document service could not process this upload. Try a JPEG, PNG, WebP, or an unlocked PDF. If this continues, the server request configuration needs checking.',
    };
  return {
    status: 503,
    providerStatus,
    code: 'INSPECTION_PROVIDER_UNAVAILABLE',
    message:
      'The document service is temporarily unavailable or could not be reached. Please retry shortly. Your document has not been verified.',
  };
}
