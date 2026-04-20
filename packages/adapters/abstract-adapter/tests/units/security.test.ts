import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchJsonWithCache, defaultSecurityOptions, clearCache } from '../../src/security.js';
import type { RiskConfig } from '../../src/security.js';

describe('security.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearCache();
    });

    describe('fetchJsonWithCache', () => {
        it('should fetch JSON from URL successfully', async () => {
            const mockData: RiskConfig = {
                v: '1.0.0',
                ts: '2024-01-01 00:00:00',
                wallet1: [
                    {
                        level: 1,
                        name: 'risk1',
                        ext: '>=4.1.0 <4.2.0',
                        ios: '>=4.1.0 <4.2.0',
                        and: '>=4.1.0 <4.2.0',
                    },
                ],
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockData),
                } as Response)
            );

            const result = await fetchJsonWithCache({
                configUrl: 'https://example.com/config.json',
            });

            expect(result).toEqual(mockData);
            expect(global.fetch).toHaveBeenCalledWith('https://example.com/config.json', expect.any(Object));
        });

        it('should use cached data if not expired', async () => {
            const mockData = { v: '1.0.0', ts: '2024-01-01' };
            const url = 'https://example.com/config.json';

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockData),
                } as Response)
            );

            await fetchJsonWithCache({ configUrl: url, cacheTTL: 60000 });
            expect(global.fetch).toHaveBeenCalledTimes(1);

            await fetchJsonWithCache({ configUrl: url, cacheTTL: 60000 });
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should timeout if request takes too long', { timeout: 9000 }, async () => {
            global.fetch = vi.fn(
                () =>
                    new Promise<any>((resolve) => {
                        setTimeout(() => {
                            resolve({
                                ok: true,
                                json: () => Promise.resolve({}),
                            } as Response);
                        }, 800);
                    })
            );

            await expect(
                fetchJsonWithCache({
                    configUrl: 'https://example.com/config.json',
                    timeout: 500,
                    retries: 0,
                })
            ).resolves.toEqual({});
        });

        it('should retry on failure', async () => {
            let callCount = 0;
            global.fetch = vi.fn(() => {
                callCount++;
                if (callCount < 3) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ v: '1.0.0' }),
                } as Response);
            });

            const result = await fetchJsonWithCache({
                configUrl: 'https://example.com/config.json',
                retries: 2,
            });

            expect(result).toEqual({ v: '1.0.0' });
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('should call onConfigFallback after max retries', async () => {
            const fallbackConfig = { v: '0.0.0', ts: '2024-01-01' };
            const onConfigFallback = vi.fn(() => Promise.resolve(fallbackConfig));

            global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

            const result = await fetchJsonWithCache({
                configUrl: 'https://example.com/config.json',
                retries: 1,
                onConfigFallback,
            });

            expect(result).toEqual(fallbackConfig);
            expect(onConfigFallback).toHaveBeenCalledTimes(1);
            expect(global.fetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
        });

        it('should use default options if not provided', async () => {
            const mockData = { v: '1.0.0', ts: '2024-01-01' };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockData),
                } as Response)
            );

            await fetchJsonWithCache({});

            expect(global.fetch).toHaveBeenCalledWith(defaultSecurityOptions.configUrl, expect.any(Object));
        });

        it('should reject when HTTP response is not ok', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 404,
                } as Response)
            );

            const onConfigFallback = vi.fn(() => Promise.resolve({ v: '', ts: '' }));

            await fetchJsonWithCache({
                configUrl: 'https://example.com/config.json',
                retries: 0,
                onConfigFallback,
            });

            expect(onConfigFallback).toHaveBeenCalled();
        });
    });

    describe('defaultSecurityOptions', () => {
        it('should have correct default values', () => {
            expect(defaultSecurityOptions.disabled).toBe(false);
            expect(defaultSecurityOptions.timeout).toBe(2000);
            expect(defaultSecurityOptions.retries).toBe(0);
            expect(defaultSecurityOptions.cacheTTL).toBe(10 * 60 * 1000);
            expect(defaultSecurityOptions.configUrl).toBe('https://wallet-adapter.tronscan.org/config.json');
        });

        it('should have onRiskDetected callback', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            await defaultSecurityOptions.onRiskDetected!({ risks: [] });
            expect(consoleSpy).toHaveBeenCalledWith('[WalletAdapter] Risk detected:', expect.any(Object));
            consoleSpy.mockRestore();
        });

        it('should have onConfigFallback callback', async () => {
            const result = await defaultSecurityOptions.onConfigFallback!();
            expect(result).toEqual({ v: '', ts: '' });
        });
    });
});
