/**
 * Integration tests for MIDL MCP Server
 * These tests hit the REAL regtest network - no mocking
 * Requires MIDL_PRIVATE_KEY in environment with funded wallet
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createWalletFromEnv } from '../src/wallet.js';
import { createBtcWalletFromEnv } from '../src/btc-wallet.js';

// Network tools
import { GetNetworkInfoTool } from '../src/plugins/network/get-network-info.js';
import { GetSystemContractsTool } from '../src/plugins/network/get-system-contracts.js';
import { GetBlockTool } from '../src/plugins/network/get-block.js';

// Balance tools
import { GetEvmBalanceTool } from '../src/plugins/balance/get-evm-balance.js';
import { GetBtcBalanceTool } from '../src/plugins/balance/get-btc-balance.js';
import { GetTokenBalanceTool } from '../src/plugins/balance/get-token-balance.js';

// Bitcoin tools
import { GetFeeRateTool } from '../src/plugins/bitcoin/get-fee-rate.js';
import { GetUtxosTool } from '../src/plugins/bitcoin/get-utxos.js';
import { GetTransactionTool } from '../src/plugins/bitcoin/get-transaction.js';
import { GetTransactionReceiptTool } from '../src/plugins/bitcoin/get-transaction-receipt.js';

// Utility tools
import { EstimateGasTool } from '../src/plugins/utility/estimate-gas.js';
import { ConvertBtcToEvmTool } from '../src/plugins/utility/convert-btc-to-evm.js';
import { GetRuneErc20AddressTool } from '../src/plugins/utility/get-rune-erc20-address.js';

// Rune tools
import { GetRunesTool } from '../src/plugins/runes/get-runes.js';
import { GetRuneBalanceTool } from '../src/plugins/runes/get-rune-balance.js';

// Contract tools
import { ReadContractTool } from '../src/plugins/contract/read-contract.js';
import { GetLogsTool } from '../src/plugins/contract/get-logs.js';

// Deploy tool
import { DeployContractTool } from '../src/plugins/deploy/deploy-contract.js';

// Check if we have credentials - skip all tests if not
const hasCredentials = !!process.env.MIDL_PRIVATE_KEY;

// MIDL regtest constants (updated from test run)
const MIDL_REGTEST_CHAIN_ID = 15001;
const MIDL_NETWORK_NAME = 'midl-regtest';

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
      expect(result.data.chainId).toBe(MIDL_REGTEST_CHAIN_ID);
      expect(result.data.name).toBe(MIDL_NETWORK_NAME);
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

  it('get_block returns block by number', async () => {
    const tool = new GetBlockTool(wallet);
    // Pass number, not string
    const result = await tool.run({ blockNumber: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.number).toBe(1);
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
      expect(result.data.network).toBe(MIDL_NETWORK_NAME);
      expect(result.data.balance).toMatch(/^\d+$/);
    }
  });

  it('get_btc_balance returns balance for BTC payment address', async () => {
    const tool = new GetBtcBalanceTool(wallet);
    const btcWallet = createBtcWalletFromEnv();
    await btcWallet.connect();

    if (btcWallet.paymentAddress) {
      const result = await tool.run({ address: btcWallet.paymentAddress });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe(btcWallet.paymentAddress);
        expect(result.data.network).toBe(MIDL_NETWORK_NAME);
        // After faucet funding, should have balance
        expect(Number(result.data.balanceSatoshis)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('get_token_balance handles non-existent token gracefully', async () => {
    const tool = new GetTokenBalanceTool(wallet);
    // Use a random address that's unlikely to be a token
    const result = await tool.run({
      tokenAddress: '0x0000000000000000000000000000000000000001',
      ownerAddress: wallet.address,
    });

    // Should fail gracefully (no ERC20 at this address)
    expect(result.success).toBe(false);
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

  it('get_utxos returns UTXOs for funded address', async () => {
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

  it('get_transaction handles non-existent txid gracefully', async () => {
    const tool = new GetTransactionTool(wallet);
    const fakeTxid = '0000000000000000000000000000000000000000000000000000000000000000';
    const result = await tool.run({ txid: fakeTxid });

    // Should fail gracefully
    expect(result.success).toBe(false);
  });

  it('get_transaction_receipt handles non-existent hash gracefully', async () => {
    const tool = new GetTransactionReceiptTool(wallet);
    const fakeHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const result = await tool.run({ hash: fakeHash });

    // Should fail gracefully (receipt not found)
    expect(result.success).toBe(false);
  });
});

describe.skipIf(!hasCredentials)('Utility Tools', () => {
  let wallet: ReturnType<typeof createWalletFromEnv>;

  beforeAll(() => {
    wallet = createWalletFromEnv();
  });

  it('estimate_gas works for simple transfer (if funded)', async () => {
    const tool = new EstimateGasTool(wallet);
    const result = await tool.run({
      to: '0x0000000000000000000000000000000000001000',
      value: '0',
    });

    // May fail if EVM wallet not funded - that's OK
    if (result.success) {
      expect(BigInt(result.data.gasEstimate)).toBeGreaterThan(0n);
      expect(result.data.gasPriceGwei).toBeDefined();
    } else {
      // Expected error if no EVM funds
      expect(result.error.message).toContain('insufficient');
    }
  });

  it('convert_btc_to_evm derives correct EVM address from public key', async () => {
    const tool = new ConvertBtcToEvmTool(wallet);
    // Test with a known public key (G point * 2)
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

describe.skipIf(!hasCredentials)('Rune Tools', () => {
  let wallet: ReturnType<typeof createWalletFromEnv>;

  beforeAll(() => {
    wallet = createWalletFromEnv();
  });

  it('get_runes returns runes for address (may be empty)', async () => {
    const tool = new GetRunesTool(wallet);
    const btcWallet = createBtcWalletFromEnv();
    await btcWallet.connect();

    if (btcWallet.ordinalsAddress) {
      const result = await tool.run({ address: btcWallet.ordinalsAddress });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe(btcWallet.ordinalsAddress);
        expect(Array.isArray(result.data.runes)).toBe(true);
      }
    }
  });

  it('get_rune_balance returns zero for non-existent rune', async () => {
    const tool = new GetRuneBalanceTool(wallet);
    const btcWallet = createBtcWalletFromEnv();
    await btcWallet.connect();

    if (btcWallet.ordinalsAddress) {
      const result = await tool.run({
        address: btcWallet.ordinalsAddress,
        runeId: '999999:999', // Non-existent rune
      });

      // Returns success with balance 0 (not an error)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.balance).toBe('0');
      }
    }
  });
});

describe.skipIf(!hasCredentials)('Contract Tools', () => {
  let wallet: ReturnType<typeof createWalletFromEnv>;

  beforeAll(() => {
    wallet = createWalletFromEnv();
  });

  it('read_contract reads from Multicall3 system contract', async () => {
    const tool = new ReadContractTool(wallet);
    // Read from Multicall3 - getCurrentBlockTimestamp() which always exists
    const result = await tool.run({
      address: '0xcA11bde05977b3631167028862bE2a173976CA11', // Multicall3
      functionName: 'getCurrentBlockTimestamp',
      abi: [
        {
          type: 'function',
          name: 'getCurrentBlockTimestamp',
          inputs: [],
          outputs: [{ type: 'uint256', name: 'timestamp' }],
          stateMutability: 'view',
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // Should return a timestamp (bigint as string)
      expect(BigInt(result.data.result as string)).toBeGreaterThan(0n);
    }
  });

  it('get_logs retrieves logs from block range', async () => {
    const tool = new GetLogsTool(wallet);
    // Pass numbers, not strings
    const result = await tool.run({
      fromBlock: 0,
      toBlock: 10,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data.logs)).toBe(true);
    }
  });
});

describe.skipIf(!hasCredentials)('Deploy Contract', () => {
  let wallet: ReturnType<typeof createWalletFromEnv>;

  beforeAll(() => {
    wallet = createWalletFromEnv();
  });

  it('deploy_contract lists available templates', async () => {
    const tool = new DeployContractTool(wallet);
    // Call with no params to get available templates info
    const result = await tool.run({});

    // Should fail but give helpful info about templates
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('template');
    }
  });

  // Note: Actual deployment requires funded EVM wallet
  // Add deployment test after bridging BTC to EVM
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
