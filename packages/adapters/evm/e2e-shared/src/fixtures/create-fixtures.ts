import fs from 'node:fs/promises';
import { chromium, expect, test as base } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import { createEnvLoader, type E2EEnv } from '../env.js';
import { createIsolatedUserDataDir, getExtensionOrigin, isExtensionWorkerUrl } from './context-helpers.js';
import { WalletPopupController, unlockWalletIfNeeded } from './wallet-popup.js';
import { AdapterE2EPage } from './test-page.js';

type Fixtures = {
    app: AdapterE2EPage;
    walletPopup: WalletPopupController;
};

/**
 * Create Playwright test fixtures for a specific wallet adapter's E2E tests.
 *
 * @param config The wallet E2E config
 * @param e2eDir The `e2e/` directory of the consuming wallet adapter
 *
 * @example
 * ```ts
 * import { createE2EFixtures } from '@tronweb3/evm-adapter-e2e-shared';
 * import { fileURLToPath } from 'node:url';
 * import path from 'node:path';
 * import { okxConfig } from '../wallet-config.js';
 *
 * const e2eDir = path.dirname(fileURLToPath(import.meta.url));
 * export const { test, expect, e2eEnv } = createE2EFixtures(okxConfig, e2eDir);
 * ```
 */
export function createE2EFixtures(config: WalletE2EConfig, e2eDir: string) {
    const { e2eEnv, getRequiredPath } = createEnvLoader(config, e2eDir);

    const test = base.extend<Fixtures>({
        context: async ({ browser }, use, testInfo) => {
            if (testInfo.project.name === 'with-extension') {
                const extensionPath = getRequiredPath(config.extensionPathEnvVar);
                const templateUserDataDir = getRequiredPath('CHROMIUM_USER_DATA_DIR');
                const runUserDataDir = await createIsolatedUserDataDir(config, templateUserDataDir);

                const context = await chromium.launchPersistentContext(runUserDataDir, {
                    channel: 'chromium',
                    headless: false,
                    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
                });

                const extensionWorker =
                    context.serviceWorkers().find((worker) => isExtensionWorkerUrl(worker.url())) ||
                    (await context
                        .waitForEvent('serviceworker', {
                            timeout: 15_000,
                            predicate: (worker) => isExtensionWorkerUrl(worker.url()),
                        })
                        .catch(() => null));

                if (!extensionWorker) {
                    throw new Error(`The ${config.walletName} extension service worker did not start in time.`);
                }

                await unlockWalletIfNeeded(context, getExtensionOrigin(extensionWorker.url()), config, e2eEnv);

                try {
                    await use(context);
                } finally {
                    await context.close();
                    await fs.rm(runUserDataDir, { recursive: true, force: true });
                }
                return;
            }

            const context = await browser.newContext();
            try {
                await use(context);
            } finally {
                await context.close();
            }
        },
        app: async ({ context, baseURL }, use) => {
            if (!baseURL) {
                throw new Error('Playwright baseURL is required for the E2E test page.');
            }
            const page = await context.newPage();
            const app = new AdapterE2EPage(page, baseURL, config, e2eEnv);
            await app.goto();
            await use(app);
            await page.close();
        },
        walletPopup: async ({ context }, use) => {
            await use(new WalletPopupController(context, config, e2eEnv));
        },
    });

    return { test, expect, e2eEnv };
}
