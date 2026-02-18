/**
 * Tool: midl_get_utxos
 * Get UTXOs for a Bitcoin address
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { resolveAddress } from '../../utils/wallet-addresses.js';

const log = createLogger('get-utxos');

const schema = z.object({
  address: z.string().min(26).max(90).optional().describe('Bitcoin address. If omitted, uses connected wallet payment address.'),
});

type Input = z.infer<typeof schema>;

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean; block_height?: number };
}

interface GetUtxosResult {
  address: string;
  utxos: UTXO[];
  count: number;
  totalValue: number;
  network: string;
}

const config: ToolConfig = {
  name: 'get_utxos',
  description: 'Get unspent transaction outputs (UTXOs). If no address provided, uses connected wallet payment address.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetUtxosTool extends ToolBase<Input, GetUtxosResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<GetUtxosResult>> {
    const address = await resolveAddress(this.wallet, input.address, 'btc-payment');
    const networkConfig = this.wallet.getNetworkInfo();
    const url = `${networkConfig.mempoolUrl}/api/address/${address}/utxo`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return error(ErrorCode.RPC_CONNECTION_FAILED, `Mempool API error: ${response.status}`);
      }

      const utxos = (await response.json()) as UTXO[];
      const totalValue = utxos.reduce((sum, u) => sum + u.value, 0);

      return success({
        address,
        utxos,
        count: utxos.length,
        totalValue,
        network: networkConfig.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to get UTXOs: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get UTXOs: ${message}`);
    }
  }
}
