/**
 * Browser-side harness for EVM wallet adapter E2E testing.
 *
 * Each wallet adapter creates its own `pages/main.ts` that calls `initHarness(adapter, config)`.
 * The harness wires up the adapter to the page DOM, exposes a `window.<walletId>AdapterE2E` global API
 * for Playwright/Appium to drive, and renders state into `data-testid` elements.
 */
import type {
    AdapterActionName,
    AdapterEventEntry,
    AdapterResultSnapshot,
    AdapterHarnessConfig,
    WalletE2EConfig,
} from '../types.js';

type ResultStatus = 'idle' | 'pending' | 'success' | 'error';

interface ResultState {
    lastAction: string;
    status: ResultStatus;
    value: string;
    errorName: string;
    errorMessage: string;
    errorCode: number | null;
}

interface EVMAdapter {
    name: string;
    address: string | null;
    connected: boolean;
    readyState: string;
    on(event: string, handler: (payload?: unknown) => void): this;
    removeAllListeners(): this;
    getProvider(): Promise<unknown>;
    connect(): Promise<unknown>;
    signMessage(params: { message: string }): Promise<unknown>;
    signTypedData(params: { typedData: unknown }): Promise<unknown>;
    sendTransaction(params: { from: string | null; to: string; value: string; chainId: string }): Promise<unknown>;
    switchChain(chainId: `0x${string}`): Promise<unknown>;
    network(): Promise<string>;
}

