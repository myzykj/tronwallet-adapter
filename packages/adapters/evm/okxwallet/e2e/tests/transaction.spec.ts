import { test, expect, e2eEnv } from '../fixtures/okx-wallet.js';
import { connectWallet, ensureChain, expectTransactionHash } from './helpers.js';

test('E2E-012 should send a transaction successfully', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await connectWallet(app, walletPopup);
    await ensureChain(app, walletPopup, e2eEnv.testChainId);
    await app.setField('receiver', e2eEnv.testReceiverAddress);
    await app.setField('value', e2eEnv.testValueWei);
    await walletPopup.completePendingRequest(() => app.runAction('sendTransaction'), 'confirm');
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.lastAction).toBe('sendTransaction');
    expect(snapshot.result.status).toBe('success');
    expectTransactionHash(snapshot.result.value);
});

test('E2E-013 should report an error when sendTransaction is rejected', async ({ app, walletPopup }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await connectWallet(app, walletPopup);
    await ensureChain(app, walletPopup, e2eEnv.testChainId);
    await walletPopup.completePendingRequest(() => app.runAction('sendTransaction'), 'reject');
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.lastAction).toBe('sendTransaction');
    expect(snapshot.result.status).toBe('error');
});

test('E2E-014 should throw WalletDisconnectedError when sendTransaction is called before connect', async ({
    app,
}, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    // Reset to ensure a clean adapter with no auto-connected address
    await app.runAction('resetAdapter');
    await app.runAction('sendTransaction');
    const snapshot = await app.getSnapshot();

    expect(snapshot.result.lastAction).toBe('sendTransaction');
    expect(snapshot.result.status).toBe('error');
    expect(snapshot.result.errorName).toBe('WalletDisconnectedError');
});
