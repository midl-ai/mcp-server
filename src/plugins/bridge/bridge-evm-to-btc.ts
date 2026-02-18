/**
 * Tool: midl_bridge_evm_to_btc
 * Bridge BTC from EVM layer back to Bitcoin layer (withdrawal)
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { createBtcWalletFromEnv } from '../../btc-wallet.js';
import { getNetworkConfig, SATOSHIS_PER_BTC } from '../../config.js';

const log = createLogger('bridge-evm-to-btc');

const schema = z.object({
  satoshis: z.string().describe('Amount in satoshis to withdraw (e.g., "100000" for 0.001 BTC)'),
  btcAddress: z.string().min(1).describe('Target Bitcoin address for withdrawal'),
});

type Input = z.infer<typeof schema>;

interface BridgeEvmToBtcResult {
  btcTxId: string;
  btcTxHex: string;
  satoshis: string;
  btcAmount: string;
  btcAddress: string;
  explorerUrl: string;
  status: string;
}

const config: ToolConfig = {
  name: 'bridge_evm_to_btc',
  description:
    'Bridge BTC from EVM layer back to Bitcoin layer (withdrawal). ' +
    'The BTC will be sent to your specified Bitcoin address after validator confirmation.',
  schema,
  readOnly: false,
  destructive: true,
};

export class BridgeEvmToBtcTool extends ToolBase<Input, BridgeEvmToBtcResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BridgeEvmToBtcResult>> {
    try {
      const satoshis = parseInt(input.satoshis, 10);
      log.info(`Bridge EVM to BTC requested: ${satoshis} satoshis -> ${input.btcAddress}`);

      // Create BTC wallet client for signing
      const btcWallet = createBtcWalletFromEnv();
      await btcWallet.connect();

      // Execute withdrawal using intention-based flow
      const result = await btcWallet.bridgeEvmToBtc(satoshis, input.btcAddress);

      const networkConfig = getNetworkConfig();
      const btcAmount = (satoshis / SATOSHIS_PER_BTC).toFixed(8);

      return success({
        btcTxId: result.btcTxId,
        btcTxHex: result.btcTxHex,
        satoshis: input.satoshis,
        btcAmount: `${btcAmount} BTC`,
        btcAddress: input.btcAddress,
        explorerUrl: `${networkConfig.mempoolUrl}/tx/${result.btcTxId}`,
        status: 'pending_confirmation',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`EVM withdrawal failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `EVM withdrawal failed: ${message}`);
    }
  }
}
