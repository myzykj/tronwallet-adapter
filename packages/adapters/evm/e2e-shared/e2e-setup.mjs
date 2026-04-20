#!/usr/bin/env node

/**
 * E2E Test Environment Setup Script.
 *
 * Usage:
 *   node e2e-setup.mjs <walletId> --extension-id <chromeExtensionId>
 *   node e2e-setup.mjs <walletId> --crx <path/to/extension.crx>
 *   node e2e-setup.mjs <walletId> --extension-dir <path/to/unpacked-extension>
 *   node e2e-setup.mjs <walletId> --launch-profile
 *   node e2e-setup.mjs <walletId> --copy-profile
 *
 * Examples (OKX Wallet):
 *   # 1. Copy extension from Chrome (auto-searches all profiles: Default, Profile 1, ...)
 *   node e2e-shared/e2e-setup.mjs okxwallet --extension-id mcohilncbfahbmgdjkbpemcciiolgcge
 *
 *   # 2. Extract from CRX file
 *   node e2e-shared/e2e-setup.mjs okxwallet --crx ~/Downloads/okxwallet.crx
 *
 *   # 3. Copy from local directory (quote paths with spaces!)
 *   node e2e-shared/e2e-setup.mjs okxwallet --extension-dir "/path/to/Chrome/Profile 60/Extensions/extid/1.0.0_0"
 *
 *   # 4. Launch Chromium to create Profile (manually initialize wallet, then close browser)
 *   node e2e-shared/e2e-setup.mjs okxwallet --launch-profile
 *
 *   # 5. Copy Profile from /tmp to project
 *   node e2e-shared/e2e-setup.mjs okxwallet --copy-profile
 *
 *   # 6. Generate .env file
 *   node e2e-shared/e2e-setup.mjs okxwallet --init-env
 *
 *   # All-in-one (extension + Profile + .env)
 *   node e2e-shared/e2e-setup.mjs okxwallet --extension-id mcohilncbfahbmgdjkbpemcciiolgcge --setup
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ── Wallet Config Map ──────────────────────────────────────────────

const WALLET_CONFIGS = {
    okxwallet: {
        name: 'OKX Wallet',
        extensionEnvVar: 'OKX_WALLET_EXTENSION_PATH',
        passwordEnvVar: 'OKX_WALLET_PASSWORD',
        baseUrlEnvVar: 'OKX_WALLET_E2E_BASE_URL',
    },
    tronlink: {
        name: 'TronLink',
        extensionEnvVar: 'TRONLINK_EXTENSION_PATH',
        passwordEnvVar: 'TRONLINK_PASSWORD',
        baseUrlEnvVar: 'TRONLINK_E2E_BASE_URL',
    },
    metamask: {
        name: 'MetaMask',
        extensionEnvVar: 'METAMASK_EXTENSION_PATH',
        passwordEnvVar: 'METAMASK_PASSWORD',
        baseUrlEnvVar: 'METAMASK_E2E_BASE_URL',
    },
    trust: {
        name: 'Trust Wallet',
        extensionEnvVar: 'TRUST_EXTENSION_PATH',
        passwordEnvVar: 'TRUST_PASSWORD',
        baseUrlEnvVar: 'TRUST_E2E_BASE_URL',
    },
    binance: {
        name: 'Binance Wallet',
        extensionEnvVar: 'BINANCE_EXTENSION_PATH',
        passwordEnvVar: 'BINANCE_PASSWORD',
        baseUrlEnvVar: 'BINANCE_E2E_BASE_URL',
    },
};

// ── Path Utilities ────────────────────────────────────────────────

function findMonorepoRoot(startDir) {
    let dir = startDir;
    for (let i = 0; i < 20; i++) {
        if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

function findWalletDir(walletId, rootDir) {
    const candidates = [
        path.join(rootDir, 'packages', 'adapters', 'evm', walletId),
        path.join(rootDir, 'packages', 'adapters', 'evm', walletId + '-evm'),
        path.join(rootDir, 'packages', 'adapters', 'evm', 'tronwallet-adapter-' + walletId + '-evm'),
    ];
    for (const dir of candidates) {
        if (fs.existsSync(dir)) return dir;
    }
    return path.join(rootDir, 'packages', 'adapters', 'evm', walletId);
}

// ── Chrome Extension Directory Lookup ──────────────────────────────

function getChromeUserDataDir() {
    const platform = os.platform();
    switch (platform) {
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
        case 'linux':
            return path.join(os.homedir(), '.config', 'google-chrome');
        case 'win32':
            return path.join(
                process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
                'Google',
                'Chrome',
                'User Data'
            );
        default:
            return null;
    }
}

function findExtensionDir(extensionId) {
    const userDataDir = getChromeUserDataDir();
    if (!userDataDir) {
        console.error(`❌ Unsupported platform: ${os.platform()}`);
        process.exit(1);
    }

    if (!fs.existsSync(userDataDir)) {
        console.error(`❌ Chrome user data directory not found: ${userDataDir}`);
        process.exit(1);
    }

    // Search all Chrome profiles: Default, Profile 1, Profile 2, ...
    const profileDirs = fs.readdirSync(userDataDir).filter((name) => {
        if (name === 'Default' || /^Profile \d+$/.test(name)) {
            const extPath = path.join(userDataDir, name, 'Extensions', extensionId);
            return fs.existsSync(extPath);
        }
        return false;
    });

    if (profileDirs.length === 0) {
        console.error(`❌ Extension not found: ${extensionId}`);
        console.error(`   Searched all Chrome profiles in: ${userDataDir}`);
        console.error(`   Please ensure the extension is installed in Chrome and the ID is correct.`);
        console.error(`   Open chrome://extensions/ with developer mode enabled to view ID.`);
        process.exit(1);
    }

    // If found in multiple profiles, prefer the one with the latest version
    let bestProfile = null;
    let bestVersion = null;
    let bestDir = null;

    for (const profile of profileDirs) {
        const extDir = path.join(userDataDir, profile, 'Extensions', extensionId);
        const versions = fs.readdirSync(extDir).filter((v) => {
            return fs.statSync(path.join(extDir, v)).isDirectory();
        });
        if (versions.length === 0) continue;
        versions.sort();
        const latest = versions[versions.length - 1];
        if (!bestVersion || latest > bestVersion) {
            bestVersion = latest;
            bestProfile = profile;
            bestDir = path.join(extDir, latest);
        }
    }

    if (!bestDir) {
        console.error(`❌ Extension directory exists but has no version subdirectory`);
        process.exit(1);
    }

    console.log(`✅ Found extension: ${extensionId} v${bestVersion} (Chrome ${bestProfile})`);
    console.log(`   Path: ${bestDir}`);
    return bestDir;
}

// ── Copy Extension ─────────────────────────────────────────────────

function copyExtension(srcDir, walletDir, walletId) {
    const destDir = path.join(walletDir, 'e2e', 'extensions', walletId);

    const samePath = path.resolve(srcDir) === path.resolve(destDir);
    if (samePath) {
        console.log(`✅ Extension already at destination, skipping copy: ${destDir}`);
        return destDir;
    }

    if (fs.existsSync(destDir)) {
        console.log(`🗑️  Cleaning old extension directory: ${destDir}`);
        fs.rmSync(destDir, { recursive: true, force: true });
    }

    fs.mkdirSync(destDir, { recursive: true });

    fs.cpSync(srcDir, destDir, { recursive: true });

    const manifestPath = path.join(destDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        console.error(`❌ Copy complete but manifest.json not found, extension may be incomplete`);
        process.exit(1);
    }

    console.log(`✅ Extension copied to: ${destDir}`);
    return destDir;
}

// ── Extract CRX ─────────────────────────────────────────────────

function extractCrx(crxPath, walletDir, walletId) {
    if (!fs.existsSync(crxPath)) {
        console.error(`❌ CRX file not found: ${crxPath}`);
        process.exit(1);
    }

    const destDir = path.join(walletDir, 'e2e', 'extensions', walletId);

    if (fs.existsSync(destDir)) {
        console.log(`🗑️  Cleaning old extension directory: ${destDir}`);
        fs.rmSync(destDir, { recursive: true, force: true });
    }

    fs.mkdirSync(destDir, { recursive: true });

    try {
        execSync(`unzip -o "${crxPath}" -d "${destDir}"`, { stdio: 'inherit' });
    } catch {
        console.error(`❌ CRX extraction failed. Try renaming to .zip and extracting manually:`);
        console.error(`   cp "${crxPath}" /tmp/extension.zip && unzip /tmp/extension.zip -d "${destDir}"`);
        process.exit(1);
    }

    const manifestPath = path.join(destDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        console.error(`❌ Extraction complete but manifest.json not found, CRX file may be invalid`);
        process.exit(1);
    }

    console.log(`✅ CRX extracted to: ${destDir}`);
    return destDir;
}

// ── Launch Chromium to Create Profile ──────────────────────────────

function findPlaywrightChromium() {
    // Use Playwright's own API to find the exact binary that tests will use.
    // This guarantees the profile is created with the same Chromium version.
    try {
        const playwrightCliPath = require.resolve('playwright-core/cli');
        const result = execSync(`node "${playwrightCliPath}" print-browser --browser chromium`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        if (result && fs.existsSync(result)) {
            return result;
        }
    } catch {
        // playwright-core CLI not available, fall through
    }

    try {
        const result = execSync('npx playwright print-browser --browser chromium 2>/dev/null', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        if (result && fs.existsSync(result)) {
            return result;
        }
    } catch {
        // fall through
    }

    // Fallback: search the Playwright cache directly, preferring the version
    // that @playwright/test@1.49.1 uses (chromium-1148 = build 1148).
    const platform = os.platform();
    const cacheDir =
        platform === 'darwin'
            ? path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
            : platform === 'linux'
              ? path.join(os.homedir(), '.cache', 'ms-playwright')
              : path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');

    if (!fs.existsSync(cacheDir)) {
        return null;
    }

    const dirs = fs.readdirSync(cacheDir).filter((d) => d.startsWith('chromium-') && !d.includes('headless'));
    if (dirs.length === 0) return null;

    // Sort by build number ascending — prefer the OLDEST version first,
    // because @playwright/test@1.49.1 is bound to chromium-1148 and that's
    // the one the tests will actually launch.
    dirs.sort();

    for (const dir of dirs) {
        const chromiumDir = path.join(cacheDir, dir);
        const candidates = [];

        if (platform === 'darwin') {
            candidates.push(
                path.join(chromiumDir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
                path.join(
                    chromiumDir,
                    'chrome-mac',
                    'Google Chrome for Testing.app',
                    'Contents',
                    'MacOS',
                    'Google Chrome for Testing'
                ),
                path.join(
                    chromiumDir,
                    'chrome-mac-arm64',
                    'Google Chrome for Testing.app',
                    'Contents',
                    'MacOS',
                    'Google Chrome for Testing'
                ),
                path.join(chromiumDir, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
            );
        } else if (platform === 'linux') {
            candidates.push(path.join(chromiumDir, 'chrome-linux', 'chrome'));
        } else {
            candidates.push(path.join(chromiumDir, 'chrome-win', 'chrome.exe'));
        }

        for (const c of candidates) {
            if (fs.existsSync(c)) return c;
        }

        try {
            const result = execSync(
                `find "${chromiumDir}" -type f \\( -name "Chromium" -o -name "chrome" -o -name "chrome.exe" -o -name "Google Chrome for Testing" \\) 2>/dev/null | head -1`,
                { encoding: 'utf-8' }
            ).trim();
            if (result && fs.existsSync(result)) return result;
        } catch {
            // find not available
        }
    }

    return null;
}

function ensurePlaywrightChromium() {
    const chromium = findPlaywrightChromium();
    if (chromium) return chromium;

    console.log(`⚠️  Playwright Chromium not found, installing...`);
    try {
        execSync('pnpm exec playwright install chromium', { stdio: 'inherit' });
    } catch {
        console.error(`❌ Failed to install Playwright Chromium. Run manually: pnpm exec playwright install chromium`);
        process.exit(1);
    }

    const retry = findPlaywrightChromium();
    if (retry) return retry;

    console.error(`❌ Chromium still not found after installation. Run manually: pnpm exec playwright install chromium`);
    process.exit(1);
}

function launchProfile(walletDir, walletId) {
    const chromium = ensurePlaywrightChromium();

    const extDir = path.join(walletDir, 'e2e', 'extensions', walletId);
    if (!fs.existsSync(extDir) || !fs.existsSync(path.join(extDir, 'manifest.json'))) {
        console.error(
            `❌ Extension directory does not exist or manifest.json is missing. Please prepare the extension first.`
        );
        process.exit(1);
    }

    const tmpProfile = path.join(os.tmpdir(), `wallet-profile-${walletId}`);

    console.log(`\n🚀 Launching Chromium to create Profile...`);
    console.log(`   Chromium: ${chromium}`);
    console.log(`   Extension: ${extDir}`);
    console.log(`   Temp Profile: ${tmpProfile}`);
    console.log(`\n   After completing the following in the browser, close the browser window:`);
    console.log(`   1. Click extension icon → Import existing wallet → Enter seed phrase`);
    console.log(`   2. Set unlock password (remember this password!)`);
    console.log(`   3. (Optional) Confirm you can switch to Sepolia testnet`);
    console.log(`   4. (Optional) Get Sepolia testnet funds`);
    console.log(`   5. Close browser\n`);

    const cmd = `"${chromium}" --user-data-dir="${tmpProfile}" --disable-extensions-except="${extDir}" --load-extension="${extDir}" --no-first-run about:blank`;

    try {
        execSync(cmd, { stdio: 'inherit' });
    } catch {
        // Chromium may return non-zero exit code when closed, this is normal
    }

    if (fs.existsSync(path.join(tmpProfile, 'Default'))) {
        console.log(`\n✅ Profile saved to: ${tmpProfile}`);
        console.log(`   Next step: pnpm e2e:setup --copy-profile`);
    } else {
        console.error(`\n❌ Profile creation failed, browser may not have closed properly`);
        console.error(`   Please re-run --launch-profile and ensure you close the browser after completing setup`);
    }
}

function copyProfile(walletDir, walletId) {
    const tmpProfile = path.join(os.tmpdir(), `wallet-profile-${walletId}`);

    if (!fs.existsSync(path.join(tmpProfile, 'Default'))) {
        console.error(`❌ Temp Profile does not exist: ${tmpProfile}`);
        console.error(`   Please run first: pnpm e2e:setup --launch-profile`);
        process.exit(1);
    }

    const destDir = path.join(walletDir, 'e2e', '.chromium-profile');

    if (fs.existsSync(destDir)) {
        console.log(`🗑️  Cleaning old Profile: ${destDir}`);
        fs.rmSync(destDir, { recursive: true, force: true });
    }

    fs.cpSync(tmpProfile, destDir, { recursive: true });

    console.log(`✅ Profile copied to: ${destDir}`);
    console.log(`   ⚠️  Temp Profile kept at: ${tmpProfile} (can be deleted manually)`);
}

// ── Generate .env ────────────────────────────────────────────────

function initEnv(walletDir, walletId) {
    const config = WALLET_CONFIGS[walletId];
    if (!config) {
        console.error(`❌ Unknown wallet: ${walletId}`);
        console.error(`   Supported wallets: ${Object.keys(WALLET_CONFIGS).join(', ')}`);
        process.exit(1);
    }

    const e2eDir = path.join(walletDir, 'e2e');
    const envExample = path.join(e2eDir, '.env.example');
    const envFile = path.join(e2eDir, '.env');

    if (fs.existsSync(envFile)) {
        console.log(`⚠️  .env already exists: ${envFile}`);
        console.log(`   To regenerate, please delete the old file first.`);
        return;
    }

    if (fs.existsSync(envExample)) {
        fs.copyFileSync(envExample, envFile);
        console.log(`✅ Created .env from .env.example: ${envFile}`);
        console.log(`\n   ⚠️  Please edit .env to fill in the wallet password:`);
        console.log(`   ${config.passwordEnvVar}=your_password\n`);
    } else {
        const content =
            [
                `${config.extensionEnvVar}=./e2e/extensions/${walletId}`,
                `CHROMIUM_USER_DATA_DIR=./e2e/.chromium-profile`,
                `${config.passwordEnvVar}=`,
                `TEST_CHAIN_ID=0xaa36a7`,
                `TEST_RECEIVER_ADDRESS=0x0000000000000000000000000000000000000000`,
                `TEST_VALUE_WEI=0x38D7EA4C68000`,
                `TEST_UNKNOWN_CHAIN_ID=0x13881`,
            ].join('\n') + '\n';
        fs.writeFileSync(envFile, content);
        console.log(`✅ Created .env: ${envFile}`);
        console.log(`\n   ⚠️  Please edit .env to fill in the wallet password:`);
        console.log(`   ${config.passwordEnvVar}=your_password\n`);
    }
}

// ── Verification ─────────────────────────────────────────────────

function verify(walletDir, walletId) {
    const config = WALLET_CONFIGS[walletId];
    let hasIssue = false;

    const extDir = path.join(walletDir, 'e2e', 'extensions', walletId);
    const manifest = path.join(extDir, 'manifest.json');
    if (fs.existsSync(manifest)) {
        console.log(`✅ Extension files: ${extDir}`);
    } else {
        console.error(`❌ Extension files missing: ${manifest}`);
        hasIssue = true;
    }

    const profileDir = path.join(walletDir, 'e2e', '.chromium-profile');
    const defaultDir = path.join(profileDir, 'Default');
    if (fs.existsSync(defaultDir)) {
        console.log(`✅ Chromium Profile: ${profileDir}`);
    } else {
        console.error(`❌ Chromium Profile missing: ${profileDir}`);
        hasIssue = true;
    }

    const envFile = path.join(walletDir, 'e2e', '.env');
    if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, 'utf-8');
        const passwordSet = envContent.split('\n').some((line) => {
            const eq = line.indexOf('=');
            if (eq === -1) return false;
            const key = line.slice(0, eq).trim();
            const val = line.slice(eq + 1).trim();
            return key === config.passwordEnvVar && val.length > 0;
        });
        if (passwordSet) {
            console.log(`✅ .env (${config.passwordEnvVar} is set)`);
        } else {
            console.error(`⚠️  .env exists but ${config.passwordEnvVar} is not set`);
            hasIssue = true;
        }
    } else {
        console.error(`❌ .env missing: ${envFile}`);
        hasIssue = true;
    }

    if (!hasIssue) {
        console.log(`\n🎉 All ready! Run tests with:`);
        console.log(`   cd ${walletDir} && pnpm e2e\n`);
    } else {
        console.error(`\n⚠️  Please resolve the issues above.`);
    }

    return !hasIssue;
}

// ── Main Logic ───────────────────────────────────────────────────

function printHelp() {
    console.log(`
Usage: node e2e-setup.mjs <walletId> [options]

Options:
  --extension-id <id>    Copy extension from Chrome install directory (searches all profiles)
  --crx <path>           Extract extension from CRX file
  --extension-dir <path> Copy extension from local directory (quote paths with spaces)
  --launch-profile       Launch Chromium to create Profile (manually initialize wallet then close browser)
  --copy-profile         Copy Profile from /tmp to project
  --init-env             Generate .env file
  --setup                All-in-one (extension + Profile + .env), requires --extension-id or --crx
  --verify               Verify environment is ready
  --help                 Show help

Supported wallets: ${Object.keys(WALLET_CONFIGS).join(', ')}

Examples:
  # Copy extension from Chrome (auto-searches Default, Profile 1, Profile 2, ...)
  node e2e-shared/e2e-setup.mjs okxwallet --extension-id mcohilncbfahbmgdjkbpemcciiolgcge

  # Copy extension from a custom directory (quote paths with spaces!)
  node e2e-shared/e2e-setup.mjs okxwallet --extension-dir "/path/to/Chrome/Profile 60/Extensions/extid/1.0.0_0"

  # Extract from CRX file
  node e2e-shared/e2e-setup.mjs okxwallet --crx ~/Downloads/okxwallet.crx

  # Launch Chromium to create Profile
  node e2e-shared/e2e-setup.mjs okxwallet --launch-profile

  # Copy Profile
  node e2e-shared/e2e-setup.mjs okxwallet --copy-profile

  # Generate .env
  node e2e-shared/e2e-setup.mjs okxwallet --init-env

  # All-in-one (requires --extension-id or --crx first)
  node e2e-shared/e2e-setup.mjs okxwallet --extension-id mcohilncbfahbmgdjkbpemcciiolgcge --setup

  # Verify environment
  node e2e-shared/e2e-setup.mjs okxwallet --verify
`);
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
}

const walletId = args[0];

if (!WALLET_CONFIGS[walletId]) {
    console.error(`❌ Unknown wallet: ${walletId}`);
    console.error(`   Supported wallets: ${Object.keys(WALLET_CONFIGS).join(', ')}`);
    process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = findMonorepoRoot(scriptDir) || process.cwd();
const walletDir = findWalletDir(walletId, rootDir);

console.log(`Wallet: ${WALLET_CONFIGS[walletId].name} (${walletId})`);
console.log(`Project directory: ${walletDir}\n`);

let extensionId = null;
let crxPath = null;
let extDir = null;
let doLaunchProfile = false;
let doCopyProfile = false;
let doInitEnv = false;
let doSetup = false;
let doVerify = false;

for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
        case '--extension-id':
            extensionId = args[++i];
            break;
        case '--crx':
            crxPath = args[++i];
            break;
        case '--extension-dir':
            extDir = args[++i];
            break;
        case '--launch-profile':
            doLaunchProfile = true;
            break;
        case '--copy-profile':
            doCopyProfile = true;
            break;
        case '--init-env':
            doInitEnv = true;
            break;
        case '--setup':
            doSetup = true;
            break;
        case '--verify':
            doVerify = true;
            break;
    }
}

// Handle extension
if (extensionId) {
    const srcDir = findExtensionDir(extensionId);
    copyExtension(srcDir, walletDir, walletId);
}

if (crxPath) {
    const absCrxPath = path.resolve(crxPath);
    extractCrx(absCrxPath, walletDir, walletId);
}

if (extDir) {
    const absExtDir = path.resolve(extDir);
    if (!fs.existsSync(path.join(absExtDir, 'manifest.json'))) {
        console.error(`❌ manifest.json not found: ${absExtDir}`);
        process.exit(1);
    }
    copyExtension(absExtDir, walletDir, walletId);
}

if (doLaunchProfile) {
    launchProfile(walletDir, walletId);
}

if (doCopyProfile) {
    copyProfile(walletDir, walletId);
}

if (doInitEnv) {
    initEnv(walletDir, walletId);
}

if (doSetup) {
    if (!extensionId && !crxPath && !extDir) {
        console.error(`❌ --setup requires --extension-id, --crx, or --extension-dir to specify extension source`);
        process.exit(1);
    }
    doCopyProfile = true;
    doInitEnv = true;
}

if (doCopyProfile && !doLaunchProfile) {
    copyProfile(walletDir, walletId);
}

if (doInitEnv) {
    initEnv(walletDir, walletId);
}

if (doVerify) {
    const ok = verify(walletDir, walletId);
    process.exit(ok ? 0 : 1);
}
