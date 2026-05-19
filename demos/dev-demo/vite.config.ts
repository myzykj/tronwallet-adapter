import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ── Dev-only plugin: serve local mock security config files ────────────────
// Files live at demos/dev-demo/mock-security-config*.json and are accessible
// in the browser at /mock-security-config.json and /mock-security-config-partial.json.
// Use these URLs in the SecurityDemo's securityOptions.configUrls to test the
// risk-detection flow without a remote server.
function mockSecurityConfigPlugin() {
  const routes: Record<string, string> = {
    '/mock-security-config.json': resolve(__dirname, 'mock-security-config.json'),
    '/mock-security-config-partial.json': resolve(__dirname, 'mock-security-config-partial.json'),
  };

  return {
    name: 'mock-security-config',
    configureServer(server: { middlewares: { use: (path: string, fn: (req: any, res: any, next: () => void) => void) => void } }) {
      for (const [urlPath, filePath] of Object.entries(routes)) {
        server.middlewares.use(urlPath, (_req, res) => {
          try {
            const body = readFileSync(filePath, 'utf-8');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(body);
          } catch {
            res.statusCode = 404;
            res.end('Not found');
          }
        });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mockSecurityConfigPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3003,
  },
  build: {
    minify: false,
    rollupOptions: {},
  },
});
