import { test, expect } from '../fixtures/index.js';
import { defineDiscoveryTests } from '@tronweb3/evm-adapter-e2e-shared/specs';
import { tronlinkConfig } from '../wallet-config.js';

defineDiscoveryTests(test, expect, tronlinkConfig);
