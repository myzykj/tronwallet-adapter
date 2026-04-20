import { test, expect, e2eEnv } from '../fixtures/index.js';
import { defineChainTests } from '@tronweb3/evm-adapter-e2e-shared/specs';
import { tronlinkConfig } from '../wallet-config.js';

defineChainTests(test, expect, tronlinkConfig, e2eEnv);
