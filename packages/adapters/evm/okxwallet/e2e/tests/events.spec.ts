import { test, expect } from '../fixtures/okx-wallet.js';
import { connectWallet, resolveConfiguredChainId } from './helpers.js';

test('E2E-017 should emit accountsChanged after switching the active account in OKX Wallet', async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');
    test.fixme(
        true,
        'Switching accounts inside the OKX Wallet extension still needs wallet-specific selectors for the account menu.'
    );
});

test('E2E-018 should emit chainChanged after switching chains', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    const connected = await connectWallet(app, walletPopup);
    const configuredChainId = resolveConfiguredChainId(connected.chainId || '');
    await app.clearEvents();
    await app.setField('switchChain', configuredChainId);
    await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'confirm', { popupMode: 'optional' });

    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return snapshot.events.some((event) => event.name === 'chainChanged');
        })
        .toBe(true);
});

test('E2E-019 should observe either accountsChanged([]) or disconnect after the wallet is locked', async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');
    test.fixme(
        true,
        'Locking the OKX Wallet profile from the extension UI still needs wallet-specific selectors for the account menu.'
    );
});
