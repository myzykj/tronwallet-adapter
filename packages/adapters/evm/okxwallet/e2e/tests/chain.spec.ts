import { test, expect } from '../fixtures/okx-wallet.js';
import { e2eEnv } from '../fixtures/env.js';
import { connectWallet, resolveConfiguredChainId } from './helpers.js';

test('E2E-015 should switch to an already configured chain', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    const connected = await connectWallet(app, walletPopup);
    const configuredChainId = resolveConfiguredChainId(connected.chainId || '');
    await app.clearEvents();
    await app.setField('switchChain', configuredChainId);
    await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'confirm', { popupMode: 'optional' });

    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return {
                chainId: snapshot.chainId,
                status: snapshot.result.status,
            };
        })
        .toEqual({
            chainId: configuredChainId,
            status: 'success',
        });
});

test('E2E-016 should not crash when switching to an unconfigured chain fails', async ({
    app,
    walletPopup,
}, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await connectWallet(app, walletPopup);
    await app.setField('switchChain', e2eEnv.testUnknownChainId);
    await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'reject', { popupMode: 'optional' });
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.lastAction).toBe('switchChain');
    expect(['success', 'error']).toContain(snapshot.result.status);
});
