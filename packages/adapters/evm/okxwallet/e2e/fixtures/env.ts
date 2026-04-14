import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = path.dirname(fileURLToPath(import.meta.url));
const e2eDir = path.resolve(fixturesDir, '..');
const packageRoot = path.resolve(e2eDir, '..');

// Load .env file from e2e directory (does not overwrite existing env vars)
const envFile = path.resolve(e2eDir, '.env');
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

function resolvePath(input: string) {
    return path.isAbsolute(input) ? input : path.resolve(packageRoot, input);
}

function getOptionalPath(name: string) {
    const value = process.env[name];
    return value ? resolvePath(value) : null;
}

export function getRequiredPath(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return resolvePath(value);
}

export const e2eEnv = {
    e2eDir,
    packageRoot,
    extensionPath: getOptionalPath('OKX_WALLET_EXTENSION_PATH'),
    userDataDir: getOptionalPath('CHROMIUM_USER_DATA_DIR'),
    walletPassword: process.env.OKX_WALLET_PASSWORD || '',
    testChainId: process.env.TEST_CHAIN_ID || '0xaa36a7',
    testReceiverAddress: process.env.TEST_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000',
    testValueWei: process.env.TEST_VALUE_WEI || '0x38D7EA4C68000',
    testUnknownChainId: process.env.TEST_UNKNOWN_CHAIN_ID || '0x13881',
};
