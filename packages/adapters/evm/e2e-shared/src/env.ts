import fs from 'node:fs';
import path from 'node:path';
import type { WalletE2EConfig } from './types.js';

export interface E2EEnv {
    e2eDir: string;
    packageRoot: string;
    extensionPath: string | null;
    userDataDir: string | null;
    walletPassword: string;
    testChainId: string;
    testReceiverAddress: string;
    testValueWei: string;
    testUnknownChainId: string;
    baseURL: string;
}

function parseDotEnvValue(raw: string) {
    let value = raw.trim();
    if (value.length >= 2) {
        const first = value[0];
        const last = value[value.length - 1];
        if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
            return value.slice(1, -1);
        }
    }
    // strip inline comment ( " key=value # comment " ) — only when the '#' is preceded by whitespace
    const inlineComment = value.match(/\s+#.*$/);
    if (inlineComment) {
        value = value.slice(0, inlineComment.index).trimEnd();
    }
    return value;
}

function loadDotEnv(e2eDir: string) {
    const envFile = path.resolve(e2eDir, '.env');
    if (fs.existsSync(envFile)) {
        for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) continue;
            const key = trimmed.slice(0, eqIndex).trim();
            const value = parseDotEnvValue(trimmed.slice(eqIndex + 1));
            if (!(key in process.env)) {
                process.env[key] = value;
            }
        }
    }
}

function resolvePath(packageRoot: string, input: string) {
    return path.isAbsolute(input) ? input : path.resolve(packageRoot, input);
}

function getOptionalPath(packageRoot: string, name: string) {
    const value = process.env[name];
    return value ? resolvePath(packageRoot, value) : null;
}

function getRequiredPath(packageRoot: string, name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return resolvePath(packageRoot, value);
}

/**
 * Create an env loader for a specific wallet adapter's E2E tests.
 *
 * @param config The wallet E2E config (provides env var names)
 * @param e2eDir The `e2e/` directory of the consuming wallet adapter (used to locate `.env` and resolve relative paths)
 */
export function createEnvLoader(config: WalletE2EConfig, e2eDir: string) {
    const packageRoot = path.resolve(e2eDir, '..');

    // Load .env from the wallet's e2e/ directory
    loadDotEnv(e2eDir);

    const e2eEnv: E2EEnv = {
        e2eDir,
        packageRoot,
        extensionPath: getOptionalPath(packageRoot, config.extensionPathEnvVar),
        userDataDir: getOptionalPath(packageRoot, 'CHROMIUM_USER_DATA_DIR'),
        walletPassword: process.env[config.walletPasswordEnvVar] || '',
        testChainId: process.env.TEST_CHAIN_ID || '0xaa36a7',
        testReceiverAddress: process.env.TEST_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000',
        testValueWei: process.env.TEST_VALUE_WEI || '0x38D7EA4C68000',
        testUnknownChainId: process.env.TEST_UNKNOWN_CHAIN_ID || '0x13881',
        baseURL: process.env[config.e2eBaseUrlEnvVar] || 'http://127.0.0.1:4174',
    };

    return {
        e2eEnv,
        resolvePath: (input: string) => resolvePath(packageRoot, input),
        getOptionalPath: (name: string) => getOptionalPath(packageRoot, name),
        getRequiredPath: (name: string) => getRequiredPath(packageRoot, name),
    };
}
