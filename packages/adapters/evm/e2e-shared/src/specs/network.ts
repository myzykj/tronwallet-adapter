import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet } from '../helpers/test-helpers.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineNetworkTests(test: TestType<Fixtures, {}>, expect: Expect, config: WalletE2EConfig) {
    test('E2E-020 should return the current chainId through network()', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        const connected = await connectWallet(app, walletPopup);
        await app.runAction('network');
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('network');
        expect(snapshot.result.status).toBe('success');
        expect(snapshot.result.value).toBe(connected.chainId);
    });
}
