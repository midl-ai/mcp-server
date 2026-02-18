/**
 * Tool: midl_transfer_token
 * Transfer ERC20 tokens
 */

import { z } from 'zod';
import { erc20Abi, parseUnits } from 'viem';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, type TxReceipt, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('transfer-token');

const schema = z.object({
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address')
    .describe('ERC20 token contract address'),
  to: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid recipient address')
    .describe('Recipient address'),
  amount: z.string().describe('Amount to transfer (human-readable, e.g., "100")'),
});

type Input = z.infer<typeof schema>;

interface TransferTokenResult extends TxReceipt {
  tokenAddress: string;
  from: string;
  to: string;
  amount: string;
}

const config: ToolConfig = {
  name: 'transfer_token',
  description: 'Transfer ERC20 tokens to another address.',
  schema,
  readOnly: false,
  destructive: true,
};

export class TransferTokenTool extends ToolBase<Input, TransferTokenResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<TransferTokenResult>> {
    const tokenAddress = input.tokenAddress as `0x${string}`;

    try {
      // Get token decimals
      const decimals = await this.wallet.publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
      });

      const value = parseUnits(input.amount, decimals);

      const result = await this.wallet.writeContract(tokenAddress, erc20Abi, 'transfer', [
        input.to,
        value,
      ]);

      if (!result.success) {
        return result as ToolResponse<never>;
      }

      return {
        success: true,
        data: {
          ...result.data,
          tokenAddress: input.tokenAddress,
          from: this.wallet.address,
          to: input.to,
          amount: input.amount,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Token transfer failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `Token transfer failed: ${message}`);
    }
  }
}
