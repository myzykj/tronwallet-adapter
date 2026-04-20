import { expect } from '@playwright/test';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import type { E2EEnv } from '../env.js';

export async function connectWallet(app: AdapterE2EPage, walletPopup: WalletPopupController) {
    await walletPopup.completePendingRequest(() => app.runAction('connect'), 'confirm');
    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return snapshot.connected;
        })
        .toBe(true);
    return app.getSnapshot();
}

export async function ensureChain(app: AdapterE2EPage, walletPopup: WalletPopupController, targetChainId: string) {
    const initialSnapshot = await app.getSnapshot();
    if (initialSnapshot.chainId.toLowerCase() === targetChainId.toLowerCase()) {
        return initialSnapshot;
    }

    await app.setField('switchChain', targetChainId);
    await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'confirm', { popupMode: 'optional' });

    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return snapshot.chainId;
        })
        .toBe(targetChainId);

    return app.getSnapshot();
}

export function expectHexAddress(value: string | null) {
    expect(value || '').toMatch(/^0x[a-fA-F0-9]{40}$/);
}

export function expectHexSignature(value: string) {
    expect(value).toMatch(/^0x[a-fA-F0-9]+$/);
}

export function expectTransactionHash(value: string) {
    expect(value).toMatch(/^0x[a-fA-F0-9]{64}$/);
}

export function resolveConfiguredChainId(currentChainId: string, testChainId: string) {
    return currentChainId.toLowerCase() === testChainId.toLowerCase() ? '0x1' : testChainId;
}
