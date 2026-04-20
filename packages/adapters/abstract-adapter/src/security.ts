export interface Risk {
    level: 1 | 2 | 3;
    name: string;
    ext: string;
    ios: string;
    and: string;
}
export interface RiskConfig {
    v: string;
    ts: string;
    [walletName: `${string}`]: Risk[] | string;
}
export interface RiskDetectionResult {
    risks: Array<Risk>;
}
export interface SecurityOptions {
    /**
     * Remote config JSON URL
     */
    configUrl?: string;
    /**
     * Disable security check (default: false)
     */
    disabled?: boolean;
    /**
     * Custom callback when risk is detected
     */
    onRiskDetected?: (result: RiskDetectionResult) => Promise<void>;
    /**
     * Request timeout in milliseconds (default: 2000)
     */
    timeout?: number;
    /**
     * Number of retries when config fetch request fails (default: 0)
     */
    retries?: number;
    /**
     * Fallback handler when config fetch fails
     */
    onConfigFallback?: () => Promise<RiskConfig>;
    /**
     * Cache TTL in milliseconds (default: 10 * 60 * 1000)
     */
    cacheTTL?: number;
}

export const defaultSecurityOptions = {
    onRiskDetected: async (result: RiskDetectionResult) => {
        console.log(`[WalletAdapter] Risk detected:`, result);
    },
    configUrl: 'https://wallet-adapter.tronscan.org/config.json',
    disabled: false,
    timeout: 2000,
    retries: 0,
    cacheTTL: 10 * 60 * 1000,
    onConfigFallback: async (): Promise<RiskConfig> => {
        return { v: '', ts: '' };
    },
};

const _jsonCache: Record<string, { data: any; timestamp: number }> = {};
export function clearCache() {
    Object.keys(_jsonCache).forEach((key) => {
        Reflect.deleteProperty(_jsonCache, key);
    });
}

export async function fetchJsonWithCache(
    options: Omit<SecurityOptions, 'disabled' | 'onRiskDetected'>
): ReturnType<Required<SecurityOptions>['onConfigFallback']> {
    const {
        configUrl: url = defaultSecurityOptions.configUrl,
        timeout = defaultSecurityOptions.timeout,
        retries = defaultSecurityOptions.retries,
        onConfigFallback = defaultSecurityOptions.onConfigFallback,
        cacheTTL = defaultSecurityOptions.cacheTTL,
    } = options;
    const now = Date.now();
    const cache = _jsonCache[url];
    if (cache && now - cache.timestamp < cacheTTL) {
        return cache.data;
    }

    async function fetchWithTimeout(): Promise<any> {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);
            fetch(url, { signal: controller.signal })
                .then((resp) => {
                    clearTimeout(timer);
                    if (!resp.ok) reject(new Error('Fetch failed with code: ' + resp.status));
                    else resp.json().then(resolve, reject);
                })
                .catch((err) => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }

    let lastError: any = null;
    for (let i = 0; i <= retries; i++) {
        try {
            const data = await fetchWithTimeout();
            _jsonCache[url] = { data, timestamp: Date.now() };
            return data;
        } catch (err) {
            lastError = err;
        }
    }
    if (onConfigFallback) {
        return await onConfigFallback();
    }
    throw lastError || new Error('Fetch error');
}
