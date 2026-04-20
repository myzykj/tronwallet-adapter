import { expect, type Page } from '@playwright/test';
import type { AdapterActionName, AdapterSnapshot, WalletE2EConfig } from '../types.js';
import type { E2EEnv } from '../env.js';

export class AdapterE2EPage {
    private readonly globalName: string;

    constructor(
        private readonly page: Page,
        private readonly baseURL: string,
        private readonly config: WalletE2EConfig,
        private readonly e2eEnv: E2EEnv
    ) {
        this.globalName = `${config.walletId}AdapterE2E`;
    }

    async goto() {
        const url = new URL(this.baseURL);
        url.searchParams.set('chainId', this.e2eEnv.testChainId);
        url.searchParams.set('receiver', this.e2eEnv.testReceiverAddress);
        url.searchParams.set('value', this.e2eEnv.testValueWei);
        await this.page.goto(url.toString());
        // Wait for the harness to render adapter.name into the page; do not require it to equal config.walletName,
        // since adapters may expose a slightly different display name.
        await expect(this.page.getByTestId('adapter-name')).toHaveText(/\S+/);
    }

    async runAction(action: AdapterActionName) {
        return this.page.evaluate(
            async ({ globalName, nextAction }) => {
                return (window as unknown as Record<string, { runAction(a: string): Promise<unknown> }>)[
                    globalName
                ].runAction(nextAction);
            },
            { globalName: this.globalName, nextAction: action }
        );
    }

    async getSnapshot(): Promise<AdapterSnapshot> {
        return this.page.evaluate(
            ({ globalName }) => {
                return (window as unknown as Record<string, { getSnapshot(): AdapterSnapshot }>)[
                    globalName
                ].getSnapshot();
            },
            { globalName: this.globalName }
        );
    }

    async clearEvents() {
        await this.page.evaluate(
            ({ globalName }) => {
                (window as unknown as Record<string, { clearEvents(): void }>)[globalName].clearEvents();
            },
            { globalName: this.globalName }
        );
    }

    async setField(name: 'switchChain' | 'receiver' | 'value' | 'message', value: string) {
        await this.page.evaluate(
            ({ globalName, key, nextValue }) => {
                (window as unknown as Record<string, { setField(n: string, v: string): void }>)[globalName].setField(
                    key,
                    nextValue
                );
            },
            { globalName: this.globalName, key: name, nextValue: value }
        );
    }
}
