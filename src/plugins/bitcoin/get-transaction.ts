/**
 * Tool: midl_get_transaction
 * Get Bitcoin transaction details
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('get-transaction');

const schema = z.object({
  txid: z.string().length(64).describe('Transaction ID (64-character hex)'),
});

type Input = z.infer<typeof schema>;

interface TxInfo {
  txid: string;
  version: number;
  size: number;
  weight: number;
  fee: number;
  status: { confirmed: boolean; block_height?: number; block_time?: number };
  vin: Array<{ txid: string; vout: number; prevout?: { value: number } }>;
  vout: Array<{ value: number; scriptpubkey_address?: string }>;
  explorerUrl: string;
}

const config: ToolConfig = {
  name: 'get_transaction',
  description: 'Get Bitcoin transaction details by txid.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetTransactionTool extends ToolBase<Input, TxInfo> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<TxInfo>> {
    const networkConfig = this.wallet.getNetworkInfo();
    const url = `${networkConfig.mempoolUrl}/api/tx/${input.txid}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return error(ErrorCode.CONTRACT_NOT_FOUND, `Transaction not found: ${input.txid}`);
      }

      const tx = (await response.json()) as TxInfo;

      return success({
        ...tx,
        explorerUrl: `${networkConfig.mempoolUrl}/tx/${input.txid}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to get transaction: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get transaction: ${message}`);
    }
  }
}
