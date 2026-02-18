/**
 * Tool: midl_bridge_btc_to_evm
 * Bridge BTC from Bitcoin layer to EVM layer (deposit)
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { createBtcWalletFromEnv } from '../../btc-wallet.js';
import { getNetworkConfig, SATOSHIS_PER_BTC } from '../../config.js';

const log = createLogger('bridge-btc-to-evm');

const schema = z.object({
  satoshis: z.string().describe('Amount in satoshis to bridge (e.g., "100000" for 0.001 BTC)'),
});

type Input = z.infer<typeof schema>;

interface BridgeBtcToEvmResult {
  btcTxId: string;
  btcTxHex: string;
  satoshis: string;
  btcAmount: string;
  explorerUrl: string;
  status: string;
}

const config: ToolConfig = {
  name: 'bridge_btc_to_evm',
  description:
    'Bridge BTC from Bitcoin layer to EVM layer (deposit). ' +
    'The BTC will be credited to your EVM address after validator confirmation (~10 minutes).',
  schema,
  readOnly: false,
  destructive: true,
};

export class BridgeBtcToEvmTool extends ToolBase<Input, BridgeBtcToEvmResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BridgeBtcToEvmResult>> {
    try {
      const satoshis = parseInt(input.satoshis, 10);
      log.info(`Bridge BTC to EVM requested: ${satoshis} satoshis`);

      // Create BTC wallet client for signing
      const btcWallet = createBtcWalletFromEnv();
      await btcWallet.connect();

      // Execute BTC bridge using intention-based flow
      const result = await btcWallet.bridgeBtcToEvm(satoshis);

      const networkConfig = getNetworkConfig();
      const btcAmount = (satoshis / SATOSHIS_PER_BTC).toFixed(8);

      return success({
        btcTxId: result.btcTxId,
        btcTxHex: result.btcTxHex,
        satoshis: input.satoshis,
        btcAmount: `${btcAmount} BTC`,
        explorerUrl: `${networkConfig.mempoolUrl}/tx/${result.btcTxId}`,
        status: 'pending_confirmation',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`BTC bridge failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `BTC bridge failed: ${message}`);
    }
  }
}
