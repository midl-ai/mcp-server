/**
 * MIDL Bitcoin Wallet Client - handles Bitcoin-layer operations
 * Server-side signing via MIDL_PRIVATE_KEY using keyPairConnector
 */

import {
  createConfig,
  regtest,
  mainnet,
  AddressPurpose,
  type Config,
  connect,
  edictRune,
  broadcastTransaction,
  type EdictRuneParams,
  type EdictRuneResponse,
} from '@midl/core';
import {
  addTxIntention,
  finalizeBTCTransaction,
  signIntentions,
  midlRegtest,
  midl as midlMainnet,
} from '@midl/executor';
import { keyPairConnector } from '@midl/node';
import { createPublicClient, http } from 'viem';
import { createLogger } from './logger.js';
import { getNetworkConfig } from './config.js';

const log = createLogger('btc-wallet');

export class MidlBtcWalletClient {
  private readonly config: Config;
  private readonly privateKey: string;
  private readonly networkName: 'mainnet' | 'regtest';
  private connected = false;
  public ordinalsAddress: string | null = null;
  public paymentAddress: string | null = null;

  constructor(privateKey: string, network: 'mainnet' | 'regtest' = 'regtest') {
    this.privateKey = privateKey;
    this.networkName = network;

    // Create MIDL config with keyPairConnector for server-side signing
    this.config = createConfig({
      networks: [network === 'mainnet' ? mainnet : regtest],
      connectors: [
        keyPairConnector({
          privateKeys: [privateKey],
        }),
      ],
      persist: false,
    });
  }

  /** Connect the wallet and get accounts */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const accounts = await connect(
        this.config,
        { purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment] },
        'keyPair'
      );

      const ordinalsAccount = accounts.find((a) => a.purpose === AddressPurpose.Ordinals);
      const paymentAccount = accounts.find((a) => a.purpose === AddressPurpose.Payment);

      this.ordinalsAddress = ordinalsAccount?.address ?? null;
      this.paymentAddress = paymentAccount?.address ?? null;
      this.connected = true;

      log.info(`BTC wallet connected: ordinals=${this.ordinalsAddress}, payment=${this.paymentAddress}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to connect BTC wallet: ${message}`);
      throw new Error(`Failed to connect BTC wallet: ${message}`, { cause: err });
    }
  }

  /** Ensure wallet is connected */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  /** Get EVM public client */
  private getEvmClient(): ReturnType<typeof createPublicClient> {
    const networkConfig = getNetworkConfig();
    const chain = this.networkName === 'mainnet' ? midlMainnet : midlRegtest;
    return createPublicClient({
      chain,
      transport: http(networkConfig.rpcUrl),
    });
  }

  /** Transfer runes using edictRune */
  async transferRune(params: EdictRuneParams): Promise<EdictRuneResponse> {
    await this.ensureConnected();

    log.info(`Transferring runes: ${JSON.stringify(params.transfers)}`);

    const result = await edictRune(this.config, {
      ...params,
      publish: params.publish ?? true,
    });

    log.info(`Rune transfer complete: txId=${result.tx.id}`);
    return result;
  }

  /** Bridge BTC to EVM layer (deposit) */
  async bridgeBtcToEvm(satoshis: number): Promise<{ btcTxId: string; btcTxHex: string }> {
    await this.ensureConnected();

    log.info(`Bridging ${satoshis} satoshis to EVM`);

    const evmClient = this.getEvmClient();

    // Create deposit intention
    const intention = await addTxIntention(this.config, {
      deposit: {
        satoshis,
      },
      evmTransaction: {
        value: 0n,
        gas: 21000n,
      },
    });

    // Finalize BTC transaction (calculates fees, creates PSBT)
    const btcTx = await finalizeBTCTransaction(this.config, [intention], evmClient);

    // Sign the intentions
    await signIntentions(this.config, evmClient, [intention], {
      txId: btcTx.tx.id,
    });

    // Broadcast the BTC transaction
    const txId = await broadcastTransaction(this.config, btcTx.tx.hex);

    log.info(`BTC deposit broadcast: txId=${txId}`);

    return {
      btcTxId: txId,
      btcTxHex: btcTx.tx.hex,
    };
  }

  /** Bridge Rune to ERC20 (deposit rune to EVM) */
  async bridgeRuneToErc20(
    runeId: string,
    amount: bigint
  ): Promise<{ btcTxId: string; btcTxHex: string }> {
    await this.ensureConnected();

    log.info(`Bridging rune ${runeId} (amount: ${amount}) to ERC20`);

    const evmClient = this.getEvmClient();

    // Create intention for bridging rune to ERC20
    const intention = await addTxIntention(this.config, {
      deposit: {
        runes: [
          {
            id: runeId,
            amount,
          },
        ],
      },
      evmTransaction: {
        value: 0n,
        gas: 100000n,
      },
    });

    // Finalize BTC transaction
    const btcTx = await finalizeBTCTransaction(this.config, [intention], evmClient);

    // Sign the intentions
    await signIntentions(this.config, evmClient, [intention], {
      txId: btcTx.tx.id,
    });

    // Broadcast the BTC transaction
    const txId = await broadcastTransaction(this.config, btcTx.tx.hex);

    log.info(`Rune bridge broadcast: txId=${txId}`);

    return {
      btcTxId: txId,
      btcTxHex: btcTx.tx.hex,
    };
  }

  /** Bridge BTC from EVM back to Bitcoin (withdrawal) */
  async bridgeEvmToBtc(
    satoshis: number,
    btcAddress: string
  ): Promise<{ btcTxId: string; btcTxHex: string }> {
    await this.ensureConnected();

    log.info(`Withdrawing ${satoshis} satoshis to ${btcAddress}`);

    const evmClient = this.getEvmClient();

    // Create withdrawal intention with completeTx
    const intention = await addTxIntention(this.config, {
      withdraw: {
        satoshis,
      },
      evmTransaction: {
        value: 0n,
        gas: 200000n,
      },
    });

    // Finalize BTC transaction
    const btcTx = await finalizeBTCTransaction(this.config, [intention], evmClient);

    // Sign the intentions
    await signIntentions(this.config, evmClient, [intention], {
      txId: btcTx.tx.id,
    });

    // Broadcast the BTC transaction
    const txId = await broadcastTransaction(this.config, btcTx.tx.hex);

    log.info(`EVM withdrawal broadcast: txId=${txId}`);

    return {
      btcTxId: txId,
      btcTxHex: btcTx.tx.hex,
    };
  }

  /** Get the underlying MIDL config for advanced operations */
  getMidlConfig(): Config {
    return this.config;
  }
}

/**
 * Create Bitcoin wallet client from environment variable
 */
export function createBtcWalletFromEnv(): MidlBtcWalletClient {
  const privateKey = process.env.MIDL_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('MIDL_PRIVATE_KEY environment variable is required');
  }

  // Normalize key (remove 0x prefix if present for BTC compatibility)
  const normalizedKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

  const network = (process.env.MIDL_NETWORK || 'regtest') as 'mainnet' | 'regtest';

  return new MidlBtcWalletClient(normalizedKey, network);
}
