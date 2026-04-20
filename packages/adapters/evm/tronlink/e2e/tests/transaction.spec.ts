import { test, expect, e2eEnv } from '../fixtures/index.js';
import { defineTransactionTests } from '@tronweb3/evm-adapter-e2e-shared/specs';
import { tronlinkConfig } from '../wallet-config.js';

defineTransactionTests(test, expect, tronlinkConfig, e2eEnv);
