import type { BaseAdapterConfig } from './adapter.js';
import { Adapter } from './adapter.js';
import { WalletNotFoundError } from './errors.js';
import { defaultSecurityOptions, fetchJsonWithCache } from './security.js';
import { WalletReadyState } from './types.js';
import { isInBrowser } from './utils.js';

/**
 * Class to provide security check for wallets.
 */
export abstract class AddonAdapter extends Adapter {
    protected commonConfig: Required<BaseAdapterConfig> = {
        checkTimeout: 2 * 1000,
        openAppWithDeeplink: true,
        openUrlWhenWalletNotFound: true,
        securityOptions: defaultSecurityOptions,
    };
    constructor(params?: BaseAdapterConfig) {
        super();
        this.commonConfig = {
            ...this.commonConfig,
            ...params,
        };
        if (typeof this.commonConfig.checkTimeout !== 'number') {
            throw new Error(`[WalletAdapter] config.checkTimeout should be a number`);
        }
        const { enabled, configUrls } = this.commonConfig.securityOptions;
        if (enabled && (!configUrls || configUrls.length === 0)) {
            throw new Error(
                `[WalletAdapter] config.securityOptions.configUrls is required when securityOptions.enabled is true`
            );
        }
    }

    protected async _beforeConnect() {
        if (this.connected || this.connecting) return;
        await this._checkWallet();
        if (this.readyState === WalletReadyState.NotFound) {
            if (
                isInBrowser() &&
                !this._openAppByDeepLinkIfNeed() &&
                this.commonConfig.openUrlWhenWalletNotFound !== false
            ) {
                window.open(this.url, '_blank');
            }
            throw new WalletNotFoundError();
        }
        await this.checkSecurity();
    }
    private _securityCheckCache: { promise: Promise<void>; timestamp: number } | null = null;
    private static readonly SECURITY_CHECK_CACHE_TTL = 10 * 1000;
    /**
     * Fetch remote config and do risk check.
     * The result (resolved or rejected) is cached for 10 seconds so rapid
     * repeated calls within that window share a single check; after the TTL
     * expires, the next call runs a fresh check.
     */
    protected async checkSecurity(): Promise<void> {
        if (!this.commonConfig.securityOptions.enabled) return;
        const now = Date.now();
        if (
            this._securityCheckCache &&
            now - this._securityCheckCache.timestamp < AddonAdapter.SECURITY_CHECK_CACHE_TTL
        ) {
            return this._securityCheckCache.promise;
        }
        const promise = (async () => {
            const result = await fetchJsonWithCache(this.commonConfig.securityOptions);
            const risks = result.wallets[this.name];
            if (risks) {
                const callback =
                    this.commonConfig.securityOptions.onRiskDetected || defaultSecurityOptions.onRiskDetected;
                await callback({ risks });
            }
        })();
        this._securityCheckCache = { promise, timestamp: now };
        return promise;
    }
    /**
     * Check if wallet exists and update readyState.
     * @returns true if wallet exists, false otherwise.

     */
    protected abstract _checkWallet(): Promise<boolean>;
    /**
     * Open wallet's app by deep link.
     * @returns true if do the open action, false otherwise.
     */
    protected abstract _openAppByDeepLinkIfNeed(): boolean;
}
