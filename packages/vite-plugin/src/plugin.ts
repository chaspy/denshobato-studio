import type { Plugin, ViteDevServer } from 'vite';
import { jsxTransform } from './jsx-transform.js';
import { createMiddleware } from './middleware.js';
import { injectPreviewBridge } from './inject.js';

const STUDIO_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Denshobato Studio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/@id/__x00__virtual:denshobato-studio"></script>
</body>
</html>`;

const VIRTUAL_MODULE_ID = 'virtual:denshobato-studio';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

export interface DenshobatoPluginOptions {
  configPath?: string;
  enabled?: boolean;
}

export function denshobato(options: DenshobatoPluginOptions = {}): Plugin[] {
  const enabled = options.enabled ?? true;
  const isPreviewRunner = process.env.DENSHOBATO_PREVIEW_RUNNER === '1';

  return [
    {
      name: 'denshobato:jsx-transform',
      enforce: 'pre',
      apply: 'serve',
      config() {
        if (!enabled) return;
        return {
          server: {
            watch: {
              ignored: ['**/.denshobato/**'],
            },
          },
        };
      },
      transform(code, id) {
        if (!enabled) return null;
        if (!/\.(tsx|jsx)$/.test(id)) return null;
        if (id.includes('node_modules')) return null;
        const result = jsxTransform(code, id);
        if (!result) return null;
        return { code: result.code, map: result.map as unknown as null };
      },
    },
    {
      name: 'denshobato:api',
      apply: 'serve',
      configureServer(server: ViteDevServer) {
        if (!enabled || isPreviewRunner) return;
        const projectDir = server.config.root;
        const middleware = createMiddleware(projectDir, options.configPath);
        server.middlewares.use(middleware);
      },
    },
    {
      name: 'denshobato:studio',
      apply: 'serve',
      resolveId(id) {
        if (id === VIRTUAL_MODULE_ID) {
          return RESOLVED_VIRTUAL_MODULE_ID;
        }
      },
      load(id) {
        if (id === RESOLVED_VIRTUAL_MODULE_ID) {
          return `
import { mountDenshobatoStudio } from '@chaspy/denshobato-ui';
mountDenshobatoStudio();
`;
        }
      },
      transformIndexHtml(html, context) {
        if (!enabled) return html;
        const path = context.path || '';
        if (path === '/dev' || path.startsWith('/dev/') || path.startsWith('/__denshobato')) {
          return html;
        }
        return injectPreviewBridge(html);
      },
      configureServer(server: ViteDevServer) {
        if (!enabled || isPreviewRunner) return;

        // Register BEFORE Vite's SPA fallback so /dev is not caught by index.html
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          if (url === '/dev' || url.startsWith('/dev/') || url.startsWith('/dev?')) {
            // Let Vite transform the HTML (inject HMR client etc)
            server.transformIndexHtml(url, STUDIO_HTML).then((html) => {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(html);
            }).catch(next);
            return;
          }
          next();
        });
      },
    },
  ];
}
