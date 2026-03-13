import { describe, it, expect } from 'vitest';
import { injectPreviewBridge } from '../inject.js';

describe('injectPreviewBridge (extended)', () => {
  it('injects script before closing body tag', () => {
    const html = '<html><body><div>App</div></body></html>';
    const result = injectPreviewBridge(html);
    expect(result).toContain('data-denshobato-preview-bridge');
    expect(result).toContain('</body></html>');
    // Script should appear before </body>
    const bridgeIdx = result.indexOf('data-denshobato-preview-bridge');
    const bodyCloseIdx = result.indexOf('</body>');
    expect(bridgeIdx).toBeLessThan(bodyCloseIdx);
  });

  it('does not duplicate injection', () => {
    const html = '<html><body><div>App</div></body></html>';
    const first = injectPreviewBridge(html);
    const second = injectPreviewBridge(first);
    expect(second).toBe(first);
    const matches = second.match(/data-denshobato-preview-bridge/g);
    expect(matches!.length).toBe(1);
  });

  it('appends script when no </body> tag exists', () => {
    const html = '<html><div>App</div></html>';
    const result = injectPreviewBridge(html);
    expect(result).toContain('data-denshobato-preview-bridge');
    // Script should be at the end
    expect(result.endsWith('</script>\n'));
  });

  it('preserves content before and after body', () => {
    const html =
      '<!DOCTYPE html><html><head><title>Test</title></head><body><div id="root"></div></body></html>';
    const result = injectPreviewBridge(html);
    expect(result).toContain('<head><title>Test</title></head>');
    expect(result).toContain('<div id="root"></div>');
    expect(result).toContain('</body></html>');
  });

  it('injects the element selection logic', () => {
    const html = '<body></body>';
    const result = injectPreviewBridge(html);
    expect(result).toContain('denshobato:elementSelected');
    expect(result).toContain('denshobato:selector:start');
    expect(result).toContain('denshobato:selector:stop');
    expect(result).toContain('denshobato:selectorCancelled');
    expect(result).toContain('findSelectableTarget');
  });

  it('handles empty HTML', () => {
    const result = injectPreviewBridge('');
    expect(result).toContain('data-denshobato-preview-bridge');
  });
});
