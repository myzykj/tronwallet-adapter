import type { TestType, Expect } from '@playwright/test';
import type { WalletE2EConfig } from '../types.js';
import type { E2EEnv } from '../env.js';
import type { AdapterE2EPage } from '../fixtures/test-page.js';
import type { WalletPopupController } from '../fixtures/wallet-popup.js';
import { connectWallet, resolveConfiguredChainId } from '../helpers/test-helpers.js';

type Fixtures = { app: AdapterE2EPage; walletPopup: WalletPopupController };

export function defineChainTests(
    test: TestType<Fixtures, {}>,
    expect: Expect,
    config: WalletE2EConfig,
    e2eEnv: E2EEnv
) {
    const supportsAddChain = config.capabilities?.addChain !== false;

    test('E2E-015 should switch to an already configured chain', async ({ app, walletPopup }, testInfo) => {
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
        test.skip(
            testInfo.project.name !== 'with-extension',
            `This test requires the ${config.walletName} extension project.`
        );
        if (!supportsAddChain) {
            test.skip(true, `${config.walletName} does not support switching/adding chains.`);
        }

        await connectWallet(app, walletPopup);
        await app.setField('switchChain', e2eEnv.testUnknownChainId);
        await walletPopup.completePendingRequest(() => app.runAction('switchChain'), 'reject', {
            popupMode: 'optional',
        });
        const snapshot = await app.getSnapshot();

        expect(snapshot.result.lastAction).toBe('switchChain');
        expect(['success', 'error']).toContain(snapshot.result.status);
    });
}
