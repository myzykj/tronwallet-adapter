import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { E2EEnv } from '../env.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet, resolveConfiguredChainId } from '../helpers/test-helpers.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineEventsTests(
    test: TestType<Fixtures, {}>,
    expect: Expect,
    config: WalletE2EConfig,
    e2eEnv: E2EEnv
) {
    const supportsAddChain = config.capabilities?.addChain !== false;

    test(`E2E-017 should emit accountsChanged after switching the active account in ${config.walletName}`, async ({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        test.fixme(
            true,
            `Switching accounts inside the ${config.walletName} extension still needs wallet-specific selectors for the account menu.`
        );
    });

    test('E2E-018 should emit chainChanged after switching chains', async ({ app, walletPopup }, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        if (!supportsAddChain) {
            test.skip(true, `${config.walletName} does not support switching/adding chains.`);
        }

        const connected = await connectWallet(app, walletPopup);
        const configuredChainId = resolveConfiguredChainId(connected.chainId || '', e2eEnv.testChainId);
        await app.clearEvents();
        await app.setField('switchChain', configuredChainId);
        await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'confirm', {
            popupMode: 'optional',
        });

        await expect
            .poll(async () => {
                const snapshot = await app.getSnapshot();
                return snapshot.events.some((event) => event.name === 'chainChanged');
            })
            .toBe(true);
    });

    test(`E2E-019 should observe either accountsChanged([]) or disconnect after the wallet is locked`, async ({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        test.fixme(
            true,
            `Locking the ${config.walletName} profile from the extension UI still needs wallet-specific selectors for the account menu.`
        );
    });
}
