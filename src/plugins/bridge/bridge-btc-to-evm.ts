/**
 * Tool: midl_bridge_btc_to_evm
 * Bridge BTC from Bitcoin layer to EVM layer (deposit)
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { createBtcWalletFromEnv } from '../../btc-wallet.js';
import { type ToolResponse, success, error, ErrorCode, type BridgeBtcToEvmResult } from '../../types.js';
import { createLogger } from '../../logger.js';
import { getNetworkConfig, SATOSHIS_PER_BTC } from '../../config.js';

const log = createLogger('bridge-btc-to-evm');

const schema = z.object({
  amount: z
    .string()
    .describe('Amount of BTC to bridge (e.g., "0.1" for 0.1 BTC, or "50000" for 50000 satoshis)'),
  unit: z
    .enum(['btc', 'satoshis'])
    .default('btc')
    .describe('Unit of the amount: "btc" or "satoshis"'),
});

type Input = z.infer<typeof schema>;

const config: ToolConfig = {
  name: 'bridge_btc_to_evm',
  description:
    'Bridge BTC from the Bitcoin layer to the EVM layer. Creates a deposit transaction that sends BTC to the TSS multisig, which validators process to credit your EVM address.',
  schema,
  readOnly: false,
  destructive: false,
};

export class BridgeBtcToEvmTool extends ToolBase<Input, BridgeBtcToEvmResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BridgeBtcToEvmResult>> {
    const networkConfig = getNetworkConfig();

    try {
      // Parse amount to satoshis
      let satoshis: bigint;
      if (input.unit === 'btc') {
        const btcAmount = parseFloat(input.amount);
        if (isNaN(btcAmount) || btcAmount <= 0) {
          return error(ErrorCode.INVALID_ADDRESS, `Invalid BTC amount: ${input.amount}`);
        }
        satoshis = BigInt(Math.floor(btcAmount * SATOSHIS_PER_BTC));
      } else {
        satoshis = BigInt(input.amount);
      }

      if (satoshis <= 0n) {
        return error(ErrorCode.INVALID_ADDRESS, 'Amount must be greater than 0');
      }

      log.info(`Bridging ${satoshis} satoshis to EVM`);

      // Create BTC wallet client for intention-based signing
      const btcWallet = createBtcWalletFromEnv();
      await btcWallet.connect();

      const result = await btcWallet.bridgeBtcToEvm(satoshis);

      const btcAmountFormatted = (Number(satoshis) / SATOSHIS_PER_BTC).toFixed(8);

      return success({
        btcTxId: result.btcTxId,
        btcTxHex: result.btcTxHex,
        satoshis: satoshis.toString(),
        btcAmount: `${btcAmountFormatted} BTC`,
        explorerUrl: `${networkConfig.mempoolUrl}/tx/${result.btcTxId}`,
        status: 'pending_confirmation',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Bridge BTC→EVM failed: ${message}`);

      if (message.includes('insufficient')) {
        return error(
          ErrorCode.INSUFFICIENT_FUNDS,
          `Insufficient BTC balance: ${message}`,
          undefined,
          'Ensure your Bitcoin address has enough BTC to cover the amount plus fees'
        );
      }

      return error(ErrorCode.RPC_CONNECTION_FAILED, `Bridge failed: ${message}`);
    }
  }
}
