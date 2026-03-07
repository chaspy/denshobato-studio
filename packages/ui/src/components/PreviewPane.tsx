import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { studioStyles as s, colors } from '../styles.js';
import { getCopy } from '../i18n.js';
import { isRelativePreviewPath, resolvePreviewFrameUrl } from '../preview-url.js';

function supportsSelector(previewUrl: string): boolean {
  const trimmed = previewUrl.trim() || '/';
  if (isRelativePreviewPath(trimmed)) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return new URL(trimmed).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function PreviewPane() {
  const {
    previewUrl,
    previewBaseUrl,
    setPreviewUrl,
    selectorActive,
    selectedElement,
    selectElement,
    toggleSelector,
    language,
    apiKey,
    setSettingsOpen,
    previewPort,
  } = useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [urlInput, setUrlInput] = useState(previewUrl);
  const copy = getCopy(language);
  const hasApiKey = apiKey.trim().length > 0;
  const resolvedPreviewUrl = resolvePreviewFrameUrl(previewUrl, previewBaseUrl, previewPort);
  const selectorSupported = supportsSelector(previewUrl);

  useEffect(() => {
    setUrlInput(previewUrl);
  }, [previewUrl]);

  const navigateTo = (url: string) => {
    setPreviewUrl(url);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(urlInput);
  };

  const handleDirectInstruction = () => {
    if (!hasApiKey) {
      setSettingsOpen(true);
      return;
    }

    if (!selectorSupported) {
      return;
    }
    toggleSelector();
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (e.data?.source !== 'denshobato-preview') {
        return;
      }

      if (e.data?.type === 'denshobato:elementSelected') {
        selectElement({
          file: e.data.file,
          line: e.data.line,
          tagName: e.data.tagName,
          textContent: e.data.textContent,
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [selectElement]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const syncSelectorState = () => {
      iframe.contentWindow?.postMessage({
        source: 'denshobato-studio',
        type: selectorActive ? 'denshobato:selector:start' : 'denshobato:selector:stop',
      }, '*');
    };

    iframe.addEventListener('load', syncSelectorState);
    syncSelectorState();

    return () => {
      iframe.removeEventListener('load', syncSelectorState);
    };
  }, [resolvedPreviewUrl, selectorActive]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) {
        return;
      }

      if (e.data?.source !== 'denshobato-preview') {
        return;
      }

      if (e.data?.type === 'denshobato:selectorCancelled') {
        if (useStore.getState().selectorActive) {
          toggleSelector();
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [toggleSelector]);

  return (
    <div style={s.rightPane}>
      <div style={s.previewHero}>
        <div style={s.previewHeroCopy}>
          <button
            type="button"
            style={selectorActive ? s.previewHeroBtnActive : s.previewHeroBtn}
            onClick={handleDirectInstruction}
          >
            {selectorActive
              ? copy.selectorActiveCta
              : selectedElement
                ? copy.selectorSelectedCta
                : copy.directInstructionCta}
          </button>
          <div style={s.previewHeroDescription}>
            {hasApiKey ? copy.directInstructionHint : copy.directInstructionDisabled}
          </div>
        </div>
      </div>

      {/* URL bar */}
      <div style={s.previewBar}>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>{copy.preview}</span>
        <form onSubmit={handleUrlSubmit} style={{ flex: 1, display: 'flex' }}>
          <input
            style={s.urlInput}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="/"
          />
        </form>
        <button
          style={s.btn}
          onClick={() => {
            if (iframeRef.current) {
              iframeRef.current.src = resolvedPreviewUrl;
            }
          }}
          title={copy.refreshPreview}
        >
          &#x21bb;
        </button>
      </div>

      {/* Preview iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src={resolvedPreviewUrl}
          style={s.iframe}
          width="100%"
          height="100%"
          title={copy.previewTitle}
        />
        {selectorActive && (
          <div
            style={{
              ...s.selectorOverlay,
              background: 'rgba(124, 92, 252, 0.05)',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 16px',
              background: colors.accent,
              color: colors.white,
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              pointerEvents: 'none',
            }}>
              {copy.selectorOverlay}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
