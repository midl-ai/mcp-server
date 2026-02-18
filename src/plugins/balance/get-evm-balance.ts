/**
 * Tool: midl_get_evm_balance
 * Gets the EVM layer BTC balance for an address
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type BalanceInfo, type ToolResponse } from '../../types.js';

const schema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address format')
    .describe('EVM address (0x...)'),
});

type Input = z.infer<typeof schema>;

const config: ToolConfig = {
  name: 'get_evm_balance',
  description:
    'Get the EVM layer BTC balance for an address. Returns balance in wei and formatted BTC. This is the balance available for EVM transactions and contract interactions.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetEvmBalanceTool extends ToolBase<Input, BalanceInfo> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BalanceInfo>> {
    return this.wallet.getBalance(input.address as `0x${string}`);
  }
}
