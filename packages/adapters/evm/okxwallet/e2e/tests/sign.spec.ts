import { test, expect } from '../fixtures/okx-wallet.js';
import { connectWallet, expectHexSignature } from './helpers.js';

test('E2E-007 should sign a message successfully', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await connectWallet(app, walletPopup);
    await walletPopup.completePendingRequest(() => app.runAction('signMessage'), 'confirm');
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.status).toBe('success');
    expect(snapshot.result.lastAction).toBe('signMessage');
    expectHexSignature(snapshot.result.value);
});

test('E2E-008 should report an error when message signing is rejected', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await connectWallet(app, walletPopup);
    await walletPopup.completePendingRequest(() => app.runAction('signMessage'), 'reject');
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.lastAction).toBe('signMessage');
    expect(snapshot.result.status).toBe('error');
});

test('E2E-009 should sign typed data successfully', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await connectWallet(app, walletPopup);
    await walletPopup.completePendingRequest(() => app.runAction('signTypedData'), 'confirm');
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.status).toBe('success');
    expect(snapshot.result.lastAction).toBe('signTypedData');
    expectHexSignature(snapshot.result.value);
});

test('E2E-010 should report an error when typed-data signing is rejected', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await connectWallet(app, walletPopup);
    await walletPopup.completePendingRequest(() => app.runAction('signTypedData'), 'reject');
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.lastAction).toBe('signTypedData');
    expect(snapshot.result.status).toBe('error');
});

test('E2E-011 should throw WalletDisconnectedError when signing without a connection', async ({ app }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    // Reset to ensure a clean adapter with no auto-connected address
    await app.runAction('resetAdapter');
    await app.runAction('signMessage');
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.lastAction).toBe('signMessage');
    expect(snapshot.result.status).toBe('error');
    expect(snapshot.result.errorName).toBe('WalletDisconnectedError');
});
