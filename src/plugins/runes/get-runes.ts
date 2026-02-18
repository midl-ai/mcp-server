/**
 * Tool: midl_get_runes
 * Get all Runes for a Bitcoin address
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { getNetworkConfig } from '../../config.js';
import { resolveAddress } from '../../utils/wallet-addresses.js';

const log = createLogger('get-runes');

const schema = z.object({
  address: z.string().min(1).optional().describe('Bitcoin address. If omitted, uses connected wallet ordinals address.'),
});

type Input = z.infer<typeof schema>;

interface RuneInfo {
  id: string;
  name: string;
  spacedName: string;
  balance: string;
}

interface GetRunesResult {
  address: string;
  total: number;
  runes: RuneInfo[];
}

const config: ToolConfig = {
  name: 'get_runes',
  description: 'Get all Runes held by a Bitcoin address. If no address provided, uses connected wallet ordinals address.',
  schema,
  readOnly: true,
  destructive: false,
};

interface RuneApiResponse {
  data: Array<{
    id: string;
    amount: string;
    info?: {
      name: string;
      spaced_name: string;
    };
  }>;
}

export class GetRunesTool extends ToolBase<Input, GetRunesResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<GetRunesResult>> {
    try {
      const address = await resolveAddress(this.wallet, input.address, 'btc-ordinals');
      const networkConfig = getNetworkConfig();
      const url = `${networkConfig.runesApiUrl}/addresses/${address}/runes/balances?include_info=true`;

      const response = await fetch(url);

      if (!response.ok) {
        return error(
          ErrorCode.RPC_CONNECTION_FAILED,
          `Failed to fetch runes: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as RuneApiResponse;

      const runes: RuneInfo[] = data.data.map((rune) => ({
        id: rune.id,
        name: rune.info?.name || 'Unknown',
        spacedName: rune.info?.spaced_name || 'Unknown',
        balance: rune.amount,
      }));

      return success({
        address,
        total: runes.length,
        runes,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to get runes: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get runes: ${message}`);
    }
  }
}
