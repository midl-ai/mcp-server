/**
 * MCP UI utilities for rich visual responses
 * All tools return both JSON text and UI cards
 */

import { createUIResource } from '@mcp-ui/server';

/** Shorten address for display (0x1234...5678) */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Format large numbers with commas */
export function formatNumber(value: string | number): string {
  return Number(value).toLocaleString();
}

/** Base styles for UI cards (exported for use in other card modules) */
export const BASE_STYLES = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  max-width: 420px;
`;

/** Create a balance card UI resource */
export function createBalanceCard(
  title: string,
  address: string,
  balance: string,
  network: string,
  explorerUrl?: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        ${title}
      </div>
      <div style="font-size: 32px; font-weight: 600; font-family: 'SF Mono', monospace;">
        ${balance}
      </div>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Address</div>
        <div style="font-size: 13px; font-family: monospace; word-break: break-all;">
          ${address}
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 11px; opacity: 0.5;">
        <span>${network}</span>
        ${explorerUrl ? `<a href="${explorerUrl}" style="color: #60a5fa; text-decoration: none;">View on Explorer ↗</a>` : ''}
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://balance/${address}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a network info card */
export function createNetworkCard(
  name: string,
  chainId: number,
  rpcUrl: string,
  explorerUrl: string,
  mempoolUrl: string,
  blockNumber: number
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Network Info
      </div>
      <div style="font-size: 24px; font-weight: 600; margin-bottom: 4px;">
        ${name}
      </div>
      <div style="font-size: 13px; opacity: 0.7;">
        Chain ID: ${chainId}
      </div>
      <div style="margin-top: 16px; display: grid; gap: 12px;">
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Current Block</div>
          <div style="font-size: 18px; font-family: monospace; font-weight: 500;">${formatNumber(blockNumber)}</div>
        </div>
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">RPC URL</div>
          <div style="font-size: 12px; font-family: monospace; opacity: 0.8;">${rpcUrl}</div>
        </div>
      </div>
      <div style="display: flex; gap: 16px; margin-top: 16px; font-size: 11px;">
        <a href="${explorerUrl}" style="color: #60a5fa; text-decoration: none;">Blockscout ↗</a>
        <a href="${mempoolUrl}" style="color: #60a5fa; text-decoration: none;">Mempool ↗</a>
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://network/${chainId}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a system contracts table card */
export function createSystemContractsCard(
  contracts: Array<{ name: string; address: string; description: string }>,
  explorerBaseUrl: string
): ReturnType<typeof createUIResource> {
  const rows = contracts
    .map(
      (c) => `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 8px 12px 8px 0; font-weight: 500;">${c.name}</td>
      <td style="padding: 8px 0; font-family: monospace; font-size: 11px;">
        <a href="${explorerBaseUrl}/address/${c.address}" style="color: #60a5fa; text-decoration: none;">
          ${shortenAddress(c.address, 6)}
        </a>
      </td>
    </tr>
  `
    )
    .join('');

  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
        System Contracts
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  return createUIResource({
    uri: 'ui://system-contracts/list',
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a runes portfolio table card (FR38) */
export function createRunesPortfolioCard(
  address: string,
  runes: Array<{ runeId: string; name: string; symbol: string; amount: string }>,
  mempoolUrl: string
): ReturnType<typeof createUIResource> {
  const rows = runes
    .map(
      (r) => `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 8px 12px 8px 0; font-weight: 500;">${r.name}</td>
      <td style="padding: 8px 0; font-family: monospace;">${formatNumber(r.amount)} ${r.symbol}</td>
      <td style="padding: 8px 0; font-size: 11px; opacity: 0.6;">${r.runeId}</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Runes Portfolio
      </div>
      <div style="font-size: 13px; font-family: monospace; opacity: 0.7; margin-bottom: 16px;">
        ${shortenAddress(address, 8)}
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); opacity: 0.5;">
            <th style="text-align: left; padding: 8px 12px 8px 0; font-weight: 400;">Name</th>
            <th style="text-align: left; padding: 8px 0; font-weight: 400;">Balance</th>
            <th style="text-align: left; padding: 8px 0; font-weight: 400;">ID</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top: 12px; font-size: 11px;">
        <a href="${mempoolUrl}/address/${address}" style="color: #60a5fa; text-decoration: none;">View on Mempool ↗</a>
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://runes-portfolio/${address}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a token balance card */
export function createTokenBalanceCard(
  tokenName: string,
  tokenSymbol: string,
  balance: string,
  ownerAddress: string,
  tokenAddress: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Token Balance
      </div>
      <div style="font-size: 28px; font-weight: 600; font-family: 'SF Mono', monospace;">
        ${formatNumber(balance)} ${tokenSymbol}
      </div>
      <div style="font-size: 14px; opacity: 0.7; margin-top: 4px;">${tokenName}</div>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Owner</div>
        <div style="font-size: 12px; font-family: monospace;">${shortenAddress(ownerAddress, 6)}</div>
      </div>
      <div style="display: flex; gap: 16px; margin-top: 12px; font-size: 11px;">
        <a href="${explorerUrl}/token/${tokenAddress}" style="color: #60a5fa; text-decoration: none;">Token ↗</a>
        <a href="${explorerUrl}/address/${ownerAddress}" style="color: #60a5fa; text-decoration: none;">Owner ↗</a>
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://token-balance/${tokenAddress}/${ownerAddress}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a transfer result card */
export function createTransferCard(
  type: 'evm' | 'token',
  amount: string,
  symbol: string,
  toAddress: string,
  txHash: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="color: #22c55e; font-size: 20px;">✓</span>
        <span style="font-size: 11px; opacity: 0.6; text-transform: uppercase;">Transfer Sent</span>
      </div>
      <div style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">
        ${amount} ${symbol}
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">To</div>
        <div style="font-size: 12px; font-family: monospace;">${shortenAddress(toAddress, 8)}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Transaction</div>
        <div style="font-size: 12px; font-family: monospace;">${shortenAddress(txHash, 8)}</div>
      </div>
      <a href="${explorerUrl}/tx/${txHash}" style="color: #60a5fa; text-decoration: none; font-size: 12px;">View on Explorer ↗</a>
    </div>
  `;

  return createUIResource({
    uri: `ui://transfer/${txHash}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

// Re-export transaction-related cards from tx-cards module
export {
  createBridgeCard,
  createRuneTransferCard,
  createDeploymentCard,
  createTxReceiptCard,
} from './tx-cards.js';
