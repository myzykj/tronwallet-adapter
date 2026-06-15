# Ledger EVM Adapter

Wallet adapter for Ledger Hardware Wallet on EVM-Compatible Chains.

## Features

- ✅ WebHID direct connection to Ledger hardware wallet
- ✅ Account selection with interactive UI modal
- ✅ Message signing (`signMessage`)
- ✅ EIP-712 typed data signing (`signTypedData`)
- ✅ Transaction signing (`signTransaction`)
- ✅ Support for Legacy and EIP-1559 transactions
- ✅ 43 unit tests, all passing

## Installation

```bash
npm install @tronweb3/tronwallet-adapter-ledger-evm
# or
pnpm add @tronweb3/tronwallet-adapter-ledger-evm
```

## Quick Start

```typescript
import { LedgerEvmAdapter } from '@tronweb3/tronwallet-adapter-ledger-evm';
import { ethers } from 'ethers';

// 1. Create adapter
const adapter = new LedgerEvmAdapter();

// 2. Connect (shows account selection modal)
await adapter.connect();
console.log('Connected:', adapter.address);

// 3. Sign a message
const signature = await adapter.signMessage({
    message: 'Hello from Ledger!'
});

// 4. Sign and send a transaction
const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');

// Prepare transaction
const tx = {
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    value: ethers.parseEther('0.001').toString(),
    nonce: await provider.getTransactionCount(adapter.address!, 'pending'),
    gasLimit: '21000',
    gasPrice: (await provider.getFeeData()).gasPrice!.toString(),
    chainId: 1
};

// Sign with Ledger
const signedTx = await adapter.signTransaction(tx);

// Broadcast with your provider
const txResponse = await provider.broadcastTransaction(signedTx);
console.log('Transaction sent:', txResponse.hash);
```

## Important: Transaction Broadcasting

**The Ledger adapter only signs transactions. It does NOT broadcast them.**

This follows the same design as the TRON Ledger Adapter:
- ✅ Adapter handles: Hardware communication + Signing
- ✅ Your dApp handles: Network access + Broadcasting

### Why?

1. Hardware wallets are for **signing**, not network operations
2. Your dApp already has a provider with RPC access
3. Keeps the adapter simple and focused
4. No RPC configuration needed

### How to broadcast?

Use your dApp's existing provider:

```typescript
// With ethers.js
const txResponse = await provider.broadcastTransaction(signedTx);

// With web3.js
const receipt = await web3.eth.sendSignedTransaction(signedTx);

// With viem
const hash = await client.sendRawTransaction({ 
    serializedTransaction: signedTx 
});

// With raw RPC
const response = await fetch(rpcUrl, {
    method: 'POST',
    body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [signedTx]
    })
});
```

## API Reference

### `signTransaction()`

Signs a transaction and returns the signed raw transaction.

```typescript
async signTransaction(transaction: {
    to: string;
    value?: string;
    data?: string;
    nonce: number;                    // Required
    gasLimit: string;                 // Required
    gasPrice?: string;                // For legacy transactions
    maxFeePerGas?: string;           // For EIP-1559
    maxPriorityFeePerGas?: string;   // For EIP-1559
    chainId: number;                  // Required
}): Promise<string>
```

**Returns:** Signed raw transaction (`0x...` format)

### `signMessage()`

Signs a personal message.

```typescript
async signMessage(params: {
    message: string;
    address?: string;
}): Promise<string>
```

### `signTypedData()`

Signs EIP-712 typed data.

```typescript
async signTypedData(params: {
    typedData: TypedData;
    address?: string;
}): Promise<string>
```

### `connect()`

Connects to Ledger device and shows account selection.

```typescript
async connect(): Promise<string>
```

### `disconnect()`

Disconnects from Ledger device.

```typescript
async disconnect(): Promise<void>
```

## Transaction Examples

### Legacy Transaction

```typescript
const tx = {
    to: '0x...',
    value: '1000000000000000', // 0.001 ETH in wei
    nonce: 0,
    gasLimit: '21000',
    gasPrice: '20000000000', // 20 Gwei
    chainId: 1
};

const signedTx = await adapter.signTransaction(tx);
```

### EIP-1559 Transaction

```typescript
const tx = {
    to: '0x...',
    value: '1000000000000000',
    nonce: 0,
    gasLimit: '21000',
    maxFeePerGas: '30000000000',       // 30 Gwei
    maxPriorityFeePerGas: '2000000000', // 2 Gwei
    chainId: 1
};

const signedTx = await adapter.signTransaction(tx);
```

### Smart Contract Call

```typescript
// Encode function call
const contract = new ethers.Contract(address, abi, provider);
const data = contract.interface.encodeFunctionData('transfer', [
    recipientAddress,
    amount
]);

const tx = {
    to: contractAddress,
    value: '0',
    data,
    nonce: await provider.getTransactionCount(adapter.address!),
    gasLimit: await provider.estimateGas({ from: adapter.address, to: contractAddress, data }),
    gasPrice: (await provider.getFeeData()).gasPrice!.toString(),
    chainId: 1
};

const signedTx = await adapter.signTransaction(tx);
await provider.broadcastTransaction(signedTx);
```

## Browser Support

WebHID is required for direct Ledger connection:

- ✅ Chrome/Edge/Brave (Desktop)
- ❌ Firefox (No WebHID support)
- ❌ Mobile browsers (No WebHID support)

For mobile users, recommend using Ledger Live + WalletConnect.

## Testing

```bash
cd packages/adapters/evm/ledger
pnpm test
```

All 43 tests should pass.

## Documentation

- **[USAGE.md](./USAGE.md)** - Comprehensive usage guide with examples
- **[tests/README.md](./tests/README.md)** - Testing documentation
- **[../../IMPLEMENTATION_SUMMARY.md](../../IMPLEMENTATION_SUMMARY.md)** - Implementation details

## Comparison with TRON Ledger

| Feature | TRON Ledger | EVM Ledger |
|---------|-------------|------------|
| Connection | WebHID | WebHID |
| Sign Message | ✅ | ✅ |
| Sign Transaction | ✅ | ✅ |
| Send Transaction | ❌ | ❌ |
| Returns | SignedTransaction | Signed raw tx |
| Broadcasting | dApp's responsibility | dApp's responsibility |

Same design philosophy, same workflow!

## License

MIT

## Related Packages

- [@tronweb3/tronwallet-adapter-ledger](https://www.npmjs.com/package/@tronweb3/tronwallet-adapter-ledger) - TRON Ledger Adapter
- [@tronweb3/abstract-adapter-evm](https://www.npmjs.com/package/@tronweb3/abstract-adapter-evm) - EVM Adapter Base
- [@ledgerhq/hw-app-eth](https://www.npmjs.com/package/@ledgerhq/hw-app-eth) - Ledger Ethereum App
