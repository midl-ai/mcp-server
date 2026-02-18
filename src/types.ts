/**
 * Core types for MIDL MCP Server
 * Tool response, errors, and metadata
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

/** Default suggestions for common error codes */
export const ErrorSuggestion: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Use midl_bridge_btc_to_evm to bridge BTC to your EVM wallet',
  INVALID_ADDRESS: 'Verify the address format - EVM addresses start with 0x (40 hex chars)',
  RPC_TIMEOUT: 'Try again in a few seconds - the network may be congested',
  RPC_CONNECTION_FAILED: 'Check network connectivity and try again',
  TX_REVERTED: 'Check transaction parameters and ensure sufficient gas',
  GAS_ESTIMATION_FAILED: 'Verify contract address exists and function is callable',
  CONTRACT_NOT_FOUND: 'Verify contract is deployed at the specified address',
  INVALID_ABI: 'Check ABI JSON format and ensure it matches the deployed contract',
  FUNCTION_NOT_FOUND: 'List contract functions with midl_read_contract using abi parameter',
  INVALID_PRIVATE_KEY: 'Ensure MIDL_PRIVATE_KEY is a valid 64-char hex string',
  RUNE_NOT_FOUND: 'Use midl_get_runes to list available runes for the address',
  BRIDGE_PENDING: 'Bridge transaction submitted - check status on the explorer',
  UNKNOWN_ERROR: 'Check the error details and try again',
};

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
 * Helper to create success response
 */
export function success<T>(data: T): ToolResponse<T> {
  return { success: true, data };
}

/**
 * Helper to create error response (auto-applies default suggestion if not provided)
 */
export function error(
  code: ErrorCodeType,
  message: string,
  details?: Record<string, unknown>,
  suggestion?: string
): ToolResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      suggestion: suggestion ?? ErrorSuggestion[code] ?? undefined,
    },
  };
}

// Re-export all result types for convenience
export type {
  BalanceInfo,
  RuneInfo,
  NetworkInfo,
  BtcBalanceInfo,
  BridgeBtcToEvmResult,
  BridgeEvmToBtcResult,
  BridgeRuneToErc20Result,
  RuneTransferResult,
  DeployResult,
  SystemContractInfo,
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
  TxInfo,
  VerifyResult,
} from './result-types.js';
