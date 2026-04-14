import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(e2eDir, '..');
const baseURL = process.env.OKX_WALLET_E2E_BASE_URL || 'http://127.0.0.1:4174';

export default defineConfig({
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
        command: 'pnpm exec vite --config e2e/vite.config.ts --host 127.0.0.1 --port 4174',
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
