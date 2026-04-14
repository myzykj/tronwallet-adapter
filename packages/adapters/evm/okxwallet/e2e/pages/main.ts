import { OkxWalletEvmAdapter } from '../../src/index.ts';

type ResultStatus = 'idle' | 'pending' | 'success' | 'error';

interface ResultState {
    lastAction: string;
    status: ResultStatus;
    value: string;
    errorName: string;
    errorMessage: string;
}

interface EventEntry {
    name: string;
    payload: unknown;
    timestamp: string;
}

const searchParams = new URLSearchParams(window.location.search);
const defaultMessage = searchParams.get('message') || 'Hello from OKX Wallet E2E';
const defaultReceiver = searchParams.get('receiver') || '0x0000000000000000000000000000000000000000';
const defaultValue = searchParams.get('value') || '0x38D7EA4C68000';
const defaultChainId = searchParams.get('chainId') || '0xaa36a7';

function parseChainId(value: string) {
    return value.startsWith('0x') || value.startsWith('0X') ? Number.parseInt(value, 16) : Number.parseInt(value, 10);
}

const elements = {
    adapterName: getByTestId('adapter-name'),
    readyState: getByTestId('ready-state'),
    connected: getByTestId('connected'),
    address: getByTestId('address'),
    chainId: getByTestId('chain-id'),
    providerFound: getByTestId('provider-found'),
    providerIsOkxWallet: getByTestId('provider-is-okxwallet'),
    resultAction: getByTestId('result-action'),
    resultStatus: getByTestId('result-status'),
    resultErrorName: getByTestId('result-error-name'),
    resultErrorMessage: getByTestId('result-error-message'),
    resultValue: getByTestId('result-value'),
    eventLog: getByTestId('event-log'),
    messageInput: getByTestId<HTMLInputElement>('message-input'),
    receiverInput: getByTestId<HTMLInputElement>('receiver-input'),
    valueInput: getByTestId<HTMLInputElement>('value-input'),
    switchChainInput: getByTestId<HTMLInputElement>('switch-chain-input'),
};

elements.messageInput.value = defaultMessage;
elements.receiverInput.value = defaultReceiver;
elements.valueInput.value = defaultValue;
elements.switchChainInput.value = defaultChainId;

let adapter = createAdapter();
let providerFound: boolean | null = null;
let providerIsOkxWallet: boolean | null = null;
let chainId = '';
let events: EventEntry[] = [];
let resultState: ResultState = {
    lastAction: '',
    status: 'idle',
    value: '',
    errorName: '',
    errorMessage: '',
};

function getByTestId<T extends HTMLElement = HTMLElement>(testId: string) {
    const element = document.querySelector<T>(`[data-testid="${testId}"]`);
    if (!element) {
        throw new Error(`Missing data-testid="${testId}"`);
    }
    return element;
}

function createAdapter() {
    const nextAdapter = new OkxWalletEvmAdapter({
        useDeeplink: false,
        openUrlWhenWalletNotFound: false,
    });

    nextAdapter.on('readyStateChanged', () => {
        void syncState();
    });
    nextAdapter.on('connect', (payload) => {
        pushEvent('connect', payload);
        void syncState();
    });
    nextAdapter.on('accountsChanged', (accounts) => {
        pushEvent('accountsChanged', accounts);
        void syncState();
    });
    nextAdapter.on('chainChanged', (nextChainId) => {
        chainId = nextChainId;
        pushEvent('chainChanged', nextChainId);
        render();
    });
    nextAdapter.on('disconnect', (payload) => {
        pushEvent('disconnect', payload);
        void syncState();
    });

    return nextAdapter;
}

function resetResult(action = '') {
    resultState = {
        lastAction: action,
        status: 'idle',
        value: '',
        errorName: '',
        errorMessage: '',
    };
}

function serializeValue(value: unknown) {
    if (typeof value === 'string') {
        return value;
    }

    if (value === undefined) {
        return '';
    }

    return JSON.stringify(value, null, 2);
}

function serializeError(error: unknown) {
    if (error instanceof Error) {
        return {
            errorName: error.name,
            errorMessage: error.message,
        };
    }

    return {
        errorName: 'Error',
        errorMessage: typeof error === 'string' ? error : JSON.stringify(error),
    };
}

function pushEvent(name: string, payload: unknown) {
    events = [...events, { name, payload, timestamp: new Date().toISOString() }];
    render();
}

