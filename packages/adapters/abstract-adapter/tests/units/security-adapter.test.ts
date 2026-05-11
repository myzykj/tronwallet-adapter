import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SecurityAdapter } from '../../src/security-adapter.js';
import type { SignedTransaction, Transaction } from '../../src/types.js';
import { AdapterState, WalletReadyState } from '../../src/types.js';
import { WalletNotFoundError } from '../../src/errors.js';
import { defaultSecurityOptions, clearCache } from '../../src/security.js';
import type { Risk, RiskConfig } from '../../src/security.js';
import type { BaseAdapterConfig } from '../../src/adapter.js';

/**
 * Concrete implementation of SecurityAdapter for testing purposes.
 * This class extends SecurityAdapter and exposes protected methods and properties
 * as public methods to enable comprehensive unit testing.
 */
class TestSecurityAdapter extends SecurityAdapter {
    name = 'TestAdapter' as any;
    url = 'https://test-wallet.com';
    icon = 'test-icon-svg';

    private mockReadyState: WalletReadyState = WalletReadyState.NotFound;
    private mockState: AdapterState = AdapterState.NotFound;
    private mockConnecting = false;
    private mockAddress: string | null = null;
    private shouldWalletExist = false;
    private shouldOpenApp = false;

    get readyState(): WalletReadyState {
        return this.mockReadyState;
    }

    get state(): AdapterState {
        return this.mockState;
    }

    get connecting(): boolean {
        return this.mockConnecting;
    }

    get connected(): boolean {
        return this.state === AdapterState.Connected;
    }

    get address(): string | null {
        return this.mockAddress;
    }

    connect(): Promise<void> {
        return this._beforeConnect();
    }
    async signMessage(): Promise<string> {
        return '';
    }
    async signTransaction(transaction: Transaction): Promise<SignedTransaction> {
        return {
            ...transaction,
            signature: [''],
        };
    }

    async testBeforeConnect(): Promise<void> {
        return this._beforeConnect();
    }

    async checkSecurity(): Promise<void> {
        return super.checkSecurity();
    }

    getCommonConfig(): Required<BaseAdapterConfig> {
        return this.commonConfig;
    }

    setMockReadyState(state: WalletReadyState): void {
        this.mockReadyState = state;
    }

    setMockState(state: AdapterState): void {
        this.mockState = state;
    }

    setMockConnecting(connecting: boolean): void {
        this.mockConnecting = connecting;
    }

    setMockAddress(address: string | null): void {
        this.mockAddress = address;
    }

    setWalletExistence(exists: boolean): void {
        this.shouldWalletExist = exists;
    }

    setOpenAppResponse(shouldOpen: boolean): void {
        this.shouldOpenApp = shouldOpen;
    }

    protected async _checkWallet(): Promise<boolean> {
        if (this.shouldWalletExist) {
            this.setMockReadyState(WalletReadyState.Found);
            return true;
        }
        this.setMockReadyState(WalletReadyState.NotFound);
        return false;
    }

    protected _openAppByDeepLinkIfNeed(): boolean {
        return this.shouldOpenApp;
    }
}

const TEST_CONFIG_URL = 'https://example.com/cfg.json';
const TEST_CONFIG_URLS = [TEST_CONFIG_URL];

const mockRisk: Risk = {
    noticeType: 1,
    title: 'security-risk-1',
    ext: '>=1.0.0',
    ios: '>=1.0.0',
    and: '>=1.0.0',
};

const buildConfig = (wallets: Record<string, Risk[]> = {}): RiskConfig => ({
    v: '1.0.0',
    ts: 1735286400000,
    wallets,
});

const mockFetch = (config: RiskConfig) => {
    vi.stubGlobal(
        'fetch',
        vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(config),
            } as Response)
        )
    );
};

