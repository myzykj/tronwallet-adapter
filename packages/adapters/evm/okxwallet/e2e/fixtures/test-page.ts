import { expect, type Page } from '@playwright/test';
import { e2eEnv } from './env.js';

export type AdapterActionName =
    | 'resetAdapter'
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
}

export interface AdapterSnapshot {
    readyState: string;
    address: string | null;
    connected: boolean;
    chainId: string;
    providerFound: boolean | null;
    providerIsOkxWallet: boolean | null;
    result: AdapterResultSnapshot;
    events: AdapterEventEntry[];
}

declare global {
    interface Window {
        okxWalletAdapterE2E: {
            runAction(action: AdapterActionName): Promise<AdapterResultSnapshot>;
            getSnapshot(): AdapterSnapshot;
            clearEvents(): void;
            setField(name: string, value: string): void;
        };
    }
}

export class AdapterE2EPage {
    constructor(private readonly page: Page, private readonly baseURL: string) {}

    async goto() {
        const url = new URL(this.baseURL);
        url.searchParams.set('chainId', e2eEnv.testChainId);
        url.searchParams.set('receiver', e2eEnv.testReceiverAddress);
        url.searchParams.set('value', e2eEnv.testValueWei);
        await this.page.goto(url.toString());
        await expect(this.page.getByTestId('adapter-name')).toHaveText('OKX Wallet');
    }

    async runAction(action: AdapterActionName) {
        return this.page.evaluate(async (nextAction) => {
            return window.okxWalletAdapterE2E.runAction(nextAction);
        }, action);
    }

    async getSnapshot(): Promise<AdapterSnapshot> {
        return this.page.evaluate(() => window.okxWalletAdapterE2E.getSnapshot());
    }

    async clearEvents() {
        await this.page.evaluate(() => window.okxWalletAdapterE2E.clearEvents());
    }

    async setField(name: 'switchChain' | 'receiver' | 'value' | 'message', value: string) {
        await this.page.evaluate(
            ({ key, nextValue }) => {
                window.okxWalletAdapterE2E.setField(key, nextValue);
            },
            { key: name, nextValue: value }
        );
    }
}
