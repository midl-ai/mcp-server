/**
 * Tool: midl_write_contract
 * Write to a smart contract (state-changing call)
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, type TxReceipt } from '../../types.js';

const schema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address')
    .describe('Contract address'),
  abi: z.array(z.unknown()).describe('Contract ABI (JSON array)'),
  functionName: z.string().describe('Function name to call'),
  args: z.array(z.unknown()).default([]).describe('Function arguments'),
});

type Input = z.infer<typeof schema>;

interface WriteContractResult extends TxReceipt {
  contractAddress: string;
  functionName: string;
}

const config: ToolConfig = {
  name: 'write_contract',
  description:
    'Execute a state-changing function on a smart contract. Requires contract address, ABI, function name, and arguments. Returns transaction receipt.',
  schema,
  readOnly: false,
  destructive: true,
};

export class WriteContractTool extends ToolBase<Input, WriteContractResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<WriteContractResult>> {
    const result = await this.wallet.writeContract(
      input.address as `0x${string}`,
      input.abi as readonly unknown[],
      input.functionName,
      input.args as readonly unknown[]
    );

    if (!result.success) {
      return result as ToolResponse<never>;
    }

    return {
      success: true,
      data: {
        ...result.data,
        contractAddress: input.address,
        functionName: input.functionName,
      },
    };
  }
}
