import { createE2EFixtures } from '@tronweb3/evm-adapter-e2e-shared';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const e2eDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { okxConfig } from '../wallet-config.js';

const { test, expect, e2eEnv } = createE2EFixtures(okxConfig, e2eDir);

export { test, expect, e2eEnv };
