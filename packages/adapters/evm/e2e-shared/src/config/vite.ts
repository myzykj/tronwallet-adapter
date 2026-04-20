import path from 'node:path';
import { defineConfig } from 'vite';
import type { WalletE2EConfig } from '../types.js';

/**
 * Create a Vite config for the wallet adapter's E2E test page.
 *
 * @param config The wallet E2E config
 * @param e2eDir The `e2e/` directory of the consuming wallet adapter
 *
 * @example
 * ```ts
 * // e2e/vite.config.ts
 * import { createViteConfig } from '@tronweb3/evm-adapter-e2e-shared/config';
 * import { fileURLToPath } from 'node:url';
 * import path from 'node:path';
 * import { okxConfig } from './wallet-config.js';
 *
 * const e2eDir = path.dirname(fileURLToPath(import.meta.url));
 * export default createViteConfig(okxConfig, e2eDir);
 * ```
 */
export function createViteConfig(config: WalletE2EConfig, e2eDir: string) {
    const packageRoot = path.resolve(e2eDir, '..');

    return defineConfig({
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
}
