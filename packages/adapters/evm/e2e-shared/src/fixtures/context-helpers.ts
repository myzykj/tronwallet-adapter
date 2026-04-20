import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { BrowserContext, Frame, Page } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';

const EXTENSION_PROTOCOL = 'chrome-extension://';

export async function createIsolatedUserDataDir(config: WalletE2EConfig, templateDir: string) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${config.walletId}-e2e-`));
    await fs.cp(templateDir, tempDir, { recursive: true });
    return tempDir;
}

export function isExtensionPage(page: Page) {
    return page.url().startsWith(EXTENSION_PROTOCOL);
}

export function isExtensionWorkerUrl(url: string) {
    return url.startsWith(EXTENSION_PROTOCOL);
}

export function getExtensionOrigin(url: string) {
    return new URL(url).origin;
}

type PageLike = Page | Frame;

export async function locatorVisible(target: PageLike, name: RegExp) {
    // Prefer accessible-role lookup: real <button>, role="button", <a> with button role, etc.
    const byRole = target.getByRole('button', { name }).first();
    try {
        await byRole.waitFor({ state: 'visible', timeout: 1_500 });
        return byRole;
    } catch {
        // Some wallets (e.g., TronLink) render clickable action elements as styled <div>s
        // without a button role. Fall back to matching visible text and relying on the click
        // handler being registered on the text container.
        const byText = target.getByText(name, { exact: false }).first();
        try {
            await byText.waitFor({ state: 'visible', timeout: 500 });
            return byText;
        } catch {
            return null;
        }
    }
}

export async function clickMatchingButton(page: Page, names: RegExp[]) {
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
