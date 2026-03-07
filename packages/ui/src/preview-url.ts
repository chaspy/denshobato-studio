const LOCAL_PREVIEW_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function getCurrentHref(override?: string): string | undefined {
  if (override) return override;
  if (typeof window === 'undefined') return undefined;
  return window.location.href;
}

export function isRelativePreviewPath(value: string): boolean {
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

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

export function compactPreviewUrl(
  input: string,
  previewBaseUrl?: string | null,
  defaultPort = '',
  currentHref?: string,
): string {
  const normalized = normalizePreviewUrl(input, defaultPort, currentHref);
  if (!previewBaseUrl || isRelativePreviewPath(normalized)) {
    return normalized;
  }

  try {
    const base = new URL(ensureTrailingSlash(previewBaseUrl));
    const target = new URL(normalized);
    if (target.origin !== base.origin) {
      return normalized;
    }

    const relativePath = target.pathname.slice(base.pathname.length - 1) || '/';
    return `${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}${target.search}${target.hash}`;
  } catch {
    return normalized;
  }
}

export function resolvePreviewFrameUrl(
  input: string,
  previewBaseUrl: string | null | undefined,
  defaultPort: string,
  currentHref?: string,
): string {
  const normalized = normalizePreviewUrl(input, defaultPort, currentHref);
  if (!previewBaseUrl || !isRelativePreviewPath(normalized)) {
    return normalized;
  }

  return new URL(normalized, ensureTrailingSlash(previewBaseUrl)).toString();
}
