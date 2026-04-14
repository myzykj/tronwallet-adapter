import { test, expect } from '../fixtures/okx-wallet.js';

test('E2E-001 should discover OKX Wallet via EIP-6963', async ({ app }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return snapshot.readyState;
        })
        .toBe('Found');
});

test('E2E-002 should return the injected provider', async ({ app }, testInfo) => {
    test.skip(testInfo.project.name !== 'with-extension', 'This test requires the OKX Wallet extension project.');

    await app.runAction('getProvider');
    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return {
                providerFound: snapshot.providerFound,
                providerIsOkxWallet: snapshot.providerIsOkxWallet,
            };
        })
        .toEqual({
            providerFound: true,
            providerIsOkxWallet: true,
        });
});

test('E2E-003 should become NotFound when the extension is not loaded', async ({ app }, testInfo) => {
    test.skip(testInfo.project.name !== 'without-extension', 'This test requires the no-extension project.');

    await expect
        .poll(async () => {
            const snapshot = await app.getSnapshot();
            return snapshot.readyState;
        })
        .toBe('NotFound');
});
