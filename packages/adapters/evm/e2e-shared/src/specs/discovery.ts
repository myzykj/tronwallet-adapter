import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineDiscoveryTests(test: TestType<Fixtures, {}>, expect: Expect, config: WalletE2EConfig) {
    test(`E2E-001 should discover ${config.walletName} via EIP-6963`, async ({ app }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return snapshot.readyState;
            })
            .toBe('Found');
    });

    test('E2E-002 should return the injected provider', async ({ app }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );

        await app.runAction('getProvider');
        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return {
                    providerFound: snapshot.providerFound,
                    providerIdentityCheck: snapshot.providerIdentityCheck,
                };
            })
            .toEqual({
                providerFound: true,
                providerIdentityCheck: true,
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
}
