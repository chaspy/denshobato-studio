const OVERLAY_SCRIPT = `
<script type="module">
  import { mountDenshobatoOverlay } from '@denshobato-studio/ui';
  mountDenshobatoOverlay();
</script>
`;

export function injectOverlayScript(html: string): string {
  // Inject before closing </body> tag
  const bodyCloseIndex = html.lastIndexOf('</body>');
  if (bodyCloseIndex === -1) {
    return html + OVERLAY_SCRIPT;
  }
  return html.slice(0, bodyCloseIndex) + OVERLAY_SCRIPT + html.slice(bodyCloseIndex);
}
