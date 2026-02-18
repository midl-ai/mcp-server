/**
 * UI Card Generators - maps tool results to MCP UI cards
 * Each tool can optionally have a card generator for rich visual responses
 */

import type { ToolResponse, NetworkInfo, BalanceInfo } from '../types.js';
import { createBalanceCard, createNetworkCard, createSystemContractsCard } from './index.js';

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

/** System contract info type */
interface SystemContractInfo {
  name: string;
  address: string;
  description: string;
}

/** BTC balance info type */
interface BtcBalanceInfo {
  address: string;
  balanceSatoshis: string;
  balanceFormatted: string;
  confirmedSatoshis: string;
  unconfirmedSatoshis: string;
  network: string;
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
