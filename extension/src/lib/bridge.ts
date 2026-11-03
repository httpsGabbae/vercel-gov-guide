/** Origins allowed to exchange account details with the extension. */
export function isGovGuideUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) ||
      (url.protocol === 'https:' &&
        (url.hostname === 'govguide.ph' || url.hostname.endsWith('.govguide.ph')))
    );
  } catch {
    return false;
  }
}

export async function requestWebDetails(
  apiBaseUrl: string,
  userId?: string,
  applicant?: Record<string, unknown>,
) {
  const tabs = (await chrome.tabs.query({}))
    .filter(
      (tab) =>
        tab.id !== undefined &&
        tab.url &&
        isGovGuideUrl(tab.url) &&
        new URL(tab.url).origin === new URL(apiBaseUrl).origin &&
        new URL(tab.url).pathname.startsWith('/chat'),
    )
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        Number(new URL(b.url!).origin === apiBaseUrl) -
          Number(new URL(a.url!).origin === apiBaseUrl),
    );
  let error = 'Open GovGuide PH in Chrome and unlock My Details, then sync again.';
  for (const tab of tabs) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id!, {
        type: 'REQUEST_WEB_DETAILS',
        payload: { userId, applicant },
      });
      if (
        response?.success &&
        response.applicant?.id &&
        (!userId || response.applicant.id === userId)
      ) {
        return { ...response, apiBaseUrl: new URL(tab.url!).origin };
      }
      error = response?.error || error;
    } catch {
      error = 'Refresh the GovGuide PH tab after reloading the extension, then unlock My Details.';
    }
  }
  throw new Error(error);
}
