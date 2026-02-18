/**
 * Tool: midl_write_contract
 * Write to a smart contract using MIDL intention flow
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createBtcWalletFromEnv } from '../../btc-wallet.js';
import { getNetworkConfig } from '../../config.js';
import { createLogger } from '../../logger.js';

const log = createLogger('write-contract');

const schema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address').describe('Contract address'),
  abi: z.array(z.unknown()).describe('Contract ABI (JSON array)'),
  functionName: z.string().describe('Function name to call'),
  args: z.array(z.unknown()).default([]).describe('Function arguments'),
  value: z.string().optional().describe('BTC value to send (in wei) for payable functions'),
});

type Input = z.infer<typeof schema>;

interface WriteContractResult {
  contractAddress: string;
  functionName: string;
  transactionHash: string;
  btcTxId: string;
  status: string;
  explorerUrl: string;
  btcExplorerUrl: string;
}

const config: ToolConfig = {
  name: 'write_contract',
  description:
    'Execute a state-changing function on a smart contract via MIDL intention flow. ' +
    'For payable functions, include value parameter (in wei).',
  schema,
  readOnly: false,
  destructive: true,
};

export class WriteContractTool extends ToolBase<Input, WriteContractResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<WriteContractResult>> {
    try {
      log.info(`Writing to contract ${input.address}.${input.functionName}`);

      const btcWallet = createBtcWalletFromEnv();
      await btcWallet.connect();

      const value = input.value ? BigInt(input.value) : 0n;
      const result = await btcWallet.writeContract(
        input.address as `0x${string}`,
        input.abi as readonly unknown[],
        input.functionName,
        input.args as readonly unknown[],
        value
      );

      const networkConfig = getNetworkConfig();

      return success({
        contractAddress: input.address,
        functionName: input.functionName,
        transactionHash: result.evmTxHash,
        btcTxId: result.btcTxId,
        status: 'pending_confirmation',
        explorerUrl: `${networkConfig.explorerUrl}/tx/${result.evmTxHash}`,
        btcExplorerUrl: `${networkConfig.mempoolUrl}/tx/${result.btcTxId}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Contract write failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `Contract write failed: ${message}`);
    }
  }
}
