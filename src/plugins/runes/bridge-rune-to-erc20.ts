/**
 * Tool: midl_bridge_rune_to_erc20
 * Bridge a Rune from Bitcoin layer to its ERC20 representation on EVM
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { createBtcWalletFromEnv } from '../../btc-wallet.js';
import { getNetworkConfig } from '../../config.js';

const log = createLogger('bridge-rune-to-erc20');

const RUNE_ID_REGEX = /^\d+:\d+$/;

const schema = z.object({
  runeId: z
    .string()
    .regex(RUNE_ID_REGEX, 'Invalid rune ID format. Expected: blockHeight:txIndex')
    .describe('Rune ID to bridge (e.g., "840000:1")'),
  amount: z.string().describe('Amount of runes to bridge'),
});

type Input = z.infer<typeof schema>;

interface BridgeRuneResult {
  btcTxId: string;
  btcTxHex: string;
  runeId: string;
  amount: string;
  explorerUrl: string;
  status: string;
}

const config: ToolConfig = {
  name: 'bridge_rune_to_erc20',
  description:
    'Bridge a Rune from Bitcoin layer to its ERC20 representation on EVM. ' +
    'The ERC20 tokens will be credited after validator confirmation (~10 minutes).',
  schema,
  readOnly: false,
  destructive: true,
};

export class BridgeRuneToErc20Tool extends ToolBase<Input, BridgeRuneResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BridgeRuneResult>> {
    try {
      log.info(`Bridge rune to ERC20 requested: ${input.runeId}, amount: ${input.amount}`);

      // Create BTC wallet client for signing
      const btcWallet = createBtcWalletFromEnv();
      await btcWallet.connect();

      // Execute rune bridge using intention-based flow
      const result = await btcWallet.bridgeRuneToErc20(input.runeId, BigInt(input.amount));

      const networkConfig = getNetworkConfig();

      return success({
        btcTxId: result.btcTxId,
        btcTxHex: result.btcTxHex,
        runeId: input.runeId,
        amount: input.amount,
        explorerUrl: `${networkConfig.mempoolUrl}/tx/${result.btcTxId}`,
        status: 'pending_confirmation',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Rune bridge failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `Rune bridge failed: ${message}`);
    }
  }
}
