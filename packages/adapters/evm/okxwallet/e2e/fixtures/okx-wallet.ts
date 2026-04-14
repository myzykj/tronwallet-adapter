import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, expect, test as base, type BrowserContext, type Frame, type Page } from '@playwright/test';
import { e2eEnv, getRequiredPath } from './env.js';
import { AdapterE2EPage } from './test-page.js';

const EXTENSION_PROTOCOL = 'chrome-extension://';
const CONFIRM_BUTTON_NAMES = [
    /^next$/i,
    /^connect$/i,
    /^approve$/i,
    /^confirm$/i,
    /^sign$/i,
    /^ok$/i,
    /^done$/i,
    /^submit$/i,
];
const REJECT_BUTTON_NAMES = [/^reject$/i, /^cancel$/i, /^close$/i, /^not now$/i];
const UNLOCK_BUTTON_NAMES = [/^unlock$/i, /^log in$/i, /^login$/i, /^confirm$/i, /^submit$/i];

type WalletAction = 'confirm' | 'reject';
type PopupMode = 'required' | 'optional';

async function createIsolatedUserDataDir(templateDir: string) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'okxwallet-e2e-'));
    await fs.cp(templateDir, tempDir, { recursive: true });
    return tempDir;
}

type PageLike = Page | Frame;

async function locatorVisible(target: PageLike, name: RegExp) {
    const locator = target.getByRole('button', { name }).first();
    try {
        await locator.waitFor({ state: 'visible', timeout: 1_500 });
        return locator;
    } catch {
        return null;
    }
}

async function clickMatchingButton(page: Page, names: RegExp[]) {
    const targets: PageLike[] = [page, ...page.frames()];

    for (const target of targets) {
        for (const name of names) {
            const locator = await locatorVisible(target, name);
            if (locator) {
                await locator.click();
                return true;
            }
        }
    }

    return false;
}

function isExtensionPage(page: Page) {
    return page.url().startsWith(EXTENSION_PROTOCOL);
}

function isExtensionWorkerUrl(url: string) {
    return url.startsWith(EXTENSION_PROTOCOL);
}

function getExtensionOrigin(url: string) {
    return new URL(url).origin;
}

async function ensureNotLocked(page: Page) {
    const targets: PageLike[] = [page, ...page.frames()];

    for (const target of targets) {
        const passwordField = target.locator('input[type="password"]').first();
        if (await passwordField.isVisible().catch(() => false)) {
            throw new Error(
                'The OKX Wallet profile is locked. Unlock the template profile before running the first version of the E2E suite.'
            );
        }
    }
}

async function unlockTargetIfNeeded(target: PageLike) {
    const passwordField = target.locator('input[type="password"]').first();
    const locked = await passwordField.isVisible().catch(() => false);
    if (!locked) {
        return false;
    }

    if (!e2eEnv.walletPassword) {
        throw new Error(
            'The OKX Wallet profile is locked. Set OKX_WALLET_PASSWORD so the E2E fixture can unlock the wallet automatically.'
        );
    }

    await passwordField.fill(e2eEnv.walletPassword);

    for (const name of UNLOCK_BUTTON_NAMES) {
        const button = await locatorVisible(target, name);
        if (button) {
            await button.click();
            await expect(passwordField).not.toBeVisible({ timeout: 15_000 });
            return true;
        }
    }

    await passwordField.press('Enter');
    await expect(passwordField).not.toBeVisible({ timeout: 15_000 });
    return true;
}

function isUnlockFrame(frame: Frame, extensionOrigin: string) {
    const url = frame.url();
    return url.startsWith(extensionOrigin) && url.includes('/ses.html#/');
}

async function unlockWalletIfNeeded(context: BrowserContext, extensionOrigin: string) {
    const page = await context.newPage();

    try {
        await page.goto(`${extensionOrigin}/home.html#/unlock`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2_000);

        const unlockFrame = page.frames().find((frame) => isUnlockFrame(frame, extensionOrigin)) || page.mainFrame();
        const unlocked = await unlockTargetIfNeeded(unlockFrame);
        if (!unlocked) {
            return;
        }
    } finally {
        await page.close().catch(() => {});
    }
}

export class WalletPopupController {
    constructor(private readonly context: BrowserContext) {}

    async completePendingRequest(
        trigger: () => Promise<unknown>,
        action: WalletAction,
        options: { popupMode?: PopupMode; timeoutMs?: number } = {}
    ) {
        const popupMode = options.popupMode || 'required';
        const timeoutMs = options.timeoutMs || (popupMode === 'required' ? 20_000 : 3_000);
        const knownPages = new Set(this.context.pages());
        const popupPromise = this.context.waitForEvent('page', {
            timeout: timeoutMs,
            predicate: (page) => isExtensionPage(page) && !knownPages.has(page),
        });

        const triggerPromise = Promise.resolve().then(trigger);

        let popup: Page | null = null;
        try {
            popup = await popupPromise;
        } catch (error) {
            if (popupMode === 'required') {
                await triggerPromise.catch(() => {});
                throw error;
            }
        }

        if (!popup) {
            await triggerPromise;
            return;
        }

        await popup.waitForLoadState('domcontentloaded');
        await popup.waitForTimeout(1_000);

        const unlockedTargets = [popup, ...popup.frames()];
        let unlockedPopup = false;
        for (const target of unlockedTargets) {
            if (await unlockTargetIfNeeded(target)) {
                unlockedPopup = true;
                await popup.waitForLoadState('domcontentloaded').catch(() => {});
                await popup.waitForTimeout(1_000).catch(() => {});
                break;
            }
        }

        if (!unlockedPopup) {
            await ensureNotLocked(popup);
        }

        const names = action === 'confirm' ? CONFIRM_BUTTON_NAMES : REJECT_BUTTON_NAMES;
        let clickedAny = false;

        for (let step = 0; step < 5; step += 1) {
            const clicked = await clickMatchingButton(popup, names);
            if (!clicked) {
                break;
            }

            clickedAny = true;
            if (popup.isClosed()) {
                break;
            }

            await popup.waitForLoadState('domcontentloaded').catch(() => {});
        }

        if (!clickedAny) {
            throw new Error(`Unable to locate a visible "${action}" button in the OKX Wallet popup.`);
        }

        await triggerPromise;
    }
}

type Fixtures = {
    app: AdapterE2EPage;
    walletPopup: WalletPopupController;
};

export const test = base.extend<Fixtures>({
    context: async ({ browser }, use, testInfo) => {
        if (testInfo.project.name === 'with-extension') {
            const extensionPath = getRequiredPath('OKX_WALLET_EXTENSION_PATH');
            const templateUserDataDir = getRequiredPath('CHROMIUM_USER_DATA_DIR');
            const runUserDataDir = await createIsolatedUserDataDir(templateUserDataDir);

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
                throw new Error('The OKX Wallet extension service worker did not start in time.');
            }

            await unlockWalletIfNeeded(context, getExtensionOrigin(extensionWorker.url()));

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
        const app = new AdapterE2EPage(page, baseURL);
        await app.goto();
        await use(app);
        await page.close();
    },
    walletPopup: async ({ context }, use) => {
        await use(new WalletPopupController(context));
    },
});

export { expect, e2eEnv };
