/**
 * Tool result types for MIDL MCP Server
 * Each tool returns a specific result shape
 */

import type { TxReceipt } from './types.js';

/**
 * Balance response
 */
export interface BalanceInfo {
  address: string;
  balance: string;
  balanceFormatted: string;
  network: string;
  blockNumber: number;
}

/**
 * Rune information
 */
export interface RuneInfo {
  runeId: string;
  name: string;
  symbol: string;
  amount: string;
  divisibility: number;
}

/**
 * Network information
 */
export interface NetworkInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  mempoolUrl: string;
  blockNumber: number;
}

/**
 * BTC balance info (from mempool API)
 */
export interface BtcBalanceInfo {
  address: string;
  balanceSatoshis: string;
  balanceFormatted: string;
  confirmedSatoshis: string;
  unconfirmedSatoshis: string;
  network: string;
}

/**
 * Bridge operation results
 */
export interface BridgeBtcToEvmResult {
  btcTxId: string;
  btcTxHex: string;
  satoshis: string;
  btcAmount: string;
  explorerUrl: string;
  status: string;
}

export interface BridgeEvmToBtcResult {
  btcTxId: string;
  btcTxHex: string;
  satoshis: string;
  btcAmount: string;
  btcAddress: string;
  explorerUrl: string;
  status: string;
}

export interface BridgeRuneToErc20Result {
  btcTxId: string;
  btcTxHex: string;
  runeId: string;
  amount: string;
  explorerUrl: string;
  status: string;
}

/**
 * Rune transfer result
 */
export interface RuneTransferResult {
  txId: string;
  txHex: string;
  runeId: string;
  amount: string;
  toAddress: string;
  explorerUrl: string;
}

/**
 * Contract deployment result
 */
export interface DeployResult {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  status: 'success' | 'reverted';
  gasUsed: string;
  explorerUrl: string;
  abi?: unknown[];
  warnings?: string[];
}

/**
 * System contract info
 */
export interface SystemContractInfo {
  name: string;
  address: string;
  description: string;
}

/**
 * Block info result
 */
export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  timestampFormatted: string;
  transactionCount: number;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas: string | null;
  parentHash: string;
  explorerUrl: string;
}

/**
 * UTXOs result
 */
export interface GetUtxosResult {
  address: string;
  utxos: Array<{
    txid: string;
    vout: number;
    value: number;
    status: { confirmed: boolean; block_height?: number };
  }>;
  count: number;
  totalValue: number;
  network: string;
}

/**
 * Gas estimate result
 */
export interface GasEstimateResult {
  gasEstimate: string;
  gasEstimateFormatted: string;
  gasPriceWei: string;
  gasPriceGwei: string;
  estimatedCostWei: string;
  estimatedCostBtc: string;
}

/**
 * Token balance result
 */
export interface TokenBalanceInfo {
  tokenAddress: string;
  ownerAddress: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  symbol: string;
  name: string;
  network: string;
}

/**
 * Contract read result
 */
export interface ReadContractResult {
  contractAddress: string;
  functionName: string;
  result: unknown;
  network: string;
}

/**
 * Contract write result
 */
export interface WriteContractResult extends TxReceipt {
  contractAddress: string;
  functionName: string;
}

/**
 * Transfer result (EVM or token)
 */
export interface TransferResult extends TxReceipt {
  from: string;
  to: string;
  amount: string;
}

/**
 * Token transfer result
 */
export interface TransferTokenResult extends TxReceipt {
  tokenAddress: string;
  from: string;
  to: string;
  amount: string;
}

/**
 * Get runes result (portfolio)
 */
export interface GetRunesResult {
  address: string;
  total: number;
  runes: Array<{
    id: string;
    name: string;
    spacedName: string;
    balance: string;
  }>;
}

/**
 * Rune balance result
 */
export interface RuneBalanceResult {
  runeId: string;
  name: string;
  balance: string;
  address: string;
}

/**
 * Address conversion result
 */
export interface ConvertResult {
  publicKey: string;
  evmAddress: string;
}

/**
 * Fee rate result
 */
export interface FeeRateResult {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
  network: string;
}

/**
 * Get logs result
 */
export interface GetLogsResult {
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
  }>;
  count: number;
  network: string;
}

/**
 * Rune ERC20 address result
 */
export interface RuneAddressResult {
  runeId: string;
  erc20Address: string;
  explorerUrl: string;
}
