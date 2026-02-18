/**
 * Tool: midl_read_contract
 * Read from a smart contract
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success } from '../../types.js';

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

interface ReadContractResult {
  contractAddress: string;
  functionName: string;
  result: unknown;
  network: string;
}

const config: ToolConfig = {
  name: 'read_contract',
  description:
    'Read data from a smart contract. Requires contract address, ABI, and function name. Returns the function result.',
  schema,
  readOnly: true,
  destructive: false,
};

export class ReadContractTool extends ToolBase<Input, ReadContractResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<ReadContractResult>> {
    const result = await this.wallet.readContract(
      input.address as `0x${string}`,
      input.abi as readonly unknown[],
      input.functionName,
      input.args as readonly unknown[]
    );

    if (!result.success) {
      return result as ToolResponse<never>;
    }

    return success({
      contractAddress: input.address,
      functionName: input.functionName,
      result: result.data,
      network: this.wallet.getNetworkInfo().name,
    });
  }
}