describe('SecurityAdapter', () => {
    let adapter: TestSecurityAdapter;
    let windowOpenSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
        clearCache();
        adapter = new TestSecurityAdapter();
        windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        clearCache();
    });

    describe('constructor and configuration', () => {
        /**
         * Test that SecurityAdapter initializes with default configuration values
         * when no parameters are provided to the constructor
         */
        it('should initialize with default config when no params provided', () => {
            const newAdapter = new TestSecurityAdapter();
            const config = newAdapter.getCommonConfig();

            expect(config.checkTimeout).toBe(2 * 1000);
            expect(config.openAppWithDeeplink).toBe(true);
            expect(config.openUrlWhenWalletNotFound).toBe(true);
            expect(config.securityOptions).toEqual(defaultSecurityOptions);
        });

        /**
         * Test that the default security check is disabled (enabled: false)
         */
        it('should disable security check by default', () => {
            const newAdapter = new TestSecurityAdapter();
            expect(newAdapter.getCommonConfig().securityOptions.enabled).toBe(false);
        });

        /**
         * Test that defaultSecurityOptions exposes configUrls as an array
         */
        it('should expose configUrls as an array in defaults', () => {
            expect(Array.isArray(defaultSecurityOptions.configUrls)).toBe(true);
            expect(defaultSecurityOptions.configUrls.length).toBeGreaterThan(0);
        });

        /**
         * Test that custom configuration parameters are properly merged with default values
         * ensuring that specified values override defaults while others remain unchanged
         */
        it('should merge provided config with defaults', () => {
            const customConfig: BaseAdapterConfig = {
                checkTimeout: 5000,
                openUrlWhenWalletNotFound: false,
                openAppWithDeeplink: false,
            };
            const newAdapter = new TestSecurityAdapter(customConfig);
            const config = newAdapter.getCommonConfig();

            expect(config.checkTimeout).toBe(5000);
            expect(config.openUrlWhenWalletNotFound).toBe(false);
            expect(config.openAppWithDeeplink).toBe(false);
            expect(config.securityOptions).toEqual(defaultSecurityOptions);
        });

        /**
         * Test that the constructor throws an error when checkTimeout is not a valid number
         * This ensures proper validation of configuration parameters
         */
        it('should throw error for invalid checkTimeout', () => {
            expect(() => {
                new TestSecurityAdapter({ checkTimeout: 'invalid' as any });
            }).toThrow('[WalletAdapter] config.checkTimeout should be a number');
        });

        /**
         * Test that checkTimeout accepts zero as a valid value
         */
        it('should accept zero as a valid checkTimeout value', () => {
            const newAdapter = new TestSecurityAdapter({ checkTimeout: 0 });
            expect(newAdapter.getCommonConfig().checkTimeout).toBe(0);
        });

        /**
         * Test that the constructor throws when security check is enabled but configUrls is missing
         */
        it('should throw when enabled is true but configUrls is not provided', () => {
            expect(() => {
                new TestSecurityAdapter({
                    securityOptions: { enabled: true },
                });
            }).toThrow(/config\.securityOptions\.configUrls is required/);
        });

        /**
         * Test that the constructor throws when security check is enabled but configUrls is empty
         */
        it('should throw when enabled is true but configUrls is an empty array', () => {
            expect(() => {
                new TestSecurityAdapter({
                    securityOptions: { enabled: true, configUrls: [] },
                });
            }).toThrow(/config\.securityOptions\.configUrls is required/);
        });

        /**
         * Test that the constructor does not validate configUrls when security check is disabled
         */
        it('should not require configUrls when enabled is false', () => {
            expect(() => {
                new TestSecurityAdapter({
                    securityOptions: { enabled: false },
                });
            }).not.toThrow();
        });

        /**
         * Test that the constructor succeeds when enabled is true and configUrls has entries
         */
        it('should accept enabled true with non-empty configUrls', () => {
            expect(() => {
                new TestSecurityAdapter({
                    securityOptions: { enabled: true, configUrls: TEST_CONFIG_URLS },
                });
            }).not.toThrow();
        });
    });

    describe('_beforeConnect method', () => {
        /**
         * Test that _beforeConnect returns early without performing any checks
         * when the adapter is already in a connected state
         */
        it('should return early if already connected', async () => {
            adapter.setMockState(AdapterState.Connected);
            const checkWalletSpy = vi.spyOn(adapter as any, '_checkWallet');
            const checkSecuritySpy = vi.spyOn(adapter, 'checkSecurity');

            await adapter.testBeforeConnect();

            expect(checkWalletSpy).not.toHaveBeenCalled();
            expect(checkSecuritySpy).not.toHaveBeenCalled();
        });

        /**
         * Test that _beforeConnect returns early without performing wallet checks
         * when the adapter is already in the process of connecting
         */
        it('should return early if already connecting', async () => {
            adapter.setMockConnecting(true);
            const checkWalletSpy = vi.spyOn(adapter as any, '_checkWallet');

            await adapter.testBeforeConnect();

            expect(checkWalletSpy).not.toHaveBeenCalled();
        });

        /**
         * Test that _beforeConnect throws WalletNotFoundError when the wallet is not found
         * and the configuration allows opening the wallet URL in a new window
         */
        it('should throw WalletNotFoundError and open URL when wallet not found', async () => {
            adapter.setWalletExistence(false);
            adapter.setOpenAppResponse(false);

            await expect(adapter.testBeforeConnect()).rejects.toThrow(WalletNotFoundError);
            expect(windowOpenSpy).toHaveBeenCalledWith('https://test-wallet.com', '_blank');
        });

        /**
         * Test that _beforeConnect does not open URL when openUrlWhenWalletNotFound is disabled
         * even when the wallet is not found
         */
        it('should not open URL when openUrlWhenWalletNotFound is false', async () => {
            const configuredAdapter = new TestSecurityAdapter({
                openUrlWhenWalletNotFound: false,
            });
            configuredAdapter.setWalletExistence(false);
            configuredAdapter.setOpenAppResponse(false);

            await expect(configuredAdapter.testBeforeConnect()).rejects.toThrow(WalletNotFoundError);
            expect(windowOpenSpy).not.toHaveBeenCalled();
        });

        /**
         * Test that _beforeConnect does not open URL when the _openAppByDeepLinkIfNeed method
         * successfully opens the app using deep linking
         */
        it('should not open URL if _openAppByDeepLinkIfNeed returns true', async () => {
            adapter.setWalletExistence(false);
            adapter.setOpenAppResponse(true);

            await expect(adapter.testBeforeConnect()).rejects.toThrow(WalletNotFoundError);
            expect(windowOpenSpy).not.toHaveBeenCalled();
        });

        /**
         * Test that _beforeConnect successfully proceeds through security checks
         * when the wallet is found and ready
         */
        it('should call checkSecurity when wallet is found', async () => {
            adapter.setWalletExistence(true);
            const checkSecuritySpy = vi.spyOn(adapter, 'checkSecurity').mockResolvedValue();

            await adapter.testBeforeConnect();

            expect(checkSecuritySpy).toHaveBeenCalled();
        });

        /**
         * Test that _beforeConnect propagates errors thrown by checkSecurity method
         */
        it('should propagate errors from checkSecurity', async () => {
            adapter.setWalletExistence(true);
            const testError = new Error('Security check failed');
            vi.spyOn(adapter, 'checkSecurity').mockRejectedValue(testError);

            await expect(adapter.testBeforeConnect()).rejects.toThrow('Security check failed');
        });
    });

    describe('checkSecurity method', () => {
        /**
         * Test that checkSecurity returns early without fetching when enabled is false (default)
         */
        it('should skip the security check when enabled is false', async () => {
            const fetchSpy = vi.fn();
            vi.stubGlobal('fetch', fetchSpy);

            await adapter.checkSecurity();

            expect(fetchSpy).not.toHaveBeenCalled();
        });

        /**
         * Test that checkSecurity retrieves risk configuration and triggers the onRiskDetected callback
         * when risks are found for the current adapter under the new `wallets` schema
         */
        it('should call onRiskDetected callback when risks are detected for this adapter', async () => {
            const mockRisks = [mockRisk];
            mockFetch(buildConfig({ TestAdapter: mockRisks }));

            const callbackSpy = vi.fn().mockResolvedValue(undefined);
            const configuredAdapter = new TestSecurityAdapter({
                securityOptions: {
                    enabled: true,
                    configUrls: TEST_CONFIG_URLS,
                    onRiskDetected: callbackSpy,
                },
            });

            await configuredAdapter.checkSecurity();

            expect(callbackSpy).toHaveBeenCalledWith({ risks: mockRisks });
        });

        /**
         * Test that checkSecurity does not trigger onRiskDetected callback
         * when no risks are found for the current adapter
         */
        it('should not call onRiskDetected when no risks are detected for this adapter', async () => {
            mockFetch(buildConfig({ OtherAdapter: [mockRisk] }));

            const callbackSpy = vi.fn();
            const configuredAdapter = new TestSecurityAdapter({
                securityOptions: {
                    enabled: true,
                    configUrls: TEST_CONFIG_URLS,
                    onRiskDetected: callbackSpy,
                },
            });

            await configuredAdapter.checkSecurity();

            expect(callbackSpy).not.toHaveBeenCalled();
        });

        /**
         * Test that checkSecurity uses the default onRiskDetected callback
         * when one is not explicitly configured
         */
        it('should use default onRiskDetected callback if not provided', async () => {
            const mockRisks: Risk[] = [{ noticeType: 2, title: 'test-risk' }];
            mockFetch(buildConfig({ TestAdapter: mockRisks }));

            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
                // noop
            });
            const configuredAdapter = new TestSecurityAdapter({
                securityOptions: { enabled: true, configUrls: TEST_CONFIG_URLS },
            });

            await configuredAdapter.checkSecurity();

            expect(consoleSpy).toHaveBeenCalledWith('[WalletAdapter] Risk detected:', { risks: mockRisks });

            consoleSpy.mockRestore();
        });

        /**
         * Test that checkSecurity invokes onConfigFallback when all configUrls fail and no cache exists
         */
        it('should invoke onConfigFallback when all URLs fail with no cache', async () => {
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

            const onConfigFallbackSpy = vi.fn().mockResolvedValue(buildConfig());
            const configuredAdapter = new TestSecurityAdapter({
                securityOptions: {
                    enabled: true,
                    configUrls: TEST_CONFIG_URLS,
                    onConfigFallback: onConfigFallbackSpy,
                    retries: 0,
                },
            });

            await expect(configuredAdapter.checkSecurity()).resolves.toBeUndefined();
            expect(onConfigFallbackSpy).toHaveBeenCalled();
        });

        /**
         * Test that checkSecurity defaults to "safe" (allow connection) when fetch fails
         * and no onConfigFallback is provided. The risk callback should not run.
         */
        it('should default to safe (no callback) when fetch fails without a fallback', async () => {
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

            const callbackSpy = vi.fn();
            const configuredAdapter = new TestSecurityAdapter({
                securityOptions: {
                    enabled: true,
                    configUrls: TEST_CONFIG_URLS,
                    onRiskDetected: callbackSpy,
                    retries: 0,
                },
            });

            await expect(configuredAdapter.checkSecurity()).resolves.toBeUndefined();
            expect(callbackSpy).not.toHaveBeenCalled();
        });

        /**
         * Test that checkSecurity merges risks from multiple configUrls
         */
        it('should merge wallets entries from multiple configUrls', async () => {
            const riskA: Risk = { noticeType: 1, title: 'risk-a' };
            const riskB: Risk = { noticeType: 3, title: 'risk-b' };

            const fetchMock = vi.fn().mockImplementation((url: string) => {
                const config: RiskConfig =
                    url === 'https://a.example.com/cfg.json'
                        ? { v: '1.0.0', ts: 1, wallets: { TestAdapter: [riskA] } }
                        : { v: '1.0.1', ts: 2, wallets: { TestAdapter: [riskB] } };
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(config),
                } as Response);
            });
            vi.stubGlobal('fetch', fetchMock);

            const callbackSpy = vi.fn().mockResolvedValue(undefined);
            const configuredAdapter = new TestSecurityAdapter({
                securityOptions: {
                    enabled: true,
                    configUrls: ['https://a.example.com/cfg.json', 'https://b.example.com/cfg.json'],
                    onRiskDetected: callbackSpy,
                },
            });

            await configuredAdapter.checkSecurity();

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(callbackSpy).toHaveBeenCalledWith({ risks: [riskA, riskB] });
        });

        /**
         * Test that checkSecurity correctly passes security options to fetchJsonWithCache
         */
        it('should use custom security options from config', async () => {
            const customSecurityOptions = {
                enabled: true,
                configUrls: TEST_CONFIG_URLS,
                timeout: 5000,
                retries: 3,
            };

            const configuredAdapter = new TestSecurityAdapter({
                securityOptions: customSecurityOptions,
            });

            mockFetch(buildConfig());

            await configuredAdapter.checkSecurity();

            expect(configuredAdapter.getCommonConfig().securityOptions.timeout).toBe(5000);
            expect(configuredAdapter.getCommonConfig().securityOptions.retries).toBe(3);
        });
    });

    describe('integration scenarios', () => {
        /**
         * Test the complete flow of _beforeConnect when all conditions are met for connection
         * including wallet availability and security checks
         */
        it('should successfully complete _beforeConnect flow with wallet found', async () => {
            adapter.setWalletExistence(true);
            mockFetch(buildConfig());

            await expect(adapter.testBeforeConnect()).resolves.toBeUndefined();
            expect(adapter.readyState).toBe(WalletReadyState.Found);
        });

        /**
         * Test that configuration can be overridden for individual adapter instances
         * without affecting other instances
         */
        it('should not share config between adapter instances', () => {
            const adapter1 = new TestSecurityAdapter({ checkTimeout: 1000 });
            const adapter2 = new TestSecurityAdapter({ checkTimeout: 5000 });

            expect(adapter1.getCommonConfig().checkTimeout).toBe(1000);
            expect(adapter2.getCommonConfig().checkTimeout).toBe(5000);
        });
    });
});
