import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { E2EEnv } from '../env.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet, ensureChain, expectTransactionHash } from '../helpers/test-helpers.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineTransactionTests(
    test: TestType<Fixtures, {}>,
    expect: Expect,
    config: WalletE2EConfig,
    e2eEnv: E2EEnv
) {
    test('E2E-012 should send a transaction successfully', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

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
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

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
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await app.runAction('resetState');
        await app.runAction('sendTransaction');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('sendTransaction');
        expect(snapshot.result.status).toBe('error');
        expect(snapshot.result.errorName).toBe('WalletDisconnectedError');
    });
}
