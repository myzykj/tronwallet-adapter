import { test, expect } from '../fixtures/okx-wallet.js';
import { connectWallet } from './helpers.js';

test('E2E-020 should return the current chainId through network()', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    const connected = await connectWallet(app, walletPopup);
    await app.runAction('network');
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.lastAction).toBe('network');
    expect(snapshot.result.status).toBe('success');
    expect(snapshot.result.value).toBe(connected.chainId);
});
