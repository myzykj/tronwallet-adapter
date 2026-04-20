import { test, expect } from '../fixtures/index.js';
import { defineConnectTests } from '@tronweb3/evm-adapter-e2e-shared/specs';
import { tronlinkConfig } from '../wallet-config.js';

defineConnectTests(test, expect, tronlinkConfig);
