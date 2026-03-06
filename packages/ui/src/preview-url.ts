const LOCAL_PREVIEW_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function getCurrentHref(override?: string): string | undefined {
  if (override) return override;
  if (typeof window === 'undefined') return undefined;
  return window.location.href;
}

function isRelativePreviewPath(value: string): boolean {
  return (
    value.startsWith('/') ||
    value.startsWith('./') ||
    value.startsWith('../') ||
    value.startsWith('?') ||
    value.startsWith('#')
  );
}

function applyDefaultPort(url: URL, defaultPort: string): URL {
  if (!defaultPort || url.port || !LOCAL_PREVIEW_HOSTS.has(url.hostname)) {
    return url;
  }
  url.port = defaultPort;
  return url;
}

export function normalizePreviewUrl(
  input: string,
  defaultPort: string,
  currentHref?: string,
): string {
  const trimmed = input.trim();
  if (!trimmed) return '/';
  if (isRelativePreviewPath(trimmed)) return trimmed;

  const resolvedCurrentHref = getCurrentHref(currentHref);
  const currentUrl = resolvedCurrentHref ? new URL(resolvedCurrentHref) : null;

  try {
    return applyDefaultPort(new URL(trimmed), defaultPort).toString();
  } catch {
    // Fall through and try local development shorthands.
  }

  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/i.test(trimmed)) {
    const protocol = currentUrl?.protocol ?? 'http:';
    return applyDefaultPort(new URL(`${protocol}//${trimmed}`), defaultPort).toString();
  }

  return trimmed;
}
