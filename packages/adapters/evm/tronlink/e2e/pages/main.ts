import { TronLinkEvmAdapter } from '../../src/index.ts';
import { initHarness } from '@tronweb3/evm-adapter-e2e-shared/page';
import { tronlinkConfig } from '../wallet-config.js';

const searchParams = new URLSearchParams(window.location.search);
const useDeeplink = searchParams.get('useDeeplink') === 'true';
const openUrlWhenWalletNotFound = searchParams.get('openUrlWhenWalletNotFound') === 'true';

const adapter = new TronLinkEvmAdapter({
    useDeeplink,
    openUrlWhenWalletNotFound,
});

initHarness(adapter, tronlinkConfig);
