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
interface RiskDetectedResult {
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
    disableCheck?: boolean;
    /**
     * Custom callback when risk is detected
     */
    onRiskDetected?: (result: RiskDetectedResult) => Promise<void>;
    /**
     * Request timeout in milliseconds (default: 2000)
     */
    timeout?: number;
    /**
     * Number of retries when config fetch request fails (default: 0)
     */
    retryCount?: number;
    /**
     * Custom error handler for request errors
     */
    handleError?: () => Promise<Partial<RiskConfig>>;
    /**
     * Cache duration in milliseconds (default: 10 * 60 * 1000)
     */
    cacheTime?: number;
}

export const defaultSecurityOptions = {
    onRiskDetected: async (result: RiskDetectedResult) => {
        console.log(`[WalletAdapter] Risk detected:`, result);
    },
    configUrl: 'https://wallet-adapter.tronscan.org/config.json',
    disableCheck: false,
    timeout: 2000,
    retryCount: 0,
    cacheTime: 10 * 60 * 1000,
    handleError: async () => {
        return {};
    },
};

const _jsonCache: Record<string, { data: any; timestamp: number }> = {};
export function clearCache() {
    Object.keys(_jsonCache).forEach((key) => {
        Reflect.deleteProperty(_jsonCache, key);
    });
}

export async function fetchJsonWithCache(
    options: Omit<SecurityOptions, 'disableCheck' | 'onRiskDetected'>
): ReturnType<Required<SecurityOptions>['handleError']> {
    const {
        configUrl: url = defaultSecurityOptions.configUrl,
        timeout = defaultSecurityOptions.timeout,
        retryCount = defaultSecurityOptions.retryCount,
        handleError = defaultSecurityOptions.handleError,
        cacheTime = defaultSecurityOptions.cacheTime,
    } = options;
    const now = Date.now();
    const cache = _jsonCache[url];
    if (cache && now - cache.timestamp < cacheTime) {
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
    for (let i = 0; i <= retryCount; i++) {
        try {
            const data = await fetchWithTimeout();
            _jsonCache[url] = { data, timestamp: Date.now() };
            return data;
        } catch (err) {
            lastError = err;
        }
    }
    if (handleError) {
        return await handleError();
    }
    throw lastError || new Error('Fetch error');
}
