/**
 * Tool: midl_estimate_gas
 * Estimate gas for an EVM transaction
 */

import { z } from 'zod';
import { formatUnits } from 'viem';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('estimate-gas');

const schema = z.object({
  to: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid recipient address')
    .describe('Target contract or recipient address'),
  value: z.string().optional().describe('Amount of BTC to send (e.g., "0.1")'),
  data: z
    .string()
    .regex(/^0x[a-fA-F0-9]*$/, 'Invalid hex data')
    .optional()
    .describe('Transaction calldata (hex)'),
});

type Input = z.infer<typeof schema>;

interface GasEstimateResult {
  gasEstimate: string;
  gasEstimateFormatted: string;
  gasPriceWei: string;
  gasPriceGwei: string;
  estimatedCostWei: string;
  estimatedCostBtc: string;
}

const config: ToolConfig = {
  name: 'estimate_gas',
  description: 'Estimate gas required for an EVM transaction before sending.',
  schema,
  readOnly: true,
  destructive: false,
};

export class EstimateGasTool extends ToolBase<Input, GasEstimateResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<GasEstimateResult>> {
    try {
      const value = input.value ? BigInt(Math.floor(parseFloat(input.value) * 1e18)) : undefined;

      const gasEstimate = await this.wallet.publicClient.estimateGas({
        account: this.wallet.walletClient.account,
        to: input.to as `0x${string}`,
        value,
        data: input.data as `0x${string}` | undefined,
      });

      const gasPrice = await this.wallet.publicClient.getGasPrice();
      const estimatedCost = gasEstimate * gasPrice;

      return success({
        gasEstimate: gasEstimate.toString(),
        gasEstimateFormatted: Number(gasEstimate).toLocaleString(),
        gasPriceWei: gasPrice.toString(),
        gasPriceGwei: formatUnits(gasPrice, 9),
        estimatedCostWei: estimatedCost.toString(),
        estimatedCostBtc: formatUnits(estimatedCost, 18),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Gas estimation failed: ${message}`);
      return error(ErrorCode.GAS_ESTIMATION_FAILED, `Gas estimation failed: ${message}`);
    }
  }
}
