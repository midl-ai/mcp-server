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
  type EdictRuneParams,
  type EdictRuneResponse,
  getDefaultAccount,
} from '@midl/core';
import {
  addTxIntention,
  finalizeBTCTransaction,
  signIntentions,
  getEVMAddress,
  midlRegtest,
  midl as midlMainnet,
} from '@midl/executor';
import { keyPairConnector } from '@midl/node';
import {
  createPublicClient,
  http,
  encodeDeployData,
  encodeFunctionData,
  getContractAddress,
} from 'viem';
import { createLogger } from './logger.js';
import {
  getNetworkConfig,
  GAS_LIMIT_RUNE_BRIDGE,
  GAS_LIMIT_DEPLOY,
  GAS_LIMIT_CONTRACT_WRITE,
} from './config.js';

const log = createLogger('btc-wallet');

/** Result from executing an intention */
interface IntentionResult {
  btcTxId: string;
  btcTxHex: string;
  evmTxHash: string;
}

export class MidlBtcWalletClient {
  private readonly config: Config;
  private readonly networkName: 'mainnet' | 'regtest';
  private connected = false;
  public ordinalsAddress: string | null = null;
  public paymentAddress: string | null = null;

  constructor(privateKey: string, network: 'mainnet' | 'regtest' = 'regtest') {
    this.networkName = network;
    this.config = createConfig({
      networks: [network === 'mainnet' ? mainnet : regtest],
      connectors: [keyPairConnector({ privateKeys: [privateKey] })],
      persist: false,
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    const accounts = await connect(
      this.config,
      { purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment] },
      'keyPair'
    );
    this.ordinalsAddress = accounts.find((a) => a.purpose === AddressPurpose.Ordinals)?.address ?? null;
    this.paymentAddress = accounts.find((a) => a.purpose === AddressPurpose.Payment)?.address ?? null;
    this.connected = true;
    log.info(`BTC wallet connected: ordinals=${this.ordinalsAddress}`);
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) await this.connect();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getEvmClient(): any {
    const networkConfig = getNetworkConfig();
    const chain = this.networkName === 'mainnet' ? midlMainnet : midlRegtest;
    return createPublicClient({ chain, transport: http(networkConfig.rpcUrl) });
  }

  /** Execute intention flow: add → finalize → sign → submit */
  private async executeIntention(
    intentionParams: Parameters<typeof addTxIntention>[1]
  ): Promise<IntentionResult> {
    const evmClient = this.getEvmClient();
    const intention = await addTxIntention(this.config, intentionParams);
    const btcTx = await finalizeBTCTransaction(this.config, [intention], evmClient);
    const signedTxs = await signIntentions(this.config, evmClient, [intention], { txId: btcTx.tx.id });
    const evmTxHash = await evmClient.sendBTCTransactions({
      btcTransaction: btcTx.tx.hex,
      serializedTransactions: signedTxs,
    });
    return { btcTxId: btcTx.tx.id, btcTxHex: btcTx.tx.hex, evmTxHash: evmTxHash || btcTx.tx.id };
  }

  async transferRune(params: EdictRuneParams): Promise<EdictRuneResponse> {
    await this.ensureConnected();
    log.info(`Transferring runes: ${JSON.stringify(params.transfers)}`);
    const result = await edictRune(this.config, { ...params, publish: params.publish ?? true });
    log.info(`Rune transfer complete: txId=${result.tx.id}`);
    return result;
  }

  async bridgeRuneToErc20(runeId: string, amount: bigint): Promise<IntentionResult> {
    await this.ensureConnected();
    log.info(`Bridging rune ${runeId} (amount: ${amount}) to ERC20`);
    const result = await this.executeIntention({
      deposit: { runes: [{ id: runeId, amount }] },
      evmTransaction: { value: 0n, gas: GAS_LIMIT_RUNE_BRIDGE },
    });
    log.info(`Rune bridge submitted: txId=${result.btcTxId}`);
    return result;
  }

  async bridgeErc20ToRune(runeId: string, amount: bigint): Promise<IntentionResult> {
    await this.ensureConnected();
    log.info(`Withdrawing ERC20 to rune ${runeId} (amount: ${amount})`);
    const result = await this.executeIntention({
      withdraw: { runes: [{ id: runeId, amount }] },
      evmTransaction: { value: 0n, gas: GAS_LIMIT_RUNE_BRIDGE },
    });
    log.info(`ERC20 to Rune withdrawal submitted: txId=${result.btcTxId}`);
    return result;
  }

  getEvmAddress(): `0x${string}` {
    const account = getDefaultAccount(this.config);
    const network = this.config.getState().network;
    return getEVMAddress(account, network) as `0x${string}`;
  }

  async deployContract(
    abi: readonly unknown[],
    bytecode: `0x${string}`,
    args: readonly unknown[] = []
  ): Promise<{ btcTxId: string; contractAddress: `0x${string}`; evmTxHash: string }> {
    await this.ensureConnected();
    const evmAddress = this.getEvmAddress();
    const nonce = await this.getEvmClient().getTransactionCount({ address: evmAddress });
    const deployData = encodeDeployData({ abi, bytecode, args: args as unknown[] });

    log.info(`Deploying contract from ${evmAddress} with nonce ${nonce}`);
    const result = await this.executeIntention({
      evmTransaction: { data: deployData, gas: GAS_LIMIT_DEPLOY },
    });

    const contractAddress = getContractAddress({ from: evmAddress, nonce: BigInt(nonce) });
    log.info(`Contract deployed: ${contractAddress}, btcTx=${result.btcTxId}`);
    return { btcTxId: result.btcTxId, contractAddress, evmTxHash: result.evmTxHash };
  }

  async writeContract(
    address: `0x${string}`,
    abi: readonly unknown[],
    functionName: string,
    args: readonly unknown[] = [],
    value: bigint = 0n
  ): Promise<IntentionResult> {
    await this.ensureConnected();
    const callData = encodeFunctionData({ abi, functionName, args: args as unknown[] });

    log.info(`Writing to contract ${address}.${functionName}`);
    const intentionParams: Parameters<typeof addTxIntention>[1] = {
      evmTransaction: { to: address, data: callData, gas: GAS_LIMIT_CONTRACT_WRITE },
    };

    if (value > 0n) {
      intentionParams.deposit = { satoshis: Number(value / 10_000_000_000n) };
      if (intentionParams.evmTransaction) {
        intentionParams.evmTransaction.value = value;
      }
    }

    const result = await this.executeIntention(intentionParams);
    log.info(`Contract write submitted: btcTx=${result.btcTxId}`);
    return result;
  }

  getMidlConfig(): Config {
    return this.config;
  }

  /** Bridge BTC from Bitcoin layer to EVM layer (deposit) */
  async bridgeBtcToEvm(satoshis: bigint): Promise<IntentionResult> {
    await this.ensureConnected();
    const { satoshisToWei } = await import('./config.js');
    log.info(`Bridging ${satoshis} satoshis to EVM`);
    const result = await this.executeIntention({
      deposit: { satoshis },
      evmTransaction: { value: satoshisToWei(satoshis) },
    });
    log.info(`BTC→EVM bridge submitted: txId=${result.btcTxId}`);
    return result;
  }

  /** Bridge BTC from EVM layer back to Bitcoin layer (withdrawal) */
  async bridgeEvmToBtc(satoshis: bigint, btcAddress: string): Promise<IntentionResult> {
    await this.ensureConnected();
    log.info(`Withdrawing ${satoshis} satoshis to ${btcAddress}`);
    const result = await this.executeIntention({
      withdraw: { satoshis },
      evmTransaction: { value: 0n },
    });
    log.info(`EVM→BTC bridge submitted: txId=${result.btcTxId}`);
    return result;
  }
}

export function createBtcWalletFromEnv(): MidlBtcWalletClient {
  const privateKey = process.env.MIDL_PRIVATE_KEY;
  if (!privateKey) throw new Error('MIDL_PRIVATE_KEY environment variable is required');
  const normalizedKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  const network = (process.env.MIDL_NETWORK || 'regtest') as 'mainnet' | 'regtest';
  return new MidlBtcWalletClient(normalizedKey, network);
}