export function initHarness(adapter: EVMAdapter, config: WalletE2EConfig) {
    const searchParams = new URLSearchParams(window.location.search);
    const defaultMessage = searchParams.get('message') || `Hello from ${config.walletName} E2E`;
    const defaultReceiver = searchParams.get('receiver') || '0x0000000000000000000000000000000000000000';
    const defaultValue = searchParams.get('value') || '0x38D7EA4C68000';
    const defaultChainId = searchParams.get('chainId') || '0xaa36a7';
    const harnessConfig = resolveHarnessConfig();

    function parseChainId(value: string) {
        return value.startsWith('0x') || value.startsWith('0X')
            ? Number.parseInt(value, 16)
            : Number.parseInt(value, 10);
    }

    function parseBooleanParam(name: string, defaultValue: boolean) {
        const value = searchParams.get(name);
        if (value === null) return defaultValue;
        switch (value.trim().toLowerCase()) {
            case '1':
            case 'true':
            case 'yes':
            case 'on':
                return true;
            case '0':
            case 'false':
            case 'no':
            case 'off':
                return false;
            default:
                return defaultValue;
        }
    }

    function resolveHarnessConfig(): AdapterHarnessConfig {
        const useDeeplink = parseBooleanParam('useDeeplink', false);
        return {
            scenario: searchParams.get('scenario') || (useDeeplink ? 'deeplink' : 'inapp'),
            useDeeplink,
            openUrlWhenWalletNotFound: parseBooleanParam('openUrlWhenWalletNotFound', false),
        };
    }

    const elements = {
        adapterName: getByTestId('adapter-name'),
        scenario: getByTestId('scenario'),
        useDeeplink: getByTestId('use-deeplink'),
        openUrlWhenWalletNotFound: getByTestId('open-url-when-wallet-not-found'),
        readyState: getByTestId('ready-state'),
        connected: getByTestId('connected'),
        address: getByTestId('address'),
        chainId: getByTestId('chain-id'),
        providerFound: getByTestId('provider-found'),
        providerIdentityCheck: getByTestId('provider-identity-check'),
        resultAction: getByTestId('result-action'),
        resultStatus: getByTestId('result-status'),
        resultErrorName: getByTestId('result-error-name'),
        resultErrorCode: getByTestId('result-error-code'),
        resultErrorMessage: getByTestId('result-error-message'),
        resultValue: getByTestId('result-value'),
        eventLog: getByTestId('event-log'),
        nativeProbe: getByTestId('native-probe'),
        messageInput: getByTestId<HTMLInputElement>('message-input'),
        receiverInput: getByTestId<HTMLInputElement>('receiver-input'),
        valueInput: getByTestId<HTMLInputElement>('value-input'),
        switchChainInput: getByTestId<HTMLInputElement>('switch-chain-input'),
    };

    elements.messageInput.value = defaultMessage;
    elements.receiverInput.value = defaultReceiver;
    elements.valueInput.value = defaultValue;
    elements.switchChainInput.value = defaultChainId;

    const currentAdapter = adapter;
    let providerFound: boolean | null = null;
    let providerIdentityCheck: boolean | null = null;
    let chainId = '';
    let events: AdapterEventEntry[] = [];
    let resultState: ResultState = {
        lastAction: '',
        status: 'idle',
        value: '',
        errorName: '',
        errorMessage: '',
        errorCode: null,
    };

    function getByTestId<T extends HTMLElement = HTMLElement>(testId: string) {
        const element = document.querySelector<T>(`[data-testid="${testId}"]`);
        if (!element) throw new Error(`Missing data-testid="${testId}"`);
        return element;
    }

    function resetResult(action = '') {
        resultState = {
            lastAction: action,
            status: 'idle',
            value: '',
            errorName: '',
            errorMessage: '',
            errorCode: null,
        };
    }

    function serializeValue(value: unknown) {
        if (typeof value === 'string') return value;
        if (value === undefined) return '';
        return JSON.stringify(value, null, 2);
    }

    function getObjectRecord(value: unknown) {
        return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
    }

    function getNestedValue(value: unknown, key: string) {
        const record = getObjectRecord(value);
        return record ? record[key] : undefined;
    }

    function extractErrorCode(error: unknown, visited = new Set<unknown>()): number | null {
        if (!error || visited.has(error)) return null;
        visited.add(error);
        const directCode = getNestedValue(error, 'code');
        if (typeof directCode === 'number') return directCode;
        const nestedError = getNestedValue(error, 'error');
        if (nestedError !== undefined) {
            const c = extractErrorCode(nestedError, visited);
            if (c !== null) return c;
        }
        const cause = getNestedValue(error, 'cause');
        if (cause !== undefined) return extractErrorCode(cause, visited);
        return null;
    }

    function serializeError(error: unknown) {
        if (error instanceof Error)
            return { errorName: error.name, errorMessage: error.message, errorCode: extractErrorCode(error) };
        const nestedMessage = getNestedValue(error, 'message');
        const nestedName = getNestedValue(error, 'name');
        return {
            errorName: typeof nestedName === 'string' ? nestedName : 'Error',
            errorMessage:
                typeof nestedMessage === 'string'
                    ? nestedMessage
                    : typeof error === 'string'
                    ? error
                    : JSON.stringify(error),
            errorCode: extractErrorCode(error),
        };
    }

    function serializeNativeProbeValue(value: string) {
        const trimmed = value.trim();
        if (!trimmed) return '';
        try {
            const parsed = JSON.parse(trimmed);
            return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        } catch {
            return value.replace(/\r?\n/g, '\\n');
        }
    }

    function pushEvent(name: string, payload: unknown) {
        events = [...events, { name, payload, timestamp: new Date().toISOString() }];
        render();
    }

    async function syncState() {
        if (currentAdapter.connected) {
            try {
                chainId = await currentAdapter.network();
            } catch {
                chainId = '';
            }
        } else {
            chainId = '';
        }
        render();
    }

    function snapshot() {
        return {
            config: harnessConfig,
            readyState: currentAdapter.readyState,
            address: currentAdapter.address,
            connected: currentAdapter.connected,
            chainId,
            providerFound,
            providerIdentityCheck,
            result: resultState,
            events,
        };
    }

    function render() {
        elements.adapterName.textContent = currentAdapter.name;
        elements.scenario.textContent = harnessConfig.scenario;
        elements.useDeeplink.textContent = String(harnessConfig.useDeeplink);
        elements.openUrlWhenWalletNotFound.textContent = String(harnessConfig.openUrlWhenWalletNotFound);
        elements.readyState.textContent = currentAdapter.readyState;
        elements.connected.textContent = String(currentAdapter.connected);
        elements.address.textContent = currentAdapter.address || '';
        elements.chainId.textContent = chainId;
        elements.providerFound.textContent = providerFound === null ? '' : String(providerFound);
        elements.providerIdentityCheck.textContent =
            providerIdentityCheck === null ? '' : String(providerIdentityCheck);
        elements.resultAction.textContent = resultState.lastAction;
        elements.resultStatus.textContent = resultState.status;
        elements.resultErrorName.textContent = resultState.errorName;
        elements.resultErrorCode.textContent = resultState.errorCode === null ? '' : String(resultState.errorCode);
        elements.resultErrorMessage.textContent = resultState.errorMessage;
        elements.resultValue.textContent = resultState.value;
        elements.eventLog.textContent = JSON.stringify(events, null, 2);
        elements.nativeProbe.textContent = [
            `scenario=${harnessConfig.scenario}`,
            `useDeeplink=${String(harnessConfig.useDeeplink)}`,
            `openUrlWhenWalletNotFound=${String(harnessConfig.openUrlWhenWalletNotFound)}`,
            `readyState=${currentAdapter.readyState}`,
            `connected=${String(currentAdapter.connected)}`,
            `address=${currentAdapter.address || ''}`,
            `chainId=${chainId}`,
            `providerFound=${providerFound === null ? '' : String(providerFound)}`,
            `providerIdentityCheck=${providerIdentityCheck === null ? '' : String(providerIdentityCheck)}`,
            `resultAction=${resultState.lastAction}`,
            `resultStatus=${resultState.status}`,
            `resultErrorName=${resultState.errorName}`,
            `resultErrorCode=${resultState.errorCode === null ? '' : String(resultState.errorCode)}`,
            `resultErrorMessage=${serializeNativeProbeValue(resultState.errorMessage)}`,
            `resultValue=${serializeNativeProbeValue(resultState.value)}`,
        ].join('\n');
    }

    async function execute(action: string, task: () => Promise<unknown>): Promise<ResultState> {
        resultState = {
            lastAction: action,
            status: 'pending',
            value: '',
            errorName: '',
            errorMessage: '',
            errorCode: null,
        };
        render();
        try {
            const value = await task();
            resultState = {
                lastAction: action,
                status: 'success',
                value: serializeValue(value),
                errorName: '',
                errorMessage: '',
                errorCode: null,
            };
        } catch (error) {
            const serialized = serializeError(error);
            resultState = { lastAction: action, status: 'error', value: '', ...serialized };
        }
        await syncState();
        return resultState;
    }

    function wireAdapterEvents(a: EVMAdapter) {
        a.on('readyStateChanged', () => {
            void syncState();
        });
        a.on('connect', (payload) => {
            pushEvent('connect', payload);
            void syncState();
        });
        a.on('accountsChanged', (accounts) => {
            pushEvent('accountsChanged', accounts);
            void syncState();
        });
        a.on('chainChanged', (nextChainId) => {
            chainId = nextChainId as string;
            pushEvent('chainChanged', nextChainId);
            render();
        });
        a.on('disconnect', (payload) => {
            pushEvent('disconnect', payload);
            void syncState();
        });
    }

    wireAdapterEvents(currentAdapter);

    const actions: Record<AdapterActionName, () => Promise<ResultState>> = {
        resetState: async () => {
            // NOTE: this resets harness-local UI state only (event log, chainId cache, last-result).
            // It does NOT reset the adapter's own `connected` / `address` — those are managed by the
            // adapter itself and cleared by the wallet (e.g. `accountsChanged([])`). Tests that need
            // an unconnected adapter should rely on the per-test page fixture spawning a fresh adapter.
            currentAdapter.removeAllListeners();
            wireAdapterEvents(currentAdapter);
            providerFound = null;
            providerIdentityCheck = null;
            events = [];
            chainId = '';
            resetResult('resetState');
            await syncState();
            return resultState;
        },
        getProvider: async () => {
            return execute('getProvider', async () => {
                const provider = await currentAdapter.getProvider();
                providerFound = !!provider;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                providerIdentityCheck = Boolean(
                    (provider as Record<string, unknown> | null)?.[config.providerIdentityKey]
                );
                render();
                return { providerFound, providerIdentityCheck };
            });
        },
        connect: async () => execute('connect', async () => currentAdapter.connect()),
        signMessage: async () =>
            execute('signMessage', async () => currentAdapter.signMessage({ message: elements.messageInput.value })),
        signTypedData: async () =>
            execute('signTypedData', async () =>
                currentAdapter.signTypedData({
                    typedData: {
                        domain: {
                            chainId: parseChainId(chainId || defaultChainId),
                            name: 'Ether Mail',
                            verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
                            version: '1',
                        },
                        primaryType: 'Mail',
                        types: {
                            Mail: [
                                { name: 'from', type: 'string' },
                                { name: 'to', type: 'string' },
                                { name: 'contents', type: 'string' },
                            ],
                        },
                        message: {
                            from: 'cow@example.com',
                            to: 'bob@example.com',
                            contents: elements.messageInput.value,
                        },
                    },
                })
            ),
        sendTransaction: async () =>
            execute('sendTransaction', async () => {
                const nextChainId = chainId || (await currentAdapter.network());
                return currentAdapter.sendTransaction({
                    from: currentAdapter.address,
                    to: elements.receiverInput.value,
                    value: elements.valueInput.value,
                    chainId: nextChainId,
                });
            }),
        switchChain: async () =>
            execute('switchChain', async () =>
                currentAdapter.switchChain(elements.switchChainInput.value as `0x${string}`)
            ),
        network: async () =>
            execute('network', async () => {
                chainId = await currentAdapter.network();
                return chainId;
            }),
    };

    // Expose global API for Playwright / Appium
    const globalName = `${config.walletId}AdapterE2E`;
    (window as unknown as Record<string, unknown>)[globalName] = {
        runAction(action: AdapterActionName) {
            return actions[action]();
        },
        getSnapshot() {
            return snapshot();
        },
        clearEvents() {
            events = [];
            render();
        },
        setField(name: string, value: string) {
            switch (name) {
                case 'message':
                    elements.messageInput.value = value;
                    break;
                case 'receiver':
                    elements.receiverInput.value = value;
                    break;
                case 'value':
                    elements.valueInput.value = value;
                    break;
                case 'switchChain':
                    elements.switchChainInput.value = value;
                    break;
                default:
                    throw new Error(`Unsupported field: ${name}`);
            }
        },
    };

    // Wire up button click handlers
    const buttonMap: [string, AdapterActionName][] = [
        ['reset-adapter', 'resetState'],
        ['get-provider', 'getProvider'],
        ['connect', 'connect'],
        ['sign-message', 'signMessage'],
        ['sign-typed-data', 'signTypedData'],
        ['send-transaction', 'sendTransaction'],
        ['switch-chain', 'switchChain'],
        ['network', 'network'],
    ];
    for (const [testId, action] of buttonMap) {
        document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.addEventListener('click', () => {
            void actions[action]();
        });
    }

    resetResult();
    void syncState();
}
