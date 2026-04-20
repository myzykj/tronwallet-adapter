import type { WalletE2EConfig } from '@tronweb3/evm-adapter-e2e-shared';

export const okxConfig: WalletE2EConfig = {
    walletId: 'okxwallet',
    walletName: 'OKX Wallet',
    providerIdentityKey: 'isOkxWallet',
    extensionPathEnvVar: 'OKX_WALLET_EXTENSION_PATH',
    walletPasswordEnvVar: 'OKX_WALLET_PASSWORD',
    e2eBaseUrlEnvVar: 'OKX_WALLET_E2E_BASE_URL',
    unlockPagePath: '/home.html#/unlock',
    unlockFramePredicate: (frameUrl, extensionOrigin) =>
        frameUrl.startsWith(extensionOrigin) && frameUrl.includes('/ses.html#/'),
};
