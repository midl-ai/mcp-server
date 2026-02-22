/**
 * Tool: midl_bridge_evm_to_btc
 * Bridge BTC from EVM layer back to Bitcoin layer (withdrawal)
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { createBtcWalletFromEnv } from '../../btc-wallet.js';
import { type ToolResponse, success, error, ErrorCode, type BridgeEvmToBtcResult } from '../../types.js';
import { createLogger } from '../../logger.js';
import { getNetworkConfig, SATOSHIS_PER_BTC } from '../../config.js';

const log = createLogger('bridge-evm-to-btc');

const BTC_ADDRESS_REGEX = /^(bc1|tb1|bcrt1)[a-zA-HJ-NP-Z0-9]{25,87}$/;

const schema = z.object({
  amount: z
    .string()
    .describe('Amount of BTC to withdraw (e.g., "0.1" for 0.1 BTC, or "50000" for 50000 satoshis)'),
  unit: z
    .enum(['btc', 'satoshis'])
    .default('btc')
    .describe('Unit of the amount: "btc" or "satoshis"'),
  btcAddress: z
    .string()
    .regex(BTC_ADDRESS_REGEX, 'Invalid Bitcoin address format')
    .describe('Bitcoin address to receive the withdrawn BTC'),
});

type Input = z.infer<typeof schema>;

const config: ToolConfig = {
  name: 'bridge_evm_to_btc',
  description:
    'Withdraw BTC from the EVM layer back to the Bitcoin layer. Creates a withdrawal transaction that validators process to send BTC to your specified Bitcoin address.',
  schema,
  readOnly: false,
  destructive: false,
};

export class BridgeEvmToBtcTool extends ToolBase<Input, BridgeEvmToBtcResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BridgeEvmToBtcResult>> {
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

      log.info(`Withdrawing ${satoshis} satoshis to ${input.btcAddress}`);

      // Create BTC wallet client for intention-based signing
      const btcWallet = createBtcWalletFromEnv();
      await btcWallet.connect();

      const result = await btcWallet.bridgeEvmToBtc(satoshis, input.btcAddress);

      const btcAmountFormatted = (Number(satoshis) / SATOSHIS_PER_BTC).toFixed(8);

      return success({
        btcTxId: result.btcTxId,
        btcTxHex: result.btcTxHex,
        satoshis: satoshis.toString(),
        btcAmount: `${btcAmountFormatted} BTC`,
        btcAddress: input.btcAddress,
        explorerUrl: `${networkConfig.mempoolUrl}/tx/${result.btcTxId}`,
        status: 'pending_confirmation',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Bridge EVM→BTC failed: ${message}`);

      if (message.includes('insufficient')) {
        return error(
          ErrorCode.INSUFFICIENT_FUNDS,
          `Insufficient EVM balance: ${message}`,
          undefined,
          'Ensure your EVM address has enough BTC balance to cover the withdrawal amount'
        );
      }

      return error(ErrorCode.RPC_CONNECTION_FAILED, `Withdrawal failed: ${message}`);
    }
  }
}
