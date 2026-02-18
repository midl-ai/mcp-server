/**
 * Tool: midl_get_logs
 * Get contract event logs
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('get-logs');

const schema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address')
    .optional()
    .describe('Contract address to filter logs'),
  fromBlock: z
    .union([z.number().int().nonnegative(), z.literal('latest')])
    .default('latest')
    .describe('Start block number or "latest"'),
  toBlock: z
    .union([z.number().int().nonnegative(), z.literal('latest')])
    .default('latest')
    .describe('End block number or "latest"'),
});

type Input = z.infer<typeof schema>;

interface LogEntry {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

interface GetLogsResult {
  logs: LogEntry[];
  count: number;
  network: string;
}

const config: ToolConfig = {
  name: 'get_logs',
  description:
    'Get event logs from the blockchain. Can filter by contract address and block range. Returns raw log data.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetLogsTool extends ToolBase<Input, GetLogsResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<GetLogsResult>> {
    try {
      const logs = await this.wallet.publicClient.getLogs({
        address: input.address as `0x${string}` | undefined,
        fromBlock: input.fromBlock === 'latest' ? 'latest' : BigInt(input.fromBlock),
        toBlock: input.toBlock === 'latest' ? 'latest' : BigInt(input.toBlock),
      });

      const formattedLogs: LogEntry[] = logs.map((l) => ({
        address: l.address,
        topics: l.topics as string[],
        data: l.data,
        blockNumber: Number(l.blockNumber),
        transactionHash: l.transactionHash,
        logIndex: l.logIndex,
      }));

      return success({
        logs: formattedLogs,
        count: formattedLogs.length,
        network: this.wallet.getNetworkInfo().name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to get logs: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get logs: ${message}`);
    }
  }
}
