/**
 * Tool: midl_get_btc_balance
 * Gets the Bitcoin L1 balance for an address via mempool API
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { SATOSHIS_PER_BTC } from '../../config.js';

const log = createLogger('get-btc-balance');

const schema = z.object({
  address: z
    .string()
    .min(26)
    .max(90)
    .describe('Bitcoin address (bc1..., tb1..., bcrt1..., or legacy format)'),
});

type Input = z.infer<typeof schema>;

interface BtcBalanceInfo {
  address: string;
  /** Total balance in satoshis */
  balanceSatoshis: string;
  /** Formatted balance in BTC */
  balanceFormatted: string;
  /** Confirmed balance in satoshis */
  confirmedSatoshis: string;
  /** Unconfirmed balance in satoshis */
  unconfirmedSatoshis: string;
  network: string;
}

const config: ToolConfig = {
  name: 'get_btc_balance',
  description:
    'Get the Bitcoin L1 balance for an address. Returns confirmed and unconfirmed balances in satoshis. This queries the mempool API directly.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetBtcBalanceTool extends ToolBase<Input, BtcBalanceInfo> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BtcBalanceInfo>> {
    const networkConfig = this.wallet.getNetworkInfo();
    const url = `${networkConfig.mempoolUrl}/api/address/${input.address}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        log.error(`Mempool API error: ${response.status}`);
        return error(
          ErrorCode.RPC_CONNECTION_FAILED,
          `Mempool API returned ${response.status}`,
          { url }
        );
      }

      const data = (await response.json()) as {
        chain_stats: { funded_txo_sum: number; spent_txo_sum: number };
        mempool_stats: { funded_txo_sum: number; spent_txo_sum: number };
      };

      const confirmedSatoshis =
        data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
      const unconfirmedSatoshis =
        data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
      const totalSatoshis = confirmedSatoshis + unconfirmedSatoshis;

      return success({
        address: input.address,
        balanceSatoshis: totalSatoshis.toString(),
        balanceFormatted: `${(totalSatoshis / SATOSHIS_PER_BTC).toFixed(8)} BTC`,
        confirmedSatoshis: confirmedSatoshis.toString(),
        unconfirmedSatoshis: unconfirmedSatoshis.toString(),
        network: networkConfig.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to fetch BTC balance: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to fetch BTC balance: ${message}`);
    }
  }
}
