/**
 * UI Card Generators - maps tool results to MCP UI cards
 * Each tool can optionally have a card generator for rich visual responses
 */

import type {
  ToolResponse,
  NetworkInfo,
  BalanceInfo,
  BtcBalanceInfo,
  SystemContractInfo,
  BridgeBtcToEvmResult,
  BridgeEvmToBtcResult,
  BridgeRuneToErc20Result,
  RuneTransferResult,
  DeployResult,
  TxReceipt,
  BlockInfo,
  GetUtxosResult,
  GasEstimateResult,
  TokenBalanceInfo,
  ReadContractResult,
  WriteContractResult,
  TransferResult,
  TransferTokenResult,
  GetRunesResult,
  RuneBalanceResult,
  ConvertResult,
  FeeRateResult,
  GetLogsResult,
  RuneAddressResult,
} from '../types.js';
import {
  createBalanceCard,
  createNetworkCard,
  createSystemContractsCard,
  createBridgeCard,
  createRuneTransferCard,
  createDeploymentCard,
  createTxReceiptCard,
  createRunesPortfolioCard,
  createTokenBalanceCard,
  createTransferCard,
} from './index.js';
import {
  createBlockCard,
  createUtxosCard,
  createGasEstimateCard,
  createContractReadCard,
  createContractWriteCard,
  createAddressConversionCard,
} from './data-cards.js';
import {
  createRuneBalanceCard,
  createFeeRateCard,
  createRuneErc20AddressCard,
  createLogsCard,
} from './bitcoin-cards.js';
import { getNetworkConfig } from '../config.js';

/** Content item type from MCP SDK */
interface ContentItem {
  type: 'text' | 'resource';
  text?: string;
  resource?: {
    uri: string;
    mimeType: string;
    text?: string;
  };
}

type CardGenerator = (
  result: ToolResponse<unknown>,
  explorerUrl: string
) => ContentItem | null;

