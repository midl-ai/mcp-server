/**
 * Tool: midl_get_fee_rate
 * Get current Bitcoin fee rate
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('get-fee-rate');

const schema = z.object({}).strict();

type Input = z.infer<typeof schema>;

interface FeeRateResult {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
  network: string;
}

const config: ToolConfig = {
  name: 'get_fee_rate',
  description: 'Get current Bitcoin fee rates (sat/vB) for different confirmation targets.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetFeeRateTool extends ToolBase<Input, FeeRateResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(_input: Input): Promise<ToolResponse<FeeRateResult>> {
    const networkConfig = this.wallet.getNetworkInfo();
    const url = `${networkConfig.mempoolUrl}/api/v1/fees/recommended`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return error(ErrorCode.RPC_CONNECTION_FAILED, `Mempool API error: ${response.status}`);
      }

      const fees = (await response.json()) as FeeRateResult;

      return success({
        ...fees,
        network: networkConfig.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to get fee rate: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get fee rate: ${message}`);
    }
  }
}
