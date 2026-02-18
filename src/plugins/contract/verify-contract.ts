/**
 * Tool: midl_verify_contract
 * Verify contract source code on Blockscout
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('verify-contract');

const schema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address')
    .describe('Contract address to verify'),
  sourceCode: z.string().describe('Solidity source code'),
  contractName: z.string().describe('Contract name (e.g., "Counter")'),
  compilerVersion: z.string().default('v0.8.24+commit.e11b9ed9').describe('Solidity compiler version'),
  optimizationUsed: z.boolean().default(true).describe('Whether optimization was used'),
  runs: z.number().int().default(200).describe('Optimization runs'),
});

type Input = z.infer<typeof schema>;

interface VerifyResult {
  address: string;
  verified: boolean;
  explorerUrl: string;
  message: string;
}

const config: ToolConfig = {
  name: 'verify_contract',
  description:
    'Verify contract source code on Blockscout explorer. Requires contract address, source code, and compiler settings.',
  schema,
  readOnly: false,
  destructive: false,
};

export class VerifyContractTool extends ToolBase<Input, VerifyResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<VerifyResult>> {
    const networkConfig = this.wallet.getNetworkInfo();
    const apiUrl = `${networkConfig.explorerUrl}/api/v2/smart-contracts/${input.address}/verification/via/flattened-code`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler_version: input.compilerVersion,
          source_code: input.sourceCode,
          contract_name: input.contractName,
          is_optimization_enabled: input.optimizationUsed,
          optimization_runs: input.runs,
          evm_version: 'default',
          autodetect_constructor_args: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`Verification API error: ${response.status} - ${errorText}`);
        return error(
          ErrorCode.CONTRACT_NOT_FOUND,
          `Verification failed: ${response.status}`,
          { response: errorText }
        );
      }

      await response.json();

      return success({
        address: input.address,
        verified: true,
        explorerUrl: `${networkConfig.explorerUrl}/address/${input.address}`,
        message: 'Contract verification submitted successfully',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Verification failed: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Verification failed: ${message}`);
    }
  }
}
