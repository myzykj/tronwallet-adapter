# TronWallet Adapter Portfolio

`tronwallet-adapter` is a powerful Monorepo providing a high-quality suite of wallet adapters and UI components for the TRON ecosystem. It enables developers to integrate multiple wallets (both TRON native and EVM compatible) with a unified, modern API.

---

## 🧭 Which Package Should I Use?

Decide based on your framework and the level of UI control you need:

| Framework      | Quickest Integration (UI + Logic)       | Custom UI (Hooks / Logic Only)             | Core Only (Vanilla JS)          |
| :------------- | :-------------------------------------- | :----------------------------------------- | :------------------------------ |
| **React**      | `@tronweb3/tronwallet-adapter-react-ui` | `@tronweb3/tronwallet-adapter-react-hooks` | —                               |
| **Vue**        | `@tronweb3/tronwallet-adapter-vue-ui`   | `@tronweb3/tronwallet-adapter-vue-hooks`   | —                               |
| **Vanilla JS** | —                                       | —                                          | `@tronweb3/tronwallet-adapters` |

---

## ✨ Key Features

-   **Unified API**: Maintain a single codebase to support 15+ different wallets.
-   **Out-of-the-Box Components**: Ready-to-use modals and buttons for React and Vue.
-   **Developer Friendly**: Fully typed with TypeScript, including detailed error handling and state management.

---

## 📚 Documentation & Resources

