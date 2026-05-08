export interface Risk {
    title: string;
    noticeType: 1 | 2 | 3;
    ext?: string;
    ios?: string;
    and?: string;
}
export interface RiskConfig {
    v: string;
    ts: number;
    wallets: {
        [walletName: string]: Risk[];
    };
}
export interface SecurityCheckResult {
    risks: Risk[];
}
export interface SecurityOptions {
    /**
     * Remote config JSON URL(s)
     */
    configUrls?: string[];
    /**
     * Enable security check (default: false)
     */
    enabled?: boolean;
    /**
     * Custom callback when a risk is detected
     */
    onRiskDetected?: (result: SecurityCheckResult) => Promise<void>;
    /**
     * Request timeout in milliseconds (default: 2000)
     */
    timeout?: number;
    /**
     * Number of retries when the config fetch fails (default: 0)
     */
    retries?: number;
    /**
     * Custom fallback handler for config fetch errors
     */
    onConfigFallback?: () => RiskConfig | Promise<RiskConfig>;
    /**
     * Cache duration in milliseconds (default: 10 * 60 * 1000)
     */
    cacheTTL?: number;
}

export const defaultSecurityOptions = {
    onRiskDetected: async (result: SecurityCheckResult) => {
        console.log(`[WalletAdapter] Risk detected:`, result);
    },
    configUrls: ['https://wallet-adapter.tronscan.org/config.json'],
    enabled: false,
    timeout: 2000,
    retries: 0,
    cacheTTL: 10 * 60 * 1000,
};

const _jsonCache: Record<string, { data: RiskConfig; timestamp: number }> = {};
export function clearCache() {
    Object.keys(_jsonCache).forEach((key) => {
        Reflect.deleteProperty(_jsonCache, key);
    });
}

export async function fetchJsonWithCache(
    options: Omit<SecurityOptions, 'enabled' | 'onRiskDetected'>
): Promise<RiskConfig> {
    const {
        configUrls = defaultSecurityOptions.configUrls,
        timeout = defaultSecurityOptions.timeout,
        retries = defaultSecurityOptions.retries,
        onConfigFallback,
        cacheTTL = defaultSecurityOptions.cacheTTL,
    } = options;

    const now = Date.now();

    async function fetchOneUrl(url: string): Promise<RiskConfig | null> {
        const cache = _jsonCache[url];
        if (cache && now - cache.timestamp < cacheTTL) {
            return cache.data;
        }

        async function fetchWithTimeout(): Promise<RiskConfig> {
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

        for (let i = 0; i <= retries; i++) {
            try {
                const data = await fetchWithTimeout();
                _jsonCache[url] = { data, timestamp: Date.now() };
                return data;
            } catch {
                // continue to next retry
            }
        }

        // Fetch failed — fall back to stale cache if available
        if (cache) return cache.data;
        return null;
    }

    const results = await Promise.all(configUrls.map(fetchOneUrl));
    const configs = results.filter((r): r is RiskConfig => r !== null);

    if (configs.length > 0) {
        return configs.reduce<RiskConfig>(
            (merged, config) => {
                if (config.ts > merged.ts) {
                    merged.v = config.v;
                    merged.ts = config.ts;
                }
                for (const [wallet, risks] of Object.entries(config.wallets)) {
                    merged.wallets[wallet] = [...(merged.wallets[wallet] ?? []), ...risks];
                }
                return merged;
            },
            { v: '', ts: 0, wallets: {} }
        );
    }

    // All URLs failed with no cache — call custom fallback or default to safe (allow connection)
    if (onConfigFallback) {
        return await onConfigFallback();
    }
    return { v: '', ts: 0, wallets: {} };
}
