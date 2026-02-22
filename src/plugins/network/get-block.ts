/**
 * Tool: midl_get_block
 * Returns block information by number or "latest"
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';

const schema = z.object({
  blockNumber: z
    .union([z.number().int().nonnegative(), z.literal('latest')])
    .default('latest')
    .describe('Block number or "latest" for most recent block'),
});

type Input = z.infer<typeof schema>;

interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  timestampFormatted: string;
  transactionCount: number;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas: string | null;
  parentHash: string;
  explorerUrl: string;
}

const config: ToolConfig = {
  name: 'get_block',
  description:
    'Get block information by number or latest. Returns block hash, timestamp, transaction count, and gas details.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetBlockTool extends ToolBase<Input, BlockInfo> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BlockInfo>> {
    try {
      // viem uses blockTag for 'latest' and blockNumber for specific numbers
      const block = input.blockNumber === 'latest'
        ? await this.wallet.publicClient.getBlock({ blockTag: 'latest' })
        : await this.wallet.publicClient.getBlock({ blockNumber: BigInt(input.blockNumber) });

      if (!block) {
        return error(ErrorCode.CONTRACT_NOT_FOUND, `Block not found: ${input.blockNumber}`);
      }

      const networkConfig = this.wallet.getNetworkInfo();

      return success({
        number: Number(block.number),
        hash: block.hash,
        timestamp: Number(block.timestamp),
        timestampFormatted: new Date(Number(block.timestamp) * 1000).toISOString(),
        transactionCount: block.transactions.length,
        gasUsed: block.gasUsed.toString(),
        gasLimit: block.gasLimit.toString(),
        baseFeePerGas: block.baseFeePerGas?.toString() ?? null,
        parentHash: block.parentHash,
        explorerUrl: `${networkConfig.explorerUrl}/block/${block.number}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get block: ${message}`);
    }
  }
}