-   **Quick Start Guide** Start with our [Official Documentation](https://walletadapter.org/docs/).
-   **Framework Guides**: [React Integration](https://walletadapter.org/docs/guide/react.html) | [Vue Integration](https://walletadapter.org/docs/guide/vue.html)
-   **Core API**: [API Reference](https://walletadapter.org/docs/api-reference/adapter.html)
-   **For EVM**: [EVM Adapter Integration](https://walletadapter.org/docs/guide/evm.html)

---

## 🔌 Supported Wallets

Each adapter offers a consistent interface. You can use this collective package or import individual ones.

| Wallet               | NPM Package                                                                                                          | Description                                                                  | Source                                                                                           |
| :------------------- | :------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **All-in-One**       | [`@tronweb3/tronwallet-adapters`](https://npmjs.com/package/@tronweb3/tronwallet-adapters)                           | Includes all adapters below                                                  | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/adapters)      |
| **TronLink**         | [`@tronweb3/tronwallet-adapter-tronlink`](https://npmjs.com/package/@tronweb3/tronwallet-adapter-tronlink)           | Adapter for [TronLink](https://www.tronlink.org/)                            | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/tronlink)      |
| **WalletConnect**    | [`@tronweb3/tronwallet-adapter-walletconnect`](https://npmjs.com/package/@tronweb3/tronwallet-adapter-walletconnect) | Adapter for [WalletConnect](https://walletconnect.com/)                      | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/walletconnect) |
| **Ledger**           | [`@tronweb3/tronwallet-adapter-ledger`](https://npmjs.com/package/@tronweb3/tronwallet-adapter-ledger)               | Hardware wallet support                                                      | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/ledger)        |
| **TokenPocket**      | [`@tronweb3/tronwallet-adapter-tokenpocket`](https://npmjs.com/package/@tronweb3/tronwallet-adapter-tokenpocket)     | Adapter for [TokenPocket](https://tokenpocket.pro/)                          | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/tokenpocket)   |
| **BitGet**           | [`@tronweb3/tronwallet-adapter-bitkeep`](https://npmjs.com/package/@tronweb3/tronwallet-adapter-bitkeep)             | Adapter for [BitGet (BitKeep)](https://bitget.com/)                          | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/bitkeep)       |
| **Binance EVM**      | [`@tronweb3/tronwallet-adapter-binance-evm`](https://npmjs.com/package/@tronweb3/tronwallet-adapter-binance-evm)     | Adapter for [Binance Wallet](https://www.binance.com/en/binancewallet) (EVM) | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/evm/binance)   |
| **MetaMask EVM**     | [`@tronweb3/tronwallet-adapter-metamask-evm`](https://npmjs.com/package/@tronweb3/tronwallet-adapter-metamask-evm)   | Native EVM support                                                           | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/evm/metamask)  |
| **TronLink EVM**     | [`@tronweb3/tronwallet-adapter-tronlink-evm`](https://npmjs.com/package/@tronweb3/tronwallet-adapter-tronlink-evm)   | Adapter for [TronLink](https://www.tronlink.org/) (EVM)                      | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/evm/tronlink)  |
| **Trust Wallet EVM** | [`@tronweb3/tronwallet-adapter-trust-evm`](https://npmjs.com/package/@tronweb3/tronwallet-adapter-trust-evm)         | Adapter for [Trust Wallet](https://trustwallet.com/) (EVM)                   | [View](https://github.com/tronweb3/tronwallet-adapter/tree/main/packages/adapters/evm/trust)     |

> ℹ️ For the full list of 15+ supported wallets, visit our [documentation](https://walletadapter.org/docs/guide/wallet-reference.html#supported-wallets-by-adapter).

> **Note**: In case wallet developers intend to release breaking changes, you can [open an issue here](https://github.com/tronweb3/tronwallet-adapter/issues/new) to inform us, thus enabling us to update the new protocols accordingly.

### Add support for new wallet

Follow these steps to support new wallets:

1. List your wallet to [Tron Wallet](https://tron.network/wallet) .
2. Open an issue in this repository or fork the repository and implement the according adapter.

### Wallet Integration Standards

Wallets are encouraged to implement the following TRON interface standards to ensure compatibility with the TronWallet Adapter and the broader TRON dApp ecosystem:

-   [TIP-1193](https://github.com/tronprotocol/tips/blob/master/tip-1193.md) – Defines a standard TRON provider interface for dApps to communicate with wallets.

By following these standards, wallets can be seamlessly integrated into modern TRON dApps using unified APIs and adapters.

---

## 🛠 Project Structure

This repository is managed using **pnpm** workspaces:

```text
tronwallet-adapter
├── packages
│   ├── adapters
│   │   ├── abstract-adapter  # Core interface definitions
│   │   ├── adapters          # Barrel package for all adapters
│   │   └── [specific-wallet] # Individual wallet implementations
│   ├── react
│   │   ├── react-hooks       # State management for React
│   │   └── react-ui          # Pre-built React components
│   └── vue
│       ├── vue-hooks         # State management for Vue
│       └── vue-ui            # Pre-built Vue components
├── demos                     # Example applications (Next.js, Vite, CDN)
└── docs                      # Detailed manual and API docs
```

---

## 🚀 Development & Contributing

We welcome contributions! To get started with the codebase:

### Prerequisites

-   **Node.js**: 20.18.0
-   **pnpm**: 9.6.0

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/tronweb3/tronwallet-adapter.git

# 2. Install dependencies (also fetches the e2e project into e2e/)
pnpm install

# 3. Build all packages
pnpm build

# 4. Start the development demo
pnpm example  # Runs our pre-built React/Vite example
```

### Commands

-   `pnpm watch`: Rebuild packages automatically on change.
-   `pnpm lint`: Run ESLint across all workspaces.
-   `pnpm test`: Run unit tests.
-   `pnpm update-version`: Update package versions for release.

---

## 🧪 End-to-End Testing

End-to-end tests live in a companion repository that is automatically cloned into the `e2e/` directory the first time you run `pnpm install` (via the `postinstall` hook in `scripts/sync-e2e.js`). You do not need to clone it manually.

```
tronwallet-adapter/
└── e2e/          ← automatically fetched e2e repository
    └── tron/
        ├── e2e-shared/   # shared Playwright fixtures, specs, and page harness
        ├── tronlink/     # TronLink-specific tests
        └── <walletId>/   # other wallet test packages
```

### Quick Start

All setup commands run from the `e2e/` directory. Extension IDs are looked up automatically — you do not need to copy-paste them.

```bash
# 1. Enter the e2e root
cd e2e

# 2. One-time: create the shared tron/.env (skip if it already exists)
pnpm e2e:init --init-env

# 3. One-time: full interactive setup for a wallet (extension copy → profile init → profile save)
#    This opens a Chromium window — import your test seed phrase, set a password, then close it.
pnpm e2e:init tronlink

# 4. Edit e2e/tron/.env and set WALLET_PASSWORD to the password from step 3
#    Then verify the environment is ready
pnpm e2e:init tronlink --verify
```

Because `e2e/` is a **pnpm workspace**, you can run tests for any wallet directly from the `e2e/` root — no need to `cd` into each wallet's directory:

```bash
# Run tests for a single wallet (from e2e/ root)
pnpm --filter ./tron/tronlink e2e

# Filter by test name
pnpm --filter ./tron/tronlink e2e -- --grep "E2E-SEC"

# Run tests for all wallets in parallel
pnpm -r e2e
```

Or `cd` into the wallet directory and use the short form:

```bash
cd tron/tronlink
pnpm e2e
pnpm e2e -- --grep "connect"
```

If you prefer to do setup step by step instead of the all-in-one command in step 3:

```bash
# From e2e/ root
pnpm e2e:init tronlink --launch-profile   # open Chromium, configure wallet, close browser
pnpm e2e:init tronlink --copy-profile     # save the profile you just created
```

### Testing Against a Local Adapter Build

Set `WALLET_ADAPTERS_PATH` in `e2e/tron/.env` to point to your local checkout so Vite serves your in-progress changes instead of the published npm package:

```env
# e2e/tron/.env
WALLET_ADAPTERS_PATH=../../   # relative to e2e/tron/
WALLET_PASSWORD=your_test_wallet_password
```

Then rebuild the adapter and re-run tests:

```bash
# In tronwallet-adapter root
pnpm build

# In e2e/tron/tronlink (or any wallet)
pnpm e2e
```

### Security Feature Tests

The security policy tests (`E2E-SEC-*`) do not require a remote config server — Playwright intercepts the fetch at the browser level using `page.route()`. They do require the wallet extension to be installed and unlocked (same as all `with-extension` tests).

For the full e2e setup guide, environment variable reference, troubleshooting tips, and instructions for adding new wallets, see **[e2e/README.md](./e2e/README.md)**.

---

## 📄 License

[MIT](./LICENSE)
