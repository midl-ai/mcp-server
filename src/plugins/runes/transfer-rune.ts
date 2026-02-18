/**
 * Tool: midl_transfer_rune
 * Transfer Runes to another Bitcoin address using edictRune
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { createBtcWalletFromEnv } from '../../btc-wallet.js';
import { getNetworkConfig } from '../../config.js';

const log = createLogger('transfer-rune');

const RUNE_ID_REGEX = /^\d+:\d+$/;

const schema = z.object({
  runeId: z
    .string()
    .regex(RUNE_ID_REGEX, 'Invalid rune ID format. Expected: blockHeight:txIndex')
    .describe('Rune ID to transfer (e.g., "840000:1")'),
  amount: z.string().describe('Amount of runes to transfer'),
  toAddress: z.string().min(1).describe('Recipient Bitcoin address'),
});

type Input = z.infer<typeof schema>;

interface TransferRuneResult {
  txId: string;
  txHex: string;
  runeId: string;
  amount: string;
  toAddress: string;
  explorerUrl: string;
}

const config: ToolConfig = {
  name: 'transfer_rune',
  description: 'Transfer Runes to another Bitcoin address.',
  schema,
  readOnly: false,
  destructive: true,
};

export class TransferRuneTool extends ToolBase<Input, TransferRuneResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<TransferRuneResult>> {
    try {
      log.info(`Transfer rune requested: ${input.runeId} -> ${input.toAddress}`);

      // Create BTC wallet client for signing
      const btcWallet = createBtcWalletFromEnv();
      await btcWallet.connect();

      // Execute rune transfer using edictRune
      const result = await btcWallet.transferRune({
        transfers: [
          {
            runeId: input.runeId,
            amount: BigInt(input.amount),
            receiver: input.toAddress,
          },
        ],
        publish: true,
      });

      const networkConfig = getNetworkConfig();

      return success({
        txId: result.tx.id,
        txHex: result.tx.hex,
        runeId: input.runeId,
        amount: input.amount,
        toAddress: input.toAddress,
        explorerUrl: `${networkConfig.mempoolUrl}/tx/${result.tx.id}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Rune transfer failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `Rune transfer failed: ${message}`);
    }
  }
}
