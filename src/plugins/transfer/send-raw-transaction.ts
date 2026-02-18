/**
 * Tool: midl_send_raw_transaction
 * Send a raw signed transaction
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('send-raw-transaction');

const schema = z.object({
  signedTx: z
    .string()
    .regex(/^0x[a-fA-F0-9]+$/, 'Invalid signed transaction hex')
    .describe('Signed transaction (hex)'),
});

type Input = z.infer<typeof schema>;

interface SendRawResult {
  transactionHash: string;
  explorerUrl: string;
}

const config: ToolConfig = {
  name: 'send_raw_transaction',
  description: 'Send a raw signed transaction to the network.',
  schema,
  readOnly: false,
  destructive: true,
};

export class SendRawTransactionTool extends ToolBase<Input, SendRawResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<SendRawResult>> {
    try {
      const hash = await this.wallet.publicClient.sendRawTransaction({
        serializedTransaction: input.signedTx as `0x${string}`,
      });

      const networkConfig = this.wallet.getNetworkInfo();

      return success({
        transactionHash: hash,
        explorerUrl: `${networkConfig.explorerUrl}/tx/${hash}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Send raw tx failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `Send raw transaction failed: ${message}`);
    }
  }
}
