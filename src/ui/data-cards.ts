/**
 * Data display UI cards for read-only tool results
 * Block info, UTXOs, gas estimates, contract reads, etc.
 */

import { createUIResource } from '@mcp-ui/server';
import { BASE_STYLES, shortenAddress, formatNumber } from './index.js';

/** Create a block info card */
export function createBlockCard(
  blockNumber: number,
  hash: string,
  timestamp: string,
  txCount: number,
  gasUsed: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Block Info
      </div>
      <div style="font-size: 28px; font-weight: 600; font-family: 'SF Mono', monospace;">
        #${formatNumber(blockNumber)}
      </div>
      <div style="margin-top: 16px; display: grid; gap: 12px;">
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Hash</div>
          <div style="font-size: 12px; font-family: monospace;">${shortenAddress(hash, 10)}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Transactions</div>
            <div style="font-size: 16px; font-weight: 500;">${txCount}</div>
          </div>
          <div>
            <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Gas Used</div>
            <div style="font-size: 16px; font-weight: 500;">${formatNumber(gasUsed)}</div>
          </div>
        </div>
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Timestamp</div>
          <div style="font-size: 12px;">${timestamp}</div>
        </div>
      </div>
      <a href="${explorerUrl}" style="display: block; margin-top: 12px; color: #60a5fa; text-decoration: none; font-size: 11px;">View on Explorer ↗</a>
    </div>
  `;

  return createUIResource({
    uri: `ui://block/${blockNumber}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a UTXOs summary card */
export function createUtxosCard(
  address: string,
  count: number,
  totalValue: number,
  network: string,
  mempoolUrl: string
): ReturnType<typeof createUIResource> {
  const btcValue = (totalValue / 100_000_000).toFixed(8);

  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        UTXOs Summary
      </div>
      <div style="font-size: 28px; font-weight: 600; font-family: 'SF Mono', monospace;">
        ${count} UTXO${count !== 1 ? 's' : ''}
      </div>
      <div style="font-size: 14px; opacity: 0.7; margin-top: 4px;">${btcValue} BTC total</div>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Address</div>
        <div style="font-size: 12px; font-family: monospace;">${shortenAddress(address, 8)}</div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 11px; opacity: 0.5;">
        <span>${network}</span>
        <a href="${mempoolUrl}/address/${address}" style="color: #60a5fa; text-decoration: none;">View on Mempool ↗</a>
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://utxos/${address}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a gas estimate card */
export function createGasEstimateCard(
  gasEstimate: string,
  gasPriceGwei: string,
  estimatedCostBtc: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Gas Estimate
      </div>
      <div style="font-size: 28px; font-weight: 600; font-family: 'SF Mono', monospace;">
        ${formatNumber(gasEstimate)}
      </div>
      <div style="font-size: 14px; opacity: 0.7; margin-top: 4px;">gas units</div>
      <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Gas Price</div>
          <div style="font-size: 14px; font-weight: 500;">${gasPriceGwei} gwei</div>
        </div>
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Est. Cost</div>
          <div style="font-size: 14px; font-weight: 500;">${estimatedCostBtc} BTC</div>
        </div>
      </div>
    </div>
  `;

  return createUIResource({
    uri: `ui://gas-estimate/${Date.now()}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a contract read result card */
export function createContractReadCard(
  contractAddress: string,
  functionName: string,
  result: unknown,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
  const truncatedResult = resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr;

  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Contract Read
      </div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">
        ${functionName}()
      </div>
      <div style="font-size: 12px; font-family: monospace; opacity: 0.7;">
        ${shortenAddress(contractAddress, 6)}
      </div>
      <div style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 8px;">Result</div>
        <pre style="font-size: 12px; font-family: monospace; margin: 0; white-space: pre-wrap; word-break: break-all;">${truncatedResult}</pre>
      </div>
      <a href="${explorerUrl}/address/${contractAddress}" style="display: block; margin-top: 12px; color: #60a5fa; text-decoration: none; font-size: 11px;">View Contract ↗</a>
    </div>
  `;

  return createUIResource({
    uri: `ui://contract-read/${contractAddress}/${functionName}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create a contract write result card */
export function createContractWriteCard(
  contractAddress: string,
  functionName: string,
  txHash: string,
  gasUsed: string,
  status: 'success' | 'reverted',
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const statusColor = status === 'success' ? '#22c55e' : '#ef4444';
  const statusIcon = status === 'success' ? '✓' : '✗';

  const html = `
    <div style="${BASE_STYLES}">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="color: ${statusColor}; font-size: 20px;">${statusIcon}</span>
        <span style="font-size: 11px; opacity: 0.6; text-transform: uppercase;">Contract Write</span>
      </div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">
        ${functionName}()
      </div>
      <div style="font-size: 12px; font-family: monospace; opacity: 0.7;">
        ${shortenAddress(contractAddress, 6)}
      </div>
      <div style="margin-top: 16px; display: grid; gap: 12px;">
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Transaction</div>
          <div style="font-size: 12px; font-family: monospace;">${shortenAddress(txHash, 8)}</div>
        </div>
        <div>
          <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Gas Used</div>
          <div style="font-size: 14px; font-weight: 500;">${formatNumber(gasUsed)}</div>
        </div>
      </div>
      <a href="${explorerUrl}/tx/${txHash}" style="display: block; margin-top: 12px; color: #60a5fa; text-decoration: none; font-size: 11px;">View Transaction ↗</a>
    </div>
  `;

  return createUIResource({
    uri: `ui://contract-write/${txHash}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}

/** Create an address conversion card */
export function createAddressConversionCard(
  publicKey: string,
  evmAddress: string,
  explorerUrl: string
): ReturnType<typeof createUIResource> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Address Derivation
      </div>
      <div style="margin-top: 12px;">
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">Bitcoin Public Key</div>
        <div style="font-size: 11px; font-family: monospace; word-break: break-all; opacity: 0.8;">${shortenAddress(publicKey, 12)}</div>
      </div>
      <div style="margin: 12px 0; text-align: center; opacity: 0.4;">↓</div>
      <div>
        <div style="font-size: 11px; opacity: 0.5; margin-bottom: 4px;">EVM Address</div>
        <div style="font-size: 14px; font-family: monospace; word-break: break-all;">${evmAddress}</div>
      </div>
      <a href="${explorerUrl}/address/${evmAddress}" style="display: block; margin-top: 16px; color: #60a5fa; text-decoration: none; font-size: 11px;">View on Explorer ↗</a>
    </div>
  `;

  return createUIResource({
    uri: `ui://address-conversion/${evmAddress}`,
    content: { type: 'rawHtml', htmlString: html },
    encoding: 'text',
  });
}
