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

// Re-export transaction-related cards from tx-cards module
export {
  createBridgeCard,
  createRuneTransferCard,
  createDeploymentCard,
  createTxReceiptCard,
} from './tx-cards.js';
