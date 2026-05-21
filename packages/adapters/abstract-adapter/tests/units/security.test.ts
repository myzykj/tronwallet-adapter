import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchJsonWithCache, defaultSecurityOptions, clearCache } from '../../src/security.js';
import type { Risk, RiskConfig } from '../../src/security.js';

const buildConfig = (wallets: Record<string, Risk[]> = {}, overrides: Partial<RiskConfig> = {}): RiskConfig => ({
    v: '1.0.0',
    ts: 1735286400000,
    wallets,
    ...overrides,
});

const mockOk = (data: RiskConfig) =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
    } as Response);

describe('security.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearCache();
    });

    describe('fetchJsonWithCache', () => {
        it('should fetch JSON from URL successfully', async () => {
            const mockData: RiskConfig = buildConfig({
                wallet1: [
                    {
                        noticeType: 1,
                        title: 'risk1',
                        ext: '>=4.1.0 <4.2.0',
                        ios: '>=4.1.0 <4.2.0',
                        and: '>=4.1.0 <4.2.0',
                    },
                ],
            });

            global.fetch = vi.fn(() => mockOk(mockData));

            const result = await fetchJsonWithCache({
                configUrls: ['https://example.com/config.json'],
            });

            expect(result).toEqual(mockData);
            expect(global.fetch).toHaveBeenCalledWith('https://example.com/config.json', expect.any(Object));
        });

        it('should use cached data if not expired', async () => {
            const mockData = buildConfig();
            const url = 'https://example.com/config.json';

            global.fetch = vi.fn(() => mockOk(mockData));

            await fetchJsonWithCache({ configUrls: [url], cacheTTL: 60000 });
            expect(global.fetch).toHaveBeenCalledTimes(1);

            await fetchJsonWithCache({ configUrls: [url], cacheTTL: 60000 });
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should fall back to safe empty config when fetch times out', { timeout: 9000 }, async () => {
            global.fetch = vi.fn(
                (_url, init) =>
                    new Promise<Response>((resolve, reject) => {
                        const timer = setTimeout(() => {
                            resolve({
                                ok: true,
                                json: () => Promise.resolve(buildConfig()),
                            } as Response);
                        }, 800);
                        init?.signal?.addEventListener('abort', () => {
                            clearTimeout(timer);
                            reject(new Error('Aborted'));
                        });
                    })
            ) as typeof global.fetch;

            await expect(
                fetchJsonWithCache({
                    configUrls: ['https://example.com/config.json'],
                    timeout: 500,
                    retries: 0,
                })
            ).resolves.toEqual({ v: '', ts: 0, wallets: {} });
        });

        it('should retry on failure', async () => {
            const mockData = buildConfig({ wallet1: [{ noticeType: 1, title: 'r' }] });
            let callCount = 0;
            global.fetch = vi.fn(() => {
                callCount++;
                if (callCount < 3) {
                    return Promise.reject(new Error('Network error'));
                }
                return mockOk(mockData);
            });

            const result = await fetchJsonWithCache({
                configUrls: ['https://example.com/config.json'],
                retries: 2,
            });

            expect(result).toEqual(mockData);
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('should call onConfigFallback after max retries', async () => {
            const fallbackConfig = buildConfig({}, { v: '0.0.0', ts: 1 });
            const onConfigFallback = vi.fn(() => Promise.resolve(fallbackConfig));

            global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

            const result = await fetchJsonWithCache({
                configUrls: ['https://example.com/config.json'],
                retries: 1,
                onConfigFallback,
            });

            expect(result).toEqual(fallbackConfig);
            expect(onConfigFallback).toHaveBeenCalledTimes(1);
            expect(global.fetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
        });

        it('should default to safe empty config when fetch fails without onConfigFallback', async () => {
            global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

            const result = await fetchJsonWithCache({
                configUrls: ['https://example.com/config.json'],
                retries: 0,
            });

            expect(result).toEqual({ v: '', ts: 0, wallets: {} });
        });

        it('should return a safe empty config when no configUrls are provided', async () => {
            const fetchSpy = vi.fn(() => mockOk(buildConfig()));
            global.fetch = fetchSpy;

            const result = await fetchJsonWithCache({});

            // defaultSecurityOptions.configUrls is empty, so no fetch happens
            expect(fetchSpy).not.toHaveBeenCalled();
            expect(result).toEqual({ v: '', ts: 0, wallets: {} });
        });

        it('should call onConfigFallback when HTTP response is not ok', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 404,
                } as Response)
            );

            const onConfigFallback = vi.fn(() => Promise.resolve(buildConfig()));

            await fetchJsonWithCache({
                configUrls: ['https://example.com/config.json'],
                retries: 0,
                onConfigFallback,
            });

            expect(onConfigFallback).toHaveBeenCalled();
        });

        it('should merge wallets entries from multiple configUrls', async () => {
            const riskA: Risk = { noticeType: 1, title: 'risk-a' };
            const riskB: Risk = { noticeType: 3, title: 'risk-b' };

            global.fetch = vi.fn().mockImplementation((url: string) => {
                const config: RiskConfig =
                    url === 'https://a.example.com/cfg.json'
                        ? buildConfig({ walletX: [riskA] }, { ts: 1 })
                        : buildConfig({ walletX: [riskB], walletY: [riskA] }, { ts: 2, v: '2.0.0' });
                return mockOk(config);
            });

            const result = await fetchJsonWithCache({
                configUrls: ['https://a.example.com/cfg.json', 'https://b.example.com/cfg.json'],
            });

            expect(result.wallets.walletX).toEqual([riskA, riskB]);
            expect(result.wallets.walletY).toEqual([riskA]);
            // Latest ts wins for top-level metadata
            expect(result.v).toBe('2.0.0');
            expect(result.ts).toBe(2);
        });

        it('should deduplicate merged risks by title (first occurrence wins)', async () => {
            // Same title across configs — should keep only the first.
            const riskV1: Risk = { noticeType: 1, title: 'shared', ext: '>=1.0.0' };
            const riskV2: Risk = { noticeType: 3, title: 'shared', ext: '>=2.0.0' };
            const riskUnique: Risk = { noticeType: 2, title: 'unique' };

            global.fetch = vi.fn().mockImplementation((url: string) => {
                const config: RiskConfig =
                    url === 'https://a.example.com/cfg.json'
                        ? buildConfig({ walletX: [riskV1, riskUnique] }, { ts: 1 })
                        : buildConfig({ walletX: [riskV2, riskUnique] }, { ts: 2 });
                return mockOk(config);
            });

            const result = await fetchJsonWithCache({
                configUrls: ['https://a.example.com/cfg.json', 'https://b.example.com/cfg.json'],
            });

            expect(result.wallets.walletX).toEqual([riskV1, riskUnique]);
        });

        it('should deduplicate duplicates within a single configUrl', async () => {
            const risk: Risk = { noticeType: 1, title: 'dup' };
            global.fetch = vi.fn(() => mockOk(buildConfig({ walletX: [risk, risk, { ...risk, ext: '>=2.0.0' }] })));

            const result = await fetchJsonWithCache({
                configUrls: ['https://example.com/cfg.json'],
            });

            expect(result.wallets.walletX).toEqual([risk]);
        });

        it('should normalize a response missing the wallets property to an empty object', async () => {
            // Simulate a malformed/partial response from the server.
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ v: '1.0.0', ts: 1 }),
                } as Response)
            );

            const result = await fetchJsonWithCache({
                configUrls: ['https://example.com/cfg.json'],
            });

            expect(result.wallets).toEqual({});
        });

        it('should normalize a non-object response to a safe empty config', async () => {
            // Server returns a JSON primitive (null/string/number) instead of an object.
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(null),
                } as Response)
            );

            const result = await fetchJsonWithCache({
                configUrls: ['https://example.com/cfg.json'],
            });

            expect(result.wallets).toEqual({});
        });

        it('should normalize a non-object wallets property to an empty object', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ v: '1.0.0', ts: 1, wallets: 'not-an-object' }),
                } as Response)
            );

            const result = await fetchJsonWithCache({
                configUrls: ['https://example.com/cfg.json'],
            });

            expect(result.wallets).toEqual({});
        });

        it('should use stale cache when refetch fails', async () => {
            const url = 'https://example.com/config.json';
            const mockData = buildConfig({ walletA: [{ noticeType: 1, title: 'cached' }] });

            // First call: success — populate cache
            global.fetch = vi.fn(() => mockOk(mockData));
            await fetchJsonWithCache({ configUrls: [url], cacheTTL: 0 });
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Second call: cacheTTL=0 forces refetch, but fetch fails → fall back to stale cache
            global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
            const result = await fetchJsonWithCache({ configUrls: [url], cacheTTL: 0, retries: 0 });

            expect(result).toEqual(mockData);
        });
    });

    describe('defaultSecurityOptions', () => {
        it('should have correct default values', () => {
            expect(defaultSecurityOptions.enabled).toBe(false);
            expect(defaultSecurityOptions.timeout).toBe(2000);
            expect(defaultSecurityOptions.retries).toBe(0);
            expect(defaultSecurityOptions.cacheTTL).toBe(10 * 60 * 1000);
            expect(defaultSecurityOptions.configUrls).toEqual([]);
        });

        it('should have onRiskDetected callback', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            await defaultSecurityOptions.onRiskDetected({ risks: [] });
            expect(consoleSpy).toHaveBeenCalledWith('[WalletAdapter] Risk detected:', expect.any(Object));
            consoleSpy.mockRestore();
        });
    });
});
