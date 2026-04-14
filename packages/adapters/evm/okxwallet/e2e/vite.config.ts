import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(e2eDir, '..');

export default defineConfig({
    root: path.resolve(e2eDir, 'pages'),
    resolve: {
        alias: {
            '@tronweb3/abstract-adapter-evm': path.resolve(packageRoot, '../abstract-adapter/src/index.ts'),
        },
    },
    server: {
        host: '127.0.0.1',
        port: 4174,
        strictPort: true,
    },
    preview: {
        host: '127.0.0.1',
        port: 4174,
        strictPort: true,
    },
    build: {
        outDir: path.resolve(e2eDir, '.vite-dist'),
        emptyOutDir: true,
    },
});
