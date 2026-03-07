const PREVIEW_BRIDGE_MARKER = 'data-denshobato-preview-bridge';

const PREVIEW_BRIDGE_SCRIPT = `
<script ${PREVIEW_BRIDGE_MARKER}="true">
(() => {
  if (window.__denshobatoPreviewBridgeMounted) {
    return;
  }

  window.__denshobatoPreviewBridgeMounted = true;

  let active = false;
  let hoveredEl = null;

  function clearHovered() {
    if (!hoveredEl) {
      return;
    }

    hoveredEl.style.outline = '';
    hoveredEl.style.outlineOffset = '';
    hoveredEl = null;
  }

  function findSelectableTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    return target.closest('[data-denshobato-file][data-denshobato-line]');
  }

  function highlight(target) {
    if (hoveredEl === target) {
      return;
    }

    clearHovered();
    hoveredEl = target;
    hoveredEl.style.outline = '2px solid #7c5cfc';
    hoveredEl.style.outlineOffset = '2px';
  }

  function stopSelection() {
    active = false;
    clearHovered();
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);

    if (document.body) {
      document.body.style.cursor = '';
    }
  }

  function startSelection() {
    if (active) {
      return;
    }

    active = true;
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);

    if (document.body) {
      document.body.style.cursor = 'crosshair';
    }
  }

  function onMouseOver(event) {
    if (!active) {
      return;
    }

    const target = findSelectableTarget(event.target);
    if (target) {
      highlight(target);
      return;
    }

    clearHovered();
  }

  function onMouseOut() {
    if (!active) {
      return;
    }

    clearHovered();
  }

  function onClick(event) {
    if (!active) {
      return;
    }

    const target = findSelectableTarget(event.target);
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const file = target.getAttribute('data-denshobato-file');
    const line = target.getAttribute('data-denshobato-line');
    if (!file || !line) {
      return;
    }

    window.parent.postMessage({
      source: 'denshobato-preview',
      type: 'denshobato:elementSelected',
      file,
      line: Number.parseInt(line, 10),
      tagName: target.tagName.toLowerCase(),
      textContent: (target.textContent || '').slice(0, 100),
    }, '*');

    stopSelection();
  }

  function onKeyDown(event) {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Escape') {
      return;
    }

    stopSelection();
    window.parent.postMessage({
      source: 'denshobato-preview',
      type: 'denshobato:selectorCancelled',
    }, '*');
  }

  window.addEventListener('message', (event) => {
    const payload = event.data;
    if (!payload || payload.source !== 'denshobato-studio') {
      return;
    }

    if (payload.type === 'denshobato:selector:start') {
      startSelection();
      return;
    }

    if (payload.type === 'denshobato:selector:stop') {
      stopSelection();
    }
  });
})();
</script>
`;

export function injectPreviewBridge(html: string): string {
  if (html.includes(PREVIEW_BRIDGE_MARKER)) {
    return html;
  }

  const bodyCloseIndex = html.lastIndexOf('</body>');
  if (bodyCloseIndex === -1) {
    return html + PREVIEW_BRIDGE_SCRIPT;
  }

  return html.slice(0, bodyCloseIndex) + PREVIEW_BRIDGE_SCRIPT + html.slice(bodyCloseIndex);
}
