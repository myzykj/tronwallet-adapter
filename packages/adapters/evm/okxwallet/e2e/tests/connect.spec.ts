import { test, expect } from '../fixtures/okx-wallet.js';
import { connectWallet, expectHexAddress } from './helpers.js';

test('E2E-004 should connect successfully after approving the popup', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    const snapshot = await connectWallet(app, walletPopup);
    expectHexAddress(snapshot.address);
    expect(snapshot.result.lastAction).toBe('connect');
});

test('E2E-005 should surface an error when the connection request is rejected', async ({
    app,
    walletPopup,
}, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await walletPopup.completePendingRequest(() => app.runAction('connect'), 'reject');
    const snapshot = await app.getSnapshot();

    expect(snapshot.connected).toBe(false);
    expect(snapshot.address).toBeNull();
    expect(snapshot.result.lastAction).toBe('connect');
    expect(snapshot.result.status).toBe('error');
});

test('E2E-006 should remain stable when connect is called twice', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    const first = await connectWallet(app, walletPopup);
    await walletPopup.completePendingRequest(() => app.runAction('connect'), 'confirm', { popupMode: 'optional' });
    const second = await app.getSnapshot();

    expectHexAddress(first.address);
    expectHexAddress(second.address);
    expect(second.connected).toBe(true);
    expect(second.result.lastAction).toBe('connect');
    expect(second.result.status).toBe('success');
});