/** Card generators by tool name */
const cardGenerators: Record<string, CardGenerator> = {
  // Network tools
  midl_get_network_info: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as NetworkInfo;
    return createNetworkCard(
      data.name, data.chainId, data.rpcUrl, data.explorerUrl, data.mempoolUrl, data.blockNumber
    ) as ContentItem;
  },

  midl_get_system_contracts: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as SystemContractInfo[];
    return createSystemContractsCard(data, explorerUrl) as ContentItem;
  },

  midl_get_block: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BlockInfo;
    return createBlockCard(
      data.number, data.hash, data.timestampFormatted, data.transactionCount, data.gasUsed, data.explorerUrl
    ) as ContentItem;
  },

  // Balance tools
  midl_get_evm_balance: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BalanceInfo;
    return createBalanceCard(
      'EVM Balance', data.address, data.balanceFormatted, data.network, `${explorerUrl}/address/${data.address}`
    ) as ContentItem;
  },

  midl_get_btc_balance: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BtcBalanceInfo;
    return createBalanceCard('Bitcoin Balance', data.address, data.balanceFormatted, data.network) as ContentItem;
  },

  midl_get_token_balance: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as TokenBalanceInfo;
    return createTokenBalanceCard(
      data.name, data.symbol, data.balanceFormatted.split(' ')[0] ?? data.balance,
      data.ownerAddress, data.tokenAddress, explorerUrl
    ) as ContentItem;
  },

  // Bitcoin tools
  midl_get_utxos: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as GetUtxosResult;
    const networkConfig = getNetworkConfig();
    return createUtxosCard(
      data.address, data.count, data.totalValue, data.network, networkConfig.mempoolUrl
    ) as ContentItem;
  },

  // Bridge tools
  midl_bridge_btc_to_evm: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BridgeBtcToEvmResult;
    return createBridgeCard('btc-to-evm', data.btcTxId, data.btcAmount, data.status, data.explorerUrl) as ContentItem;
  },

  midl_bridge_evm_to_btc: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BridgeEvmToBtcResult;
    return createBridgeCard('evm-to-btc', data.btcTxId, data.btcAmount, data.status, data.explorerUrl) as ContentItem;
  },

  midl_bridge_rune_to_erc20: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BridgeRuneToErc20Result;
    return createBridgeCard('rune-to-erc20', data.btcTxId, data.amount, data.status, data.explorerUrl) as ContentItem;
  },

  // Runes tools
  midl_get_runes: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as GetRunesResult;
    const networkConfig = getNetworkConfig();
    const runes = data.runes.map(r => ({
      runeId: r.id, name: r.name, symbol: r.spacedName, amount: r.balance,
    }));
    return createRunesPortfolioCard(data.address, runes, networkConfig.mempoolUrl) as ContentItem;
  },

  midl_get_rune_balance: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as RuneBalanceResult;
    const networkConfig = getNetworkConfig();
    return createRuneBalanceCard(
      data.runeId, data.name, data.balance, data.address, networkConfig.mempoolUrl
    ) as ContentItem;
  },

  midl_transfer_rune: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as RuneTransferResult;
    return createRuneTransferCard(
      data.runeId, data.amount, data.toAddress, data.txId, data.explorerUrl
    ) as ContentItem;
  },

  // Contract tools
  midl_read_contract: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as ReadContractResult;
    return createContractReadCard(
      data.contractAddress, data.functionName, data.result, explorerUrl
    ) as ContentItem;
  },

  midl_write_contract: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as WriteContractResult;
    return createContractWriteCard(
      data.contractAddress, data.functionName, data.transactionHash, data.gasUsed, data.status, explorerUrl
    ) as ContentItem;
  },

  midl_deploy_contract: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as DeployResult;
    return createDeploymentCard(
      data.contractAddress, data.transactionHash, undefined, data.gasUsed, data.explorerUrl
    ) as ContentItem;
  },

  // Transfer tools
  midl_transfer_evm: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as TransferResult;
    return createTransferCard('evm', data.amount, 'BTC', data.to, data.transactionHash, explorerUrl) as ContentItem;
  },

  midl_transfer_token: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as TransferTokenResult;
    return createTransferCard('token', data.amount, 'tokens', data.to, data.transactionHash, explorerUrl) as ContentItem;
  },

  // Utility tools
  midl_estimate_gas: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as GasEstimateResult;
    return createGasEstimateCard(data.gasEstimate, data.gasPriceGwei, data.estimatedCostBtc) as ContentItem;
  },

  midl_convert_btc_to_evm: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as ConvertResult;
    return createAddressConversionCard(data.publicKey, data.evmAddress, explorerUrl) as ContentItem;
  },

  midl_get_transaction_receipt: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as TxReceipt;
    return createTxReceiptCard(
      data.transactionHash, data.status, data.blockNumber, data.gasUsed, data.explorerUrl
    ) as ContentItem;
  },

  midl_get_fee_rate: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as FeeRateResult;
    return createFeeRateCard(
      data.fastestFee, data.halfHourFee, data.hourFee, data.economyFee, data.network
    ) as ContentItem;
  },

  midl_get_logs: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as GetLogsResult;
    const contractAddress = data.logs.length > 0 ? data.logs[0]?.address : undefined;
    return createLogsCard(data.count, contractAddress, data.network, explorerUrl) as ContentItem;
  },

  midl_get_rune_erc20_address: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as RuneAddressResult;
    return createRuneErc20AddressCard(data.runeId, data.erc20Address, data.explorerUrl) as ContentItem;
  },

  midl_send_raw_transaction: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as TxReceipt;
    return createTxReceiptCard(
      data.transactionHash, data.status, data.blockNumber, data.gasUsed, data.explorerUrl
    ) as ContentItem;
  },
};

/**
 * Generate UI card for a tool result if a generator exists
 * Returns null if no generator is registered for the tool
 */
export function generateUICard(
  toolName: string,
  result: ToolResponse<unknown>,
  explorerUrl: string
): ContentItem | null {
  const generator = cardGenerators[toolName];
  if (!generator) return null;
  return generator(result, explorerUrl);
}
