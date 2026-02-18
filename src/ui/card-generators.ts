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
} from '../types.js';
import {
  createBalanceCard,
  createNetworkCard,
  createSystemContractsCard,
  createBridgeCard,
  createRuneTransferCard,
  createDeploymentCard,
  createTxReceiptCard,
} from './index.js';

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
  midl_get_network_info: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as NetworkInfo;
    const card = createNetworkCard(
      data.name,
      data.chainId,
      data.rpcUrl,
      data.explorerUrl,
      data.mempoolUrl,
      data.blockNumber
    );
    return card as ContentItem;
  },

  midl_get_system_contracts: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as SystemContractInfo[];
    const card = createSystemContractsCard(data, explorerUrl);
    return card as ContentItem;
  },

  midl_get_evm_balance: (result, explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BalanceInfo;
    const card = createBalanceCard(
      'EVM Balance',
      data.address,
      data.balanceFormatted,
      data.network,
      `${explorerUrl}/address/${data.address}`
    );
    return card as ContentItem;
  },

  midl_get_btc_balance: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BtcBalanceInfo;
    const card = createBalanceCard(
      'Bitcoin Balance',
      data.address,
      data.balanceFormatted,
      data.network
    );
    return card as ContentItem;
  },

  midl_bridge_btc_to_evm: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BridgeBtcToEvmResult;
    const card = createBridgeCard('btc-to-evm', data.btcTxId, data.btcAmount, data.status, data.explorerUrl);
    return card as ContentItem;
  },

  midl_bridge_evm_to_btc: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BridgeEvmToBtcResult;
    const card = createBridgeCard('evm-to-btc', data.btcTxId, data.btcAmount, data.status, data.explorerUrl);
    return card as ContentItem;
  },

  midl_bridge_rune_to_erc20: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as BridgeRuneToErc20Result;
    const card = createBridgeCard('rune-to-erc20', data.btcTxId, data.amount, data.status, data.explorerUrl);
    return card as ContentItem;
  },

  midl_transfer_rune: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as RuneTransferResult;
    const card = createRuneTransferCard(data.runeId, data.amount, data.toAddress, data.txId, data.explorerUrl);
    return card as ContentItem;
  },

  midl_deploy_contract: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as DeployResult;
    const card = createDeploymentCard(
      data.contractAddress,
      data.transactionHash,
      undefined, // contractName not in result
      data.gasUsed,
      data.explorerUrl
    );
    return card as ContentItem;
  },

  midl_get_transaction_receipt: (result, _explorerUrl) => {
    if (!result.success) return null;
    const data = result.data as TxReceipt;
    const card = createTxReceiptCard(
      data.transactionHash,
      data.status,
      data.blockNumber,
      data.gasUsed,
      data.explorerUrl
    );
    return card as ContentItem;
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
