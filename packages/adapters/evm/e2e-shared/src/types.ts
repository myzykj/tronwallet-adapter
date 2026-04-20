// ── Adapter harness types (shared between Node test runner and browser page) ──

export type AdapterActionName =
    | 'resetState'
    | 'getProvider'
    | 'connect'
    | 'signMessage'
    | 'signTypedData'
    | 'sendTransaction'
    | 'switchChain'
    | 'network';

export interface AdapterEventEntry {
    name: string;
    payload: unknown;
    timestamp: string;
}

export interface AdapterResultSnapshot {
    lastAction: string;
    status: 'idle' | 'pending' | 'success' | 'error';
    value: string;
    errorName: string;
    errorMessage: string;
    errorCode: number | null;
}

export interface AdapterHarnessConfig {
    scenario: string;
    useDeeplink: boolean;
    openUrlWhenWalletNotFound: boolean;
}

export interface AdapterSnapshot {
    config: AdapterHarnessConfig;
    readyState: string;
    address: string | null;
    connected: boolean;
    chainId: string;
    providerFound: boolean | null;
    providerIdentityCheck: boolean | null;
    result: AdapterResultSnapshot;
    events: AdapterEventEntry[];
}

// ── Wallet E2E config (provided by each wallet adapter) ──

export interface WalletE2ECapabilities {
    /** Whether the wallet supports signTypedData. Default: true. TronLink = false. */
    signTypedData?: boolean;
    /** Whether the wallet supports addChain. Default: true. TronLink/Binance = false. */
    addChain?: boolean;
}

export interface WalletE2EConfig {
    /**
     * Short identifier used for temp dir prefixes and the `window.<walletId>AdapterE2E` global name.
     * Should be lowercase alphanumeric (no hyphens) so it forms a legal JS identifier. e.g. 'metamask', 'okxwallet'.
     */
    walletId: string;
    /** Human-readable wallet name displayed in test page and skip messages. e.g. 'MetaMask', 'OKX Wallet' */
    walletName: string;

    /** Provider identity property key. e.g. 'isMetaMask', 'isOkxWallet', 'isTrust' */
    providerIdentityKey: string;

    /** Environment variable name for the extension path. e.g. 'METAMASK_EXTENSION_PATH' */
    extensionPathEnvVar: string;
    /** Environment variable name for the wallet unlock password. e.g. 'METAMASK_PASSWORD' */
    walletPasswordEnvVar: string;
    /** Environment variable name for the E2E base URL. e.g. 'METAMASK_E2E_BASE_URL' */
    e2eBaseUrlEnvVar: string;

    /** Internal route for the wallet's unlock page. e.g. '/home.html#/unlock' (OKX), '/unlock.html' (MetaMask) */
    unlockPagePath: string;
    /** Predicate to detect the unlock iframe/frame within the extension. */
    unlockFramePredicate: (frameUrl: string, extensionOrigin: string) => boolean;

    /** Override the default confirm button name patterns (optional). */
    confirmButtonNames?: RegExp[];
    /** Override the default reject button name patterns (optional). */
    rejectButtonNames?: RegExp[];
    /** Override the default unlock button name patterns (optional). */
    unlockButtonNames?: RegExp[];

    /**
     * Declare the capabilities the wallet supports. Unset keys default to `true` (supported).
     * Setting a capability to `false` causes the corresponding tests to be skipped.
     */
    capabilities?: WalletE2ECapabilities;
}

// ── Default button name patterns ──

export const DEFAULT_CONFIRM_BUTTON_NAMES: RegExp[] = [
    /^next$/i,
    /^connect$/i,
    /^approve$/i,
    /^confirm$/i,
    /^sign$/i,
    /^ok$/i,
    /^done$/i,
    /^submit$/i,
];

export const DEFAULT_REJECT_BUTTON_NAMES: RegExp[] = [/^reject$/i, /^cancel$/i, /^close$/i, /^not now$/i];

export const DEFAULT_UNLOCK_BUTTON_NAMES: RegExp[] = [/^unlock$/i, /^log in$/i, /^login$/i, /^confirm$/i, /^submit$/i];

/** Resolve effective capabilities with defaults (everything enabled). */
export function resolveCapabilities(config: WalletE2EConfig): Required<WalletE2ECapabilities> {
    return {
        signTypedData: config.capabilities?.signTypedData ?? true,
        addChain: config.capabilities?.addChain ?? true,
    };
}
