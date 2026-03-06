import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { studioStyles as s, colors } from '../styles.js';
import { getCopy } from '../i18n.js';

export function PreviewPane() {
  const { previewUrl, setPreviewUrl, selectorActive, selectElement, toggleSelector, language } = useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [urlInput, setUrlInput] = useState(previewUrl);
  const copy = getCopy(language);

  useEffect(() => {
    setUrlInput(previewUrl);
  }, [previewUrl]);

  const navigateTo = (url: string) => {
    setPreviewUrl(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(urlInput);
  };

  const handleSelectorClick = useCallback(
    (e: React.MouseEvent) => {
      if (!selectorActive) return;
      e.preventDefault();
      e.stopPropagation();

      // We need to communicate with the iframe to get the clicked element
      // Send a message to the iframe to get element info
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;

      iframe.contentWindow.postMessage({ type: 'denshobato:getElementAt', x: e.clientX, y: e.clientY }, '*');
    },
    [selectorActive],
  );

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
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

  // Inject selector script into iframe when selector is active
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const injectScript = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        // Remove previous injection
        const existing = doc.getElementById('denshobato-selector-script');
        if (existing) existing.remove();

        if (!selectorActive) return;

        const script = doc.createElement('script');
        script.id = 'denshobato-selector-script';
        script.textContent = `
          (function() {
            let hoveredEl = null;
            function onMouseOver(e) {
              if (hoveredEl) {
                hoveredEl.style.outline = '';
                hoveredEl.style.outlineOffset = '';
              }
              hoveredEl = e.target;
              const file = hoveredEl.getAttribute('data-denshobato-file');
              if (file) {
                hoveredEl.style.outline = '2px solid #7c5cfc';
                hoveredEl.style.outlineOffset = '2px';
              }
            }
            function onMouseOut(e) {
              if (hoveredEl) {
                hoveredEl.style.outline = '';
                hoveredEl.style.outlineOffset = '';
              }
            }
            function onClick(e) {
              e.preventDefault();
              e.stopPropagation();
              const el = e.target;
              const file = el.getAttribute('data-denshobato-file');
              const line = el.getAttribute('data-denshobato-line');
              if (file && line) {
                if (hoveredEl) {
                  hoveredEl.style.outline = '';
                  hoveredEl.style.outlineOffset = '';
                }
                window.parent.postMessage({
                  type: 'denshobato:elementSelected',
                  file: file,
                  line: parseInt(line, 10),
                  tagName: el.tagName.toLowerCase(),
                  textContent: (el.textContent || '').slice(0, 100),
                }, '*');
                cleanup();
              }
            }
            function onKeyDown(e) {
              if (e.key === 'Escape') {
                cleanup();
                window.parent.postMessage({ type: 'denshobato:selectorCancelled' }, '*');
              }
            }
            function cleanup() {
              document.removeEventListener('mouseover', onMouseOver, true);
              document.removeEventListener('mouseout', onMouseOut, true);
              document.removeEventListener('click', onClick, true);
              document.removeEventListener('keydown', onKeyDown, true);
              document.body.style.cursor = '';
              if (hoveredEl) {
                hoveredEl.style.outline = '';
                hoveredEl.style.outlineOffset = '';
              }
            }
            document.addEventListener('mouseover', onMouseOver, true);
            document.addEventListener('mouseout', onMouseOut, true);
            document.addEventListener('click', onClick, true);
            document.addEventListener('keydown', onKeyDown, true);
            document.body.style.cursor = 'crosshair';
          })();
        `;
        doc.head.appendChild(script);
      } catch {
        // Cross-origin iframe, can't inject
      }
    };

    // Inject after iframe loads
    iframe.addEventListener('load', injectScript);
    // Also try immediately (iframe might already be loaded)
    injectScript();

    return () => {
      iframe.removeEventListener('load', injectScript);
    };
  }, [selectorActive]);

  // Listen for selector cancel from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
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
          onClick={() => iframeRef.current?.contentWindow?.location.reload()}
          title={copy.refreshPreview}
        >
          &#x21bb;
        </button>
      </div>

      {/* Preview iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src={previewUrl}
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
            onClick={handleSelectorClick}
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
