import { expect, type BrowserContext, type Frame, type Page } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import { DEFAULT_CONFIRM_BUTTON_NAMES, DEFAULT_REJECT_BUTTON_NAMES, DEFAULT_UNLOCK_BUTTON_NAMES } from '../types.js';
import { clickMatchingButton, isExtensionPage, locatorVisible } from './context-helpers.js';
import type { E2EEnv } from '../env.js';

type WalletAction = 'confirm' | 'reject';
type PopupMode = 'required' | 'optional';

async function ensureNotLocked(page: Page, config: WalletE2EConfig) {
    const targets: (Page | Frame)[] = [page, ...page.frames()];

    for (const target of targets) {
        const passwordField = target.locator('input[type="password"]').first();
        if (await passwordField.isVisible().catch(() => false)) {
            throw new Error(
                `The ${config.walletName} profile is locked. Unlock the template profile before running the first version of the E2E suite.`
            );
        }
    }
}

async function unlockTargetIfNeeded(target: Page | Frame, config: WalletE2EConfig, e2eEnv: E2EEnv) {
    const unlockNames = config.unlockButtonNames ?? DEFAULT_UNLOCK_BUTTON_NAMES;
    const passwordField = target.locator('input[type="password"]').first();
    const locked = await passwordField.isVisible().catch(() => false);
    if (!locked) {
        return false;
    }

    if (!e2eEnv.walletPassword) {
        throw new Error(
            `The ${config.walletName} profile is locked. Set ${config.walletPasswordEnvVar} so the E2E fixture can unlock the wallet automatically.`
        );
    }

    await passwordField.fill(e2eEnv.walletPassword);

    for (const name of unlockNames) {
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

export async function unlockWalletIfNeeded(
    context: BrowserContext,
    extensionOrigin: string,
    config: WalletE2EConfig,
    e2eEnv: E2EEnv
) {
    const page = await context.newPage();

    try {
        await page.goto(`${extensionOrigin}${config.unlockPagePath}`);
        await page.waitForLoadState('domcontentloaded');

        // Explicitly wait for either the unlock iframe OR a password field to appear,
        // instead of relying on a fixed 2s timeout that silently gives up. If the iframe
        // hasn't mounted yet, unlockTargetIfNeeded would see no password field and return
        // `false` ("not locked"), leaving the wallet locked and poisoning every subsequent
        // dApp request with OKX's own unlock popup.
        const readyDeadline = Date.now() + 15_000;
        let unlockTarget: Page | Frame = page.mainFrame();
        while (Date.now() < readyDeadline) {
            const iframe = page.frames().find((frame) => config.unlockFramePredicate(frame.url(), extensionOrigin));
            const candidate: Page | Frame = iframe ?? page.mainFrame();
            const passwordField = candidate.locator('input[type="password"]').first();
            if (await passwordField.isVisible().catch(() => false)) {
                unlockTarget = candidate;
                break;
            }
            await page.waitForTimeout(250).catch(() => {});
        }

        await unlockTargetIfNeeded(unlockTarget, config, e2eEnv);
    } finally {
        await page.close().catch(() => {});
    }
}

export class WalletPopupController {
    constructor(
        private readonly context: BrowserContext,
        private readonly config: WalletE2EConfig,
        private readonly e2eEnv: E2EEnv
    ) {}

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
            if (await unlockTargetIfNeeded(target, this.config, this.e2eEnv)) {
                unlockedPopup = true;
                await popup.waitForLoadState('domcontentloaded').catch(() => {});
                await popup.waitForTimeout(1_000).catch(() => {});
                break;
            }
        }

        if (!unlockedPopup) {
            await ensureNotLocked(popup, this.config);
        }

        const confirmNames = this.config.confirmButtonNames ?? DEFAULT_CONFIRM_BUTTON_NAMES;
        const rejectNames = this.config.rejectButtonNames ?? DEFAULT_REJECT_BUTTON_NAMES;
        const names = action === 'confirm' ? confirmNames : rejectNames;
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
            // Swallow the trigger's rejection before throwing so we don't leak an unhandled promise rejection.
            void triggerPromise.catch(() => {});
            throw new Error(`Unable to locate a visible "${action}" button in the ${this.config.walletName} popup.`);
        }

        await triggerPromise;
    }
}
