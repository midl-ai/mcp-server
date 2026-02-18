/**
 * Tool: midl_transfer_evm
 * Transfer native BTC on EVM layer
 */

import { z } from 'zod';
import { parseEther } from 'viem';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, type TxReceipt } from '../../types.js';

const schema = z.object({
  to: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid recipient address')
    .describe('Recipient EVM address'),
  amount: z.string().describe('Amount in BTC (e.g., "0.1")'),
});

type Input = z.infer<typeof schema>;

interface TransferResult extends TxReceipt {
  from: string;
  to: string;
  amount: string;
}

const config: ToolConfig = {
  name: 'transfer_evm',
  description: 'Transfer native BTC on the EVM layer to another address.',
  schema,
  readOnly: false,
  destructive: true,
};

export class TransferEvmTool extends ToolBase<Input, TransferResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<TransferResult>> {
    const value = parseEther(input.amount);
    const result = await this.wallet.sendTransaction(input.to as `0x${string}`, value);

    if (!result.success) {
      return result as ToolResponse<never>;
    }

    return {
      success: true,
      data: {
        ...result.data,
        from: this.wallet.address,
        to: input.to,
        amount: input.amount,
      },
    };
  }
}
