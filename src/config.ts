/**
 * MIDL MCP Server Configuration
 * Import chain configs from SDK - no hardcoding
 */

import { midlRegtest, midl, satoshisToWei, weiToSatoshis } from '@midl/executor';
import { defineChain } from 'viem';

// Re-export conversion utilities from SDK
export { satoshisToWei, weiToSatoshis };

// Rune magic value (satoshis per rune output)
export const RUNE_MAGIC_VALUE = 546n;

// Define viem-compatible chains with blockExplorers
const midlRegtestChain = defineChain({
  ...midlRegtest,
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout.staging.midl.xyz' },
  },
});

const midlMainnetChain = defineChain({
  ...midl,
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://blockscout.midl.xyz' },
  },
});

// Network configurations - using SDK chains with viem extensions
export const NETWORKS = {
  mainnet: {
    chain: midlMainnetChain,
    chainId: midl.id,
    name: midl.name,
    rpcUrl: midl.rpcUrls.default.http[0] ?? 'https://rpc.midl.xyz',
    explorerUrl: 'https://blockscout.midl.xyz',
    mempoolUrl: 'https://mempool.midl.xyz',
    runesApiUrl: 'https://runes.midl.xyz',
  },
  regtest: {
    chain: midlRegtestChain,
    chainId: midlRegtest.id,
    name: midlRegtest.name,
    rpcUrl: midlRegtest.rpcUrls.default.http[0] ?? 'https://rpc.staging.midl.xyz',
    explorerUrl: 'https://blockscout.staging.midl.xyz',
    mempoolUrl: 'https://mempool.staging.midl.xyz',
    runesApiUrl: 'https://runes.staging.midl.xyz',
  },
} as const;

export type NetworkName = keyof typeof NETWORKS;

// Timeouts (milliseconds)
export const TIMEOUT_READ_OPERATION = 3000;
export const TIMEOUT_WRITE_OPERATION = 5000;
export const TIMEOUT_DEPLOY_OPERATION = 30000;
export const TIMEOUT_SERVER_STARTUP = 2000;

// Server configuration
export const DEFAULT_HTTP_PORT = 3001;
export const DEFAULT_TRANSPORT = 'stdio';
export const DEFAULT_NETWORK: NetworkName = 'regtest';

// Tool naming prefix
export const TOOL_PREFIX = 'midl_';

/**
 * Get current network configuration from environment
 */
export function getNetworkConfig(): (typeof NETWORKS)[NetworkName] {
  const network = (process.env.MIDL_NETWORK || DEFAULT_NETWORK) as NetworkName;
  const config = NETWORKS[network];

  if (!config) {
    throw new Error(`Invalid MIDL_NETWORK: ${network}. Must be 'mainnet' or 'regtest'`);
  }

  return config;
}

/**
 * Get transport mode from environment
 */
export function getTransportMode(): 'stdio' | 'http' {
  const transport = process.env.MCP_TRANSPORT || DEFAULT_TRANSPORT;

  if (transport !== 'stdio' && transport !== 'http') {
    throw new Error(`Invalid MCP_TRANSPORT: ${transport}. Must be 'stdio' or 'http'`);
  }

  return transport;
}

/**
 * Get HTTP port from environment
 */
export function getHttpPort(): number {
  const port = process.env.PORT;
  return port ? parseInt(port, 10) : DEFAULT_HTTP_PORT;
}
