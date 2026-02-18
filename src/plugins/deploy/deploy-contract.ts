/**
 * Tool: midl_deploy_contract
 * Deploy a smart contract from bytecode
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, type TxReceipt } from '../../types.js';

const schema = z.object({
  abi: z.array(z.unknown()).describe('Contract ABI (JSON array)'),
  bytecode: z
    .string()
    .regex(/^0x[a-fA-F0-9]+$/, 'Invalid bytecode format')
    .describe('Contract bytecode (hex)'),
  args: z.array(z.unknown()).default([]).describe('Constructor arguments'),
});

type Input = z.infer<typeof schema>;

interface DeployResult extends TxReceipt {
  contractAddress: string;
}

const config: ToolConfig = {
  name: 'deploy_contract',
  description:
    'Deploy a smart contract. Provide ABI, bytecode, and constructor arguments. Returns deployed contract address.',
  schema,
  readOnly: false,
  destructive: true,
};

export class DeployContractTool extends ToolBase<Input, DeployResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<DeployResult>> {
    const result = await this.wallet.deployContract(
      input.abi as readonly unknown[],
      input.bytecode as `0x${string}`,
      input.args as readonly unknown[]
    );

    if (!result.success) {
      return result as ToolResponse<never>;
    }

    return {
      success: true,
      data: {
        contractAddress: result.data.contractAddress,
        transactionHash: result.data.transactionHash,
        blockNumber: result.data.blockNumber,
        status: result.data.status,
        gasUsed: result.data.gasUsed,
        explorerUrl: result.data.explorerUrl,
      },
    };
  }
}
