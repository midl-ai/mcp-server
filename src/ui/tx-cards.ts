/**
 * Transaction-related UI cards (bridge, rune, deployment, receipt)
 */

import { createUIResource } from '@mcp-ui/server';
import { shortenAddress, formatNumber, BASE_STYLES } from './index.js';

/** Create a bridge operation card */
export function createBridgeCard(
  direction: 'btc-to-evm' | 'evm-to-btc' | 'rune-to-erc20',
  txId: string,
  amount: string,
  status: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const directionLabel = {
    'btc-to-evm': 'BTC → EVM',
    'evm-to-btc': 'EVM → BTC',
    'rune-to-erc20': 'Rune → ERC20',
  }[direction];

  const statusColor = status === 'pending_confirmation' ? '#f59e0b' : '#22c55e';

  const html = `
    <div style="${BASE_STYLES}">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="font-size: 11px; opacity: 0.6; text-transform: uppercase;">Bridge</span>
        <span style="background: rgba(96, 165, 250, 0.2); color: #60a5fa; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${directionLabel}</span>
      </div>
      <div style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">
        ${amount}
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Transaction</div>
        <div style="font-size: 12px; font-family: monospace; word-break: break-all;">${txId}</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: ${statusColor}; font-size: 12px;">● ${status.replace('_', ' ')}</span>
        <a href="${explorerUrl}" style="color: #60a5fa; text-decoration: none; font-size: 12px;">View ↗</a>
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://bridge/${txId}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a rune transfer card */
export function createRuneTransferCard(
  runeId: string,
  amount: string,
  toAddress: string,
  txId: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Rune Transfer
      </div>
      <div style="font-size: 24px; font-weight: 600; margin-bottom: 4px;">
        ${formatNumber(amount)}
      </div>
      <div style="font-size: 13px; opacity: 0.7; margin-bottom: 16px;">
        Rune ID: ${runeId}
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">To Address</div>
        <div style="font-size: 12px; font-family: monospace; word-break: break-all;">${toAddress}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Transaction</div>
        <div style="font-size: 12px; font-family: monospace;">${shortenAddress(txId, 8)}</div>
      </div>
      <a href="${explorerUrl}" style="color: #60a5fa; text-decoration: none; font-size: 12px;">View on Explorer ↗</a>
    </div>
  `;

  return createUIResource({
    uri: `ui://rune-transfer/${txId}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a contract deployment card */
export function createDeploymentCard(
  contractAddress: string,
  txHash: string,
  contractName: string | undefined,
  gasUsed: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="color: #22c55e; font-size: 20px;">✓</span>
        <span style="font-size: 11px; opacity: 0.6; text-transform: uppercase;">Contract Deployed</span>
      </div>
      ${contractName ? `<div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">${contractName}</div>` : ''}
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Contract Address</div>
        <div style="font-size: 13px; font-family: monospace; word-break: break-all;">${contractAddress}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Transaction</div>
        <div style="font-size: 12px; font-family: monospace;">${shortenAddress(txHash, 8)}</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 11px; opacity: 0.5;">Gas: ${formatNumber(gasUsed)}</span>
        <a href="${explorerUrl}" style="color: #60a5fa; text-decoration: none; font-size: 12px;">View ↗</a>
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://deployment/${contractAddress}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a transaction receipt card */
export function createTxReceiptCard(
  txHash: string,
  status: 'success' | 'reverted',
  blockNumber: number,
  gasUsed: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const statusColor = status === 'success' ? '#22c55e' : '#ef4444';
  const statusIcon = status === 'success' ? '✓' : '✗';

  const html = `
    <div style="${BASE_STYLES}">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="color: ${statusColor}; font-size: 20px;">${statusIcon}</span>
        <span style="font-size: 11px; opacity: 0.6; text-transform: uppercase;">Transaction ${status}</span>
      </div>
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Transaction Hash</div>
        <div style="font-size: 12px; font-family: monospace; word-break: break-all;">${txHash}</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Block</div>
          <div style="font-family: monospace;">${formatNumber(blockNumber)}</div>
        </div>
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Gas Used</div>
          <div style="font-family: monospace;">${formatNumber(gasUsed)}</div>
        </div>
      </div>
      <div style="margin-top: 16px;">
        <a href="${explorerUrl}" style="color: #60a5fa; text-decoration: none; font-size: 12px;">
          View on Explorer ↗
        </a>
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://tx/${txHash}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}
