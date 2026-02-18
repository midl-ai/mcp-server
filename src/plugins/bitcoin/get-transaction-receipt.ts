/**
 * Tool: midl_get_transaction_receipt
 * Get EVM transaction receipt
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, type TxReceipt, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('get-transaction-receipt');

const schema = z.object({
  hash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash')
    .describe('EVM transaction hash'),
});

type Input = z.infer<typeof schema>;

interface ReceiptResult extends TxReceipt {
  from: string;
  to: string | null;
  contractAddress: string | null;
  logs: Array<{ address: string; topics: string[]; data: string }>;
}

const config: ToolConfig = {
  name: 'get_transaction_receipt',
  description: 'Get EVM transaction receipt including status, gas used, and logs.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetTransactionReceiptTool extends ToolBase<Input, ReceiptResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<ReceiptResult>> {
    try {
      const receipt = await this.wallet.publicClient.getTransactionReceipt({
        hash: input.hash as `0x${string}`,
      });

      if (!receipt) {
        return error(ErrorCode.CONTRACT_NOT_FOUND, `Receipt not found: ${input.hash}`);
      }

      const networkConfig = this.wallet.getNetworkInfo();

      return success({
        transactionHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        status: receipt.status === 'success' ? 'success' : 'reverted',
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: `${networkConfig.explorerUrl}/tx/${receipt.transactionHash}`,
        from: receipt.from,
        to: receipt.to,
        contractAddress: receipt.contractAddress ?? null,
        logs: receipt.logs.map((l) => ({
          address: l.address,
          topics: l.topics as string[],
          data: l.data,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to get receipt: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get receipt: ${message}`);
    }
  }
}
