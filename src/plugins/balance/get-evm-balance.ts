/**
 * Tool: midl_get_evm_balance
 * Gets the EVM layer BTC balance for an address
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type BalanceInfo, type ToolResponse } from '../../types.js';
import { resolveAddress } from '../../utils/wallet-addresses.js';

const schema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address format')
    .optional()
    .describe('EVM address (0x...). If omitted, uses connected wallet address.'),
});

type Input = z.infer<typeof schema>;

const config: ToolConfig = {
  name: 'get_evm_balance',
  description:
    'Get the EVM layer BTC balance. If no address provided, returns balance of connected wallet. Returns balance in wei and formatted BTC.',
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
    const address = await resolveAddress(this.wallet, input.address, 'evm');
    return this.wallet.getBalance(address as `0x${string}`);
  }
}
