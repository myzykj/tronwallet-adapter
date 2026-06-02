/**
 * List the name and shasum of packages to be published.
 *
 * Usage:
 *   node scripts/list-pkg-shasum.js             # only packages whose version differs from the registry
 *   node scripts/list-pkg-shasum.js --all        # every non-private package regardless of version
 */

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALL_MODE = process.argv.includes('--all');

const DIRS = [
    path.resolve(__dirname, '../packages/adapters'),
    path.resolve(__dirname, '../packages/adapters/evm'),
    path.resolve(__dirname, '../packages/react'),
    path.resolve(__dirname, '../packages/vue'),
];

// ── Step 1: collect all non-private packages ──────────────────────────────────

const packages = [];

DIRS.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
        .filter((entry) => !entry.startsWith('.') && entry !== 'evm')
        .forEach((entry) => {
            const pkgPath = path.resolve(dir, entry, 'package.json');
            if (!fs.existsSync(pkgPath)) return;
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                if (pkg.private) return;
                packages.push({ name: pkg.name, version: pkg.version, dir: path.resolve(dir, entry) });
            } catch {
                // skip malformed package.json
            }
        });
});

// ── Step 2: filter to updated packages when not in --all mode ─────────────────

function getRegistryVersion(name) {
    try {
        return execFileSync('npm', ['view', name, 'version'], { stdio: 'pipe' }).toString().trim();
    } catch (e) {
        if (e.toString().includes('E404')) return null; // never published
        throw e;
    }
}

const selected = [];

packages.forEach(({ name, version, dir }) => {
    if (ALL_MODE) {
        selected.push({ name, version, dir });
        return;
    }
    process.stdout.write(`Checking ${name}… `);
    const registryVersion = getRegistryVersion(name);
    if (registryVersion === version) {
        console.log(`same (${version}), skipping`);
    } else {
        console.log(`${registryVersion ?? 'not published'} → ${version}, including`);
        selected.push({ name, version, dir });
    }
});

// ── Step 3: compute shasum for selected packages ──────────────────────────────
//
// Use `pnpm pack` (not `npm pack`) so that workspace:^ references are replaced
// with concrete version numbers — the same transformation pnpm applies on publish.
// npm pack is unaware of the pnpm workspace protocol and leaves workspace:^ as-is,
// which produces a different tarball (and therefore a different shasum) than what
// actually ends up on the registry.

function getShasum(dir) {
    let tarball = null;
    try {
        const output = execFileSync('pnpm', ['pack'], { cwd: dir, stdio: 'pipe' }).toString().trim();
        // pnpm pack prints the tarball filename as the last non-empty line
        const filename = output
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .pop();
        tarball = path.resolve(dir, filename);
        const shasum = crypto.createHash('sha1').update(fs.readFileSync(tarball)).digest('hex');
        return shasum;
    } catch {
        return '(error)';
    } finally {
        if (tarball && fs.existsSync(tarball)) fs.unlinkSync(tarball);
    }
}

console.log(`\n${ALL_MODE ? 'All' : 'Updated'} packages (${selected.length}):\n`);

const rows = [];
selected.forEach(({ name, version, dir }) => {
    process.stdout.write(`Packing ${name}… `);
    const shasum = getShasum(dir);
    console.log('done');
    rows.push({ name, version, shasum });
});

// ── Step 4: print result table ────────────────────────────────────────────────

if (rows.length === 0) {
    console.log('No packages to publish.');
    process.exit(0);
}

const colName = Math.max('Package'.length, ...rows.map((r) => r.name.length));
const colVer = Math.max('Version'.length, ...rows.map((r) => r.version.length));
const colHash = Math.max('Shasum'.length, ...rows.map((r) => r.shasum.length));
const sep = `+-${'-'.repeat(colName)}-+-${'-'.repeat(colVer)}-+-${'-'.repeat(colHash)}-+`;

console.log('\n' + sep);
console.log(`| ${'Package'.padEnd(colName)} | ${'Version'.padEnd(colVer)} | ${'Shasum'.padEnd(colHash)} |`);
console.log(sep);
rows.forEach(({ name, version, shasum }) => {
    console.log(`| ${name.padEnd(colName)} | ${version.padEnd(colVer)} | ${shasum.padEnd(colHash)} |`);
});
console.log(sep);
