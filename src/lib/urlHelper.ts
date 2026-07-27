/**
 * Utility to guarantee that links generated in development mode (using ais-dev-)
 * are automatically mapped to the public/shared domain (ais-pre-) so they are
 * universally accessible without requiring AI Studio developer login.
 */
export function getPublicOrigin(): string {
  if (typeof window === "undefined" || !window.location) {
    return "";
  }
  
  // 1. Try to get cached public origin from localStorage (guarantees correct domain in iframe/sandbox)
  try {
    const cached = localStorage.getItem('keinshop_public_origin');
    if (cached) {
      return cached;
    }
  } catch (e) {}

  // 2. Fallback: Parse window.location
  const origin = window.location.origin;
  if (origin.includes("ais-dev-")) {
    return origin.replace("ais-dev-", "ais-pre-");
  }
  return origin;
}

export function makePublicUrl(pathAndQuery: string): string {
  const origin = getPublicOrigin();
  const cleanPath = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${origin}${cleanPath}`;
}
