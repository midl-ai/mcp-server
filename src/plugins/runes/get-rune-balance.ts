/**
 * Tool: midl_get_rune_balance
 * Get balance of a specific Rune for an address
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { getNetworkConfig } from '../../config.js';
import { resolveAddress } from '../../utils/wallet-addresses.js';

const log = createLogger('get-rune-balance');

const RUNE_ID_REGEX = /^\d+:\d+$/;

const schema = z.object({
  address: z.string().min(1).optional().describe('Bitcoin address. If omitted, uses connected wallet ordinals address.'),
  runeId: z
    .string()
    .regex(RUNE_ID_REGEX, 'Invalid rune ID format. Expected: blockHeight:txIndex (e.g., "840000:1")')
    .describe('Rune ID in format blockHeight:txIndex'),
});

type Input = z.infer<typeof schema>;

interface RuneBalanceResult {
  address: string;
  runeId: string;
  balance: string;
}

const config: ToolConfig = {
  name: 'get_rune_balance',
  description: 'Get the balance of a specific Rune. If no address provided, uses connected wallet ordinals address.',
  schema,
  readOnly: true,
  destructive: false,
};

interface RuneBalanceApiResponse {
  data: string;
}

export class GetRuneBalanceTool extends ToolBase<Input, RuneBalanceResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<RuneBalanceResult>> {
    try {
      const address = await resolveAddress(this.wallet, input.address, 'btc-ordinals');
      const networkConfig = getNetworkConfig();
      const url = `${networkConfig.runesApiUrl}/addresses/${address}/runes/balances/${input.runeId}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return error(ErrorCode.RUNE_NOT_FOUND, `Rune ${input.runeId} not found for address`);
        }
        return error(
          ErrorCode.RPC_CONNECTION_FAILED,
          `Failed to fetch rune balance: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as RuneBalanceApiResponse;

      return success({
        address,
        runeId: input.runeId,
        balance: data.data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to get rune balance: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get rune balance: ${message}`);
    }
  }
}
