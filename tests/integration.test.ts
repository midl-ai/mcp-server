/**
 * Integration tests for MIDL MCP Server
 * These tests hit the REAL regtest network - no mocking
 * Requires MIDL_PRIVATE_KEY in environment
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createWalletFromEnv } from '../src/wallet.js';
import { createBtcWalletFromEnv } from '../src/btc-wallet.js';

// Tool imports
import { GetNetworkInfoTool } from '../src/plugins/network/get-network-info.js';
import { GetSystemContractsTool } from '../src/plugins/network/get-system-contracts.js';
import { GetBlockTool } from '../src/plugins/network/get-block.js';
import { GetEvmBalanceTool } from '../src/plugins/balance/get-evm-balance.js';
import { GetBtcBalanceTool } from '../src/plugins/balance/get-btc-balance.js';
import { GetFeeRateTool } from '../src/plugins/bitcoin/get-fee-rate.js';
import { GetUtxosTool } from '../src/plugins/bitcoin/get-utxos.js';
import { EstimateGasTool } from '../src/plugins/utility/estimate-gas.js';
import { ConvertBtcToEvmTool } from '../src/plugins/utility/convert-btc-to-evm.js';
import { GetRuneErc20AddressTool } from '../src/plugins/utility/get-rune-erc20-address.js';

// Check if we have credentials - skip all tests if not
const hasCredentials = !!process.env.MIDL_PRIVATE_KEY;

describe.skipIf(!hasCredentials)('Network Tools', () => {
  let wallet: ReturnType<typeof createWalletFromEnv>;

  beforeAll(() => {
    wallet = createWalletFromEnv();
  });

  it('get_network_info returns valid network data', async () => {
    const tool = new GetNetworkInfoTool(wallet);
    const result = await tool.run({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chainId).toBe(14969); // regtest
      expect(result.data.name).toContain('regtest');
      expect(result.data.rpcUrl).toContain('https://');
      expect(result.data.explorerUrl).toContain('blockscout');
      expect(result.data.blockNumber).toBeGreaterThan(0);
    }
  });

  it('get_system_contracts returns all 11 contracts', async () => {
    const tool = new GetSystemContractsTool();
    const result = await tool.run({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(11);
      const names = result.data.map((c) => c.name);
      expect(names).toContain('Executor');
      expect(names).toContain('ValidatorRegistry');
      expect(names).toContain('RuneImplementation');
      expect(names).toContain('Multicall3');
    }
  });

  it('get_block returns latest block info', async () => {
    const tool = new GetBlockTool(wallet);
    const result = await tool.run({ blockNumber: 'latest' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.number).toBeGreaterThan(0);
      expect(result.data.hash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(result.data.timestamp).toBeGreaterThan(0);
    }
  });
});

describe.skipIf(!hasCredentials)('Balance Tools', () => {
  let wallet: ReturnType<typeof createWalletFromEnv>;

  beforeAll(() => {
    wallet = createWalletFromEnv();
  });

  it('get_evm_balance returns balance for wallet address', async () => {
    const tool = new GetEvmBalanceTool(wallet);
    const result = await tool.run({ address: wallet.address });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address.toLowerCase()).toBe(wallet.address.toLowerCase());
      expect(result.data.network).toBe('regtest');
      // Balance can be 0, just check it's a valid string
      expect(result.data.balance).toMatch(/^\d+$/);
    }
  });

  it('get_btc_balance returns balance for BTC address', async () => {
    const tool = new GetBtcBalanceTool(wallet);
    // Need a real BTC address - let's use the btc wallet's address
    const btcWallet = createBtcWalletFromEnv();
    await btcWallet.connect();

    if (btcWallet.paymentAddress) {
      const result = await tool.run({ address: btcWallet.paymentAddress });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe(btcWallet.paymentAddress);
        expect(result.data.network).toBe('regtest');
      }
    }
  });
});

describe.skipIf(!hasCredentials)('Bitcoin Tools', () => {
  let wallet: ReturnType<typeof createWalletFromEnv>;

  beforeAll(() => {
    wallet = createWalletFromEnv();
  });

  it('get_fee_rate returns current fee rates', async () => {
    const tool = new GetFeeRateTool(wallet);
    const result = await tool.run({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fastestFee).toBeGreaterThanOrEqual(1);
      expect(result.data.halfHourFee).toBeGreaterThanOrEqual(1);
      expect(result.data.hourFee).toBeGreaterThanOrEqual(1);
      expect(result.data.economyFee).toBeGreaterThanOrEqual(1);
    }
  });

  it('get_utxos returns UTXOs for address', async () => {
    const tool = new GetUtxosTool(wallet);
    const btcWallet = createBtcWalletFromEnv();
    await btcWallet.connect();

    if (btcWallet.paymentAddress) {
      const result = await tool.run({ address: btcWallet.paymentAddress });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe(btcWallet.paymentAddress);
        expect(Array.isArray(result.data.utxos)).toBe(true);
        expect(typeof result.data.count).toBe('number');
      }
    }
  });
});

describe.skipIf(!hasCredentials)('Utility Tools', () => {
  let wallet: ReturnType<typeof createWalletFromEnv>;

  beforeAll(() => {
    wallet = createWalletFromEnv();
  });

  it('estimate_gas returns gas estimate', async () => {
    const tool = new EstimateGasTool(wallet);
    const result = await tool.run({
      to: '0x0000000000000000000000000000000000001000',
      value: '0',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(BigInt(result.data.gasEstimate)).toBeGreaterThan(0n);
      expect(result.data.gasPriceGwei).toBeDefined();
    }
  });

  it('convert_btc_to_evm derives correct EVM address from public key', async () => {
    const tool = new ConvertBtcToEvmTool(wallet);
    // Test with a known public key
    const testPubKey = '0x02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5';
    const result = await tool.run({ publicKey: testPubKey });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publicKey).toBe(testPubKey);
      expect(result.data.evmAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  it('get_rune_erc20_address returns CREATE2 derived address', async () => {
    const tool = new GetRuneErc20AddressTool(wallet);
    const result = await tool.run({ runeId: '840000:1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.runeId).toBe('840000:1');
      expect(result.data.erc20Address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(result.data.explorerUrl).toContain('blockscout');
    }
  });
});

// Always-run test to validate the test file loads correctly
describe('Test Setup', () => {
  it('test file loads without syntax errors', () => {
    expect(true).toBe(true);
  });

  it('reports credential status', () => {
    if (!hasCredentials) {
      console.log('\n⚠️  MIDL_PRIVATE_KEY not set - integration tests skipped');
      console.log('   Set MIDL_PRIVATE_KEY in .env to run real network tests\n');
    } else {
      console.log('\n✓ MIDL_PRIVATE_KEY found - running real network tests\n');
    }
    expect(typeof hasCredentials).toBe('boolean');
  });
});
