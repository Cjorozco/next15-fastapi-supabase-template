/**
 * Internal path to go back to after signing in, or `fallback`. Only same-origin paths
 * pass: "//evil.com", "/\\evil.com" and absolute URLs are rejected (open redirect).
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/hoy'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  try {
    const url = new URL(value, 'http://internal.invalid');
    if (url.origin !== 'http://internal.invalid') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
