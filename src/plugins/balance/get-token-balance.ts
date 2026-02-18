/**
 * Tool: midl_get_token_balance
 * Gets ERC20 token balance for an address
 */

import { z } from 'zod';
import { erc20Abi, formatUnits } from 'viem';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('get-token-balance');

const schema = z.object({
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token contract address')
    .describe('ERC20 token contract address'),
  ownerAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid owner address')
    .describe('Address to check balance for'),
});

type Input = z.infer<typeof schema>;

interface TokenBalanceInfo {
  tokenAddress: string;
  ownerAddress: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  symbol: string;
  name: string;
  network: string;
}

const config: ToolConfig = {
  name: 'get_token_balance',
  description:
    'Get ERC20 token balance for an address. Returns balance along with token metadata (symbol, name, decimals).',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetTokenBalanceTool extends ToolBase<Input, TokenBalanceInfo> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<TokenBalanceInfo>> {
    const tokenAddress = input.tokenAddress as `0x${string}`;
    const ownerAddress = input.ownerAddress as `0x${string}`;

    try {
      // Fetch balance and token metadata in parallel
      const [balance, decimals, symbol, name] = await Promise.all([
        this.wallet.publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [ownerAddress],
        }),
        this.wallet.publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        this.wallet.publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        this.wallet.publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'name',
        }),
      ]);

      const networkConfig = this.wallet.getNetworkInfo();

      return success({
        tokenAddress: input.tokenAddress,
        ownerAddress: input.ownerAddress,
        balance: balance.toString(),
        balanceFormatted: `${formatUnits(balance, decimals)} ${symbol}`,
        decimals,
        symbol,
        name,
        network: networkConfig.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to get token balance: ${message}`);

      if (message.includes('execution reverted') || message.includes('not a contract')) {
        return error(
          ErrorCode.CONTRACT_NOT_FOUND,
          `Token contract not found or not ERC20: ${input.tokenAddress}`,
          { tokenAddress: input.tokenAddress }
        );
      }

      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get token balance: ${message}`);
    }
  }
}
