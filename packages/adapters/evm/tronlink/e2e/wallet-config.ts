import type { WalletE2EConfig } from '@tronweb3/evm-adapter-e2e-shared';

export const tronlinkConfig: WalletE2EConfig = {
    walletId: 'tronlink',
    walletName: 'TronLink',
    providerIdentityKey: 'isTronLink',
    extensionPathEnvVar: 'TRONLINK_EXTENSION_PATH',
    walletPasswordEnvVar: 'TRONLINK_PASSWORD',
    e2eBaseUrlEnvVar: 'TRONLINK_E2E_BASE_URL',
    // TronLink's lock screen is its /login route (the same popup that shows when opening
    // the extension against a locked wallet). No dedicated /unlock route.
    unlockPagePath: '/popup/popup.html#/login',
    // TronLink renders the password form in the popup's main frame (no nested iframe).
    // Return false for every frame so the fixture falls back to page.mainFrame().
    unlockFramePredicate: () => false,
    capabilities: {
        signTypedData: false,
        addChain: false,
    },
};
