/**
 * Tool: midl_bridge_erc20_to_rune
 * Bridge an ERC20 token back to its native Rune on Bitcoin
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { createBtcWalletFromEnv } from '../../btc-wallet.js';
import { getNetworkConfig } from '../../config.js';

const log = createLogger('bridge-erc20-to-rune');

const RUNE_ID_REGEX = /^\d+:\d+$/;

const schema = z.object({
  runeId: z
    .string()
    .regex(RUNE_ID_REGEX, 'Invalid rune ID format. Expected: blockHeight:txIndex')
    .describe('Rune ID to withdraw to (e.g., "840000:1")'),
  amount: z.string().describe('Amount of ERC20 tokens to bridge back to Rune'),
});

type Input = z.infer<typeof schema>;

interface BridgeErc20Result {
  btcTxId: string;
  btcTxHex: string;
  runeId: string;
  amount: string;
  explorerUrl: string;
  status: string;
}

const config: ToolConfig = {
  name: 'bridge_erc20_to_rune',
  description:
    'Bridge an ERC20 token back to its native Rune on Bitcoin (withdrawal). ' +
    'The Runes will be credited to your Bitcoin address after validator confirmation.',
  schema,
  readOnly: false,
  destructive: true,
};

export class BridgeErc20ToRuneTool extends ToolBase<Input, BridgeErc20Result> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BridgeErc20Result>> {
    try {
      log.info(`Bridge ERC20 to Rune requested: ${input.runeId}, amount: ${input.amount}`);

      // Create BTC wallet client for signing
      const btcWallet = createBtcWalletFromEnv();
      await btcWallet.connect();

      // Execute ERC20 to Rune withdrawal
      const result = await btcWallet.bridgeErc20ToRune(input.runeId, BigInt(input.amount));

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
      log.error(`ERC20 to Rune bridge failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `ERC20 to Rune bridge failed: ${message}`);
    }
  }
}
