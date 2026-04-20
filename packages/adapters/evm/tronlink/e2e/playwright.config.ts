import { createPlaywrightConfig } from '@tronweb3/evm-adapter-e2e-shared/config';
import { tronlinkConfig } from './wallet-config.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
export default createPlaywrightConfig(tronlinkConfig, e2eDir);