async function syncState() {
    if (adapter.connected) {
        try {
            chainId = await adapter.network();
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
        readyState: adapter.readyState,
        address: adapter.address,
        connected: adapter.connected,
        chainId,
        providerFound,
        providerIsOkxWallet,
        result: resultState,
        events,
    };
}

function render() {
    elements.adapterName.textContent = adapter.name;
    elements.readyState.textContent = adapter.readyState;
    elements.connected.textContent = String(adapter.connected);
    elements.address.textContent = adapter.address || '';
    elements.chainId.textContent = chainId;
    elements.providerFound.textContent = providerFound === null ? '' : String(providerFound);
    elements.providerIsOkxWallet.textContent = providerIsOkxWallet === null ? '' : String(providerIsOkxWallet);
    elements.resultAction.textContent = resultState.lastAction;
    elements.resultStatus.textContent = resultState.status;
    elements.resultErrorName.textContent = resultState.errorName;
    elements.resultErrorMessage.textContent = resultState.errorMessage;
    elements.resultValue.textContent = resultState.value;
    elements.eventLog.textContent = JSON.stringify(events, null, 2);
}

async function execute(action: string, task: () => Promise<unknown>) {
    resultState = {
        lastAction: action,
        status: 'pending',
        value: '',
        errorName: '',
        errorMessage: '',
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
        };
    } catch (error) {
        const serialized = serializeError(error);
        resultState = {
            lastAction: action,
            status: 'error',
            value: '',
            ...serialized,
        };
    }

    await syncState();
    return resultState;
}

const actions = {
    resetAdapter: async () => {
        adapter.removeAllListeners();
        adapter = createAdapter();
        providerFound = null;
        providerIsOkxWallet = null;
        events = [];
        chainId = '';
        resetResult('resetAdapter');
        await syncState();
        return resultState;
    },
    getProvider: async () => {
        return execute('getProvider', async () => {
            const provider = await adapter.getProvider();
            providerFound = !!provider;
            providerIsOkxWallet = Boolean((provider as { isOkxWallet?: boolean } | null)?.isOkxWallet);
            render();
            return {
                providerFound,
                providerIsOkxWallet,
            };
        });
    },
    connect: async () => execute('connect', async () => adapter.connect()),
    signMessage: async () =>
        execute('signMessage', async () =>
            adapter.signMessage({
                message: elements.messageInput.value,
            })
        ),
    signTypedData: async () =>
        execute('signTypedData', async () =>
            adapter.signTypedData({
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
            const nextChainId = chainId || (await adapter.network());
            return adapter.sendTransaction({
                from: adapter.address,
                to: elements.receiverInput.value,
                value: elements.valueInput.value,
                chainId: nextChainId,
            });
        }),
    switchChain: async () =>
        execute('switchChain', async () => {
            return adapter.switchChain(elements.switchChainInput.value as `0x${string}`);
        }),
    network: async () =>
        execute('network', async () => {
            chainId = await adapter.network();
            return chainId;
        }),
};

window.okxWalletAdapterE2E = {
    runAction(action) {
        return actions[action]();
    },
    getSnapshot() {
        return snapshot();
    },
    clearEvents() {
        events = [];
        render();
    },
    setField(name, value) {
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

document.querySelector<HTMLButtonElement>('[data-testid="reset-adapter"]')?.addEventListener('click', () => {
    void actions.resetAdapter();
});
document.querySelector<HTMLButtonElement>('[data-testid="get-provider"]')?.addEventListener('click', () => {
    void actions.getProvider();
});
document.querySelector<HTMLButtonElement>('[data-testid="connect"]')?.addEventListener('click', () => {
    void actions.connect();
});
document.querySelector<HTMLButtonElement>('[data-testid="sign-message"]')?.addEventListener('click', () => {
    void actions.signMessage();
});
document.querySelector<HTMLButtonElement>('[data-testid="sign-typed-data"]')?.addEventListener('click', () => {
    void actions.signTypedData();
});
document.querySelector<HTMLButtonElement>('[data-testid="send-transaction"]')?.addEventListener('click', () => {
    void actions.sendTransaction();
});
document.querySelector<HTMLButtonElement>('[data-testid="switch-chain"]')?.addEventListener('click', () => {
    void actions.switchChain();
});
document.querySelector<HTMLButtonElement>('[data-testid="network"]')?.addEventListener('click', () => {
    void actions.network();
});

resetResult();
void syncState();
