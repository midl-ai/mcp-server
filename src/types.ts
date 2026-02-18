/**
 * Shared types for MIDL MCP Server
 */

import type { z } from 'zod';

/**
 * Standard tool response - all tools return this structure
 */
export type ToolResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: ErrorInfo };

/**
 * Error information with actionable details
 */
export interface ErrorInfo {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  suggestion?: string;
}

/**
 * Common error codes
 */
export const ErrorCode = {
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  RPC_TIMEOUT: 'RPC_TIMEOUT',
  RPC_CONNECTION_FAILED: 'RPC_CONNECTION_FAILED',
  TX_REVERTED: 'TX_REVERTED',
  GAS_ESTIMATION_FAILED: 'GAS_ESTIMATION_FAILED',
  CONTRACT_NOT_FOUND: 'CONTRACT_NOT_FOUND',
  INVALID_ABI: 'INVALID_ABI',
  FUNCTION_NOT_FOUND: 'FUNCTION_NOT_FOUND',
  INVALID_PRIVATE_KEY: 'INVALID_PRIVATE_KEY',
  RUNE_NOT_FOUND: 'RUNE_NOT_FOUND',
  BRIDGE_PENDING: 'BRIDGE_PENDING',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Tool metadata for MCP registration
 */
export interface ToolMetadata {
  name: string;
  description: string;
  schema: z.ZodType;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
  };
}

/**
 * Address types
 */
export type EvmAddress = `0x${string}`;
export type BtcAddress = string;

/**
 * Transaction receipt summary
 */
export interface TxReceipt {
  transactionHash: string;
  blockNumber: number;
  status: 'success' | 'reverted';
  gasUsed: string;
  explorerUrl: string;
}

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
 * Helper to create success response
 */
export function success<T>(data: T): ToolResponse<T> {
  return { success: true, data };
}

/**
 * Helper to create error response
 */
export function error(
  code: ErrorCodeType,
  message: string,
  details?: Record<string, unknown>,
  suggestion?: string
): ToolResponse<never> {
  return {
    success: false,
    error: { code, message, details, suggestion },
  };
}
