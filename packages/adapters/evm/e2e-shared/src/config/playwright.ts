import path from 'node:path';
import { defineConfig } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';

/**
 * Create a Playwright config for the wallet adapter's E2E tests.
 *
 * @param config The wallet E2E config
 * @param e2eDir The `e2e/` directory of the consuming wallet adapter
 *
 * @example
 * ```ts
 * // e2e/playwright.config.ts
 * import { createPlaywrightConfig } from '@tronweb3/evm-adapter-e2e-shared/config';
 * import { fileURLToPath } from 'node:url';
 * import path from 'node:path';
 * import { okxConfig } from './wallet-config.js';
 *
 * const e2eDir = path.dirname(fileURLToPath(import.meta.url));
 * export default createPlaywrightConfig(okxConfig, e2eDir);
 * ```
 */
export function createPlaywrightConfig(config: WalletE2EConfig, e2eDir: string) {
    const packageRoot = path.resolve(e2eDir, '..');
    const baseURL = process.env[config.e2eBaseUrlEnvVar] || 'http://127.0.0.1:4174';
    const viteConfigRelPath = path.relative(packageRoot, path.join(e2eDir, 'vite.config.ts'));

    return defineConfig({
        testDir: path.resolve(e2eDir, 'tests'),
        timeout: 90_000,
        expect: {
            timeout: 15_000,
        },
        fullyParallel: false,
        workers: 1,
        forbidOnly: !!process.env.CI,
        retries: 0,
        reporter: [['list'], ['html', { open: 'never', outputFolder: path.resolve(e2eDir, 'playwright-report') }]],
        use: {
            baseURL,
            headless: false,
            trace: 'retain-on-failure',
            screenshot: 'only-on-failure',
            video: 'retain-on-failure',
        },
        webServer: {
            // --configLoader runner is required so Vite does NOT externalize the workspace TS
            // dependency `@tronweb3/evm-adapter-e2e-shared/config` when loading the wallet's
            // vite.config.ts. Without it, Node attempts to import raw .ts files and fails.
            command: `pnpm exec vite --configLoader runner --config ${viteConfigRelPath} --host 127.0.0.1 --port 4174`,
            cwd: packageRoot,
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        projects: [
            {
                name: 'with-extension',
            },
            {
                name: 'without-extension',
                testMatch: /discovery\.spec\.ts$/,
            },
        ],
    });
}
