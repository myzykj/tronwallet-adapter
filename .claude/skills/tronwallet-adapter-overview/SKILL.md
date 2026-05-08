---
name: tronwallet-adapter-overview
description: Provides context about the tronwallet-adapter monorepo — architecture, package layout, tooling, commands, and conventions. Use whenever the user asks about this repo's structure, how to build/test/release, where a wallet adapter lives, or how the React/Vue hooks and UI packages fit together.
---

# tronwallet-adapter Project Overview

`tronwallet-adapter` is a collection of wallet adapters for the TRON ecosystem. It unifies the integration surface for multiple TRON-native wallets and EVM-compatible wallets, and ships React / Vue hooks and UI components on top.

## Tech Stack & Tooling

- **Package manager**: pnpm workspace (`pnpm-workspace.yaml`)
- **Versioning & release**: [changesets](https://github.com/changesets/changesets) (`pnpm update-version` / `pnpm release`)
- **Language**: TypeScript (`tsconfig.all.json` uses project references for incremental builds)
- **Build**: `tsc` + Rollup (`build:umd`)
- **Lint / formatting**: ESLint 9 + Prettier + husky + lint-staged + commitlint (Conventional Commits)
- **Runtime requirements**: Node.js `20.18.0`, pnpm `9.6.0` (see `engines` in the root `package.json`)

## Directory Layout

```
tronwallet-adapter
├── packages/
│   ├── adapters/
│   │   ├── abstract-adapter     # Adapter base class & shared types
│   │   ├── adapters             # Barrel package: @tronweb3/tronwallet-adapters
│   │   ├── tronlink / ledger / walletconnect / tokenpocket / bitkeep / ...
│   │   └── evm/                 # EVM-compatible wallets (binance / metamask / tronlink / trust / abstract-adapter)
│   ├── react/
│   │   ├── react-hooks          # React state-management hooks
│   │   └── react-ui             # Ready-to-use React components
│   └── vue/
│       ├── vue-hooks            # Vue state management
│       └── vue-ui               # Vue components
├── demos/                       # Next.js / Vite / CDN example apps
├── scripts/                     # Pre-release checks (e.g. check-dep-version.js)
└── tsconfig.*.json              # Layered ts configs (esm / cjs / tests / root)
```

Workspace glob patterns: `packages/*/*`, `packages/adapters/evm/*`, `demos/*/*`, `demos/dev-demo`, `demos/cdn-demo`.

## NPM Package Naming

All packages use the `@tronweb3/` scope, for example:

- `@tronweb3/tronwallet-abstract-adapter`
- `@tronweb3/tronwallet-adapter-tronlink`
- `@tronweb3/tronwallet-adapter-<wallet>` / `@tronweb3/tronwallet-adapter-<wallet>-evm`
- `@tronweb3/tronwallet-adapters` (aggregated package)
- `@tronweb3/tronwallet-adapter-react-hooks` / `-react-ui`
- `@tronweb3/tronwallet-adapter-vue-hooks` / `-vue-ui`

## Common Scripts (root)

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm build` | Full build (ts → other → package → umd) |
| `pnpm build:ts` | TypeScript-only build |
| `pnpm watch` | Watch mode for development |
| `pnpm dev` | watch + start `demos/dev-demo` |
| `pnpm example` | Start the `demos/react-ui/vite-app` example |
| `pnpm test` | Run unit tests recursively across all `@tronweb3/*` packages |
| `pnpm lint` / `pnpm lint:fix` | ESLint check / auto-fix + prettier |
| `pnpm fmt` | Prettier formatting only |
| `pnpm update-version` | Add a changeset and bump versions |
| `pnpm release` | Pre-release checks + `changeset publish` |
| `pnpm clean` / `pnpm nuke` / `pnpm reinstall` | Clean artifacts / full reinstall |

For a single package use `pnpm --filter <package-name> <script>`, or `pnpm --filter {packages/xxx} <script>`.

## Adapter Implementation Conventions

- Every wallet adapter extends `@tronweb3/tronwallet-abstract-adapter` and implements the unified `connect / disconnect / signMessage / signTransaction` interface.
- EVM-style wallets live under [packages/adapters/evm/](../../../packages/adapters/evm/) and share `evm/abstract-adapter`.
- When adding a new wallet: create a package under `packages/adapters/` mirroring existing ones, export the Adapter class, and re-export from the aggregated package [packages/adapters/adapters/](../../../packages/adapters/adapters/).
- Wallets are expected to implement TIP-1193 (TRON provider standard).
- A `SecurityAdapter` was recently introduced (see commit `7a506e6`) to extend security-check capabilities.

## Commit & Release Flow

1. Conventional Commits are enforced by commitlint. Common prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
2. After changes, run `pnpm update-version` to create/consume a changeset and bump package versions.
3. `pnpm release` runs `scripts/check-dep-version.js` first to verify internal dependency versions are consistent.
4. The husky pre-commit hook runs lint-staged (prettier check + eslint).

## Tips When Working in This Repo

- After editing an adapter, run that package's tests first: `pnpm --filter @tronweb3/tronwallet-adapter-<name> test`.
- When changing a shared interface, remember to update both `abstract-adapter` and the aggregated `adapters/adapters` package.
- Before adding a new shared dependency, check `pnpm.overrides` in the root `package.json` — many versions are pinned to mitigate security advisories; do not upgrade them casually.
- Docs & API reference: https://walletadapter.org/docs/
