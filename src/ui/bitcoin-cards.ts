/**
 * Bitcoin-specific UI cards
 * Rune balances, fee rates, and Bitcoin-related displays
 */

import { createUIResource } from '@mcp-ui/server';
import { BASE_STYLES, shortenAddress, formatNumber } from './index.js';

/** Create a rune balance card */
export function createRuneBalanceCard(
  runeId: string,
  runeName: string,
  balance: string,
  address: string,
  mempoolUrl: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Rune Balance
      </div>
      <div style="font-size: 28px; font-weight: 600; font-family: 'SF Mono', monospace;">
        ${formatNumber(balance)}
      </div>
      <div style="font-size: 16px; font-weight: 500; margin-top: 4px;">${runeName}</div>
      <div style="font-size: 12px; opacity: 0.6; margin-top: 2px;">${runeId}</div>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Address</div>
        <div style="font-size: 12px; font-family: monospace;">${shortenAddress(address, 8)}</div>
      </div>
      <a href="${mempoolUrl}/address/${address}" style="display: block; margin-top: 12px; color: #60a5fa; text-decoration: none; font-size: 11px;">View on Mempool ↗</a>
    </div>
  `;

  return createUIResource({
    uri: `ui://rune-balance/${runeId}/${address}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a fee rate card */
export function createFeeRateCard(
  fastestFee: number,
  halfHourFee: number,
  hourFee: number,
  economyFee: number,
  network: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
        Bitcoin Fee Rates
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Fastest (~10 min)</div>
          <div style="font-size: 18px; font-weight: 600;">${fastestFee} <span style="font-size: 12px; opacity: 0.6;">sat/vB</span></div>
        </div>
        <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">30 minutes</div>
          <div style="font-size: 18px; font-weight: 600;">${halfHourFee} <span style="font-size: 12px; opacity: 0.6;">sat/vB</span></div>
        </div>
        <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">1 hour</div>
          <div style="font-size: 18px; font-weight: 600;">${hourFee} <span style="font-size: 12px; opacity: 0.6;">sat/vB</span></div>
        </div>
        <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Economy</div>
          <div style="font-size: 18px; font-weight: 600;">${economyFee} <span style="font-size: 12px; opacity: 0.6;">sat/vB</span></div>
        </div>
      </div>
      <div style="margin-top: 12px; font-size: 11px; opacity: 0.5;">${network}</div>
    </div>
  `;

  return createUIResource({
    uri: `ui://fee-rate/${Date.now()}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a rune ERC20 address card */
export function createRuneErc20AddressCard(
  runeId: string,
  erc20Address: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Rune ERC20 Address
      </div>
      <div style="margin-top: 12px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Rune ID</div>
        <div style="font-size: 14px; font-family: monospace;">${runeId}</div>
      </div>
      <div style="margin: 12px 0; text-align: center; opacity: 0.4;">↓</div>
      <div>
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">ERC20 Contract</div>
        <div style="font-size: 13px; font-family: monospace; word-break: break-all;">${erc20Address}</div>
      </div>
      <a href="${explorerUrl}" style="display: block; margin-top: 16px; color: #60a5fa; text-decoration: none; font-size: 11px;">View Contract ↗</a>
    </div>
  `;

  return createUIResource({
    uri: `ui://rune-erc20/${runeId}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a logs summary card */
export function createLogsCard(
  count: number,
  contractAddress: string | undefined,
  network: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Event Logs
      </div>
      <div style="font-size: 32px; font-weight: 600; font-family: 'SF Mono', monospace;">
        ${formatNumber(count)}
      </div>
      <div style="font-size: 14px; opacity: 0.7; margin-top: 4px;">log${count !== 1 ? 's' : ''} found</div>
      ${contractAddress ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Contract</div>
        <div style="font-size: 12px; font-family: monospace;">${shortenAddress(contractAddress, 6)}</div>
      </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 11px; opacity: 0.5;">
        <span>${network}</span>
        ${contractAddress ? `<a href="${explorerUrl}/address/${contractAddress}#logs" style="color: #60a5fa; text-decoration: none;">View Logs ↗</a>` : ''}
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://logs/${Date.now()}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}
