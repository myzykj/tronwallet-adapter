import { test, expect } from '../fixtures/index.js';
import { defineSignTests } from '@tronweb3/evm-adapter-e2e-shared/specs';
import { tronlinkConfig } from '../wallet-config.js';

defineSignTests(test, expect, tronlinkConfig);
