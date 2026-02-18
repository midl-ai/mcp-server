/**
 * Tool: midl_get_network_info
 * Returns current network configuration and block height
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type NetworkInfo, type ToolResponse, success, error, ErrorCode } from '../../types.js';

const schema = z.object({}).strict();

type Input = z.infer<typeof schema>;

const config: ToolConfig = {
  name: 'get_network_info',
  description:
    'Get current MIDL network information including chain ID, RPC URL, explorer URLs, and current block height. Use this to verify network connectivity and configuration.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetNetworkInfoTool extends ToolBase<Input, NetworkInfo> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(_input: Input): Promise<ToolResponse<NetworkInfo>> {
    try {
      const networkConfig = this.wallet.getNetworkInfo();
      const blockNumber = await this.wallet.getBlockNumber();

      return success({
        chainId: networkConfig.chainId,
        name: networkConfig.name,
        rpcUrl: networkConfig.rpcUrl,
        explorerUrl: networkConfig.explorerUrl,
        mempoolUrl: networkConfig.mempoolUrl,
        blockNumber: Number(blockNumber),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get network info: ${message}`);
    }
  }
}
