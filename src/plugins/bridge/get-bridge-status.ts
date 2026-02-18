/**
 * Tool: midl_get_bridge_status
 * Track the status of a BTC→EVM bridge transaction through its lifecycle
 */

import { z } from 'zod';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { getNetworkConfig } from '../../config.js';

const log = createLogger('get-bridge-status');

const schema = z.object({
  btcTxId: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'Invalid BTC transaction ID (64 hex chars)')
    .describe('Bitcoin transaction ID to check bridge status for'),
});

type Input = z.infer<typeof schema>;

type BridgeStage = 'pending' | 'btc_confirmed' | 'validators_processing' | 'evm_credited' | 'failed';

interface BridgeStatusResult {
  btcTxId: string;
  stage: BridgeStage;
  stageDescription: string;
  btcConfirmations: number;
  btcBlockHeight: number | null;
  evmCredited: boolean;
  suggestion: string;
  links: {
    btcTx: string;
    tssAddress: string;
    executorContract: string;
    evmAddress?: string;
  };
}

const config: ToolConfig = {
  name: 'get_bridge_status',
  description:
    'Track the status of a BTC→EVM bridge transaction. Shows BTC confirmations, validator processing, and EVM credit status with helpful suggestions.',
  schema,
  readOnly: true,
  destructive: false,
};

interface MempoolTxResponse {
  txid: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
  vout: Array<{
    scriptpubkey_address: string;
    value: number;
  }>;
}

export class GetBridgeStatusTool extends ToolBase<Input, BridgeStatusResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<BridgeStatusResult>> {
    const networkConfig = getNetworkConfig();

    try {
      // Step 1: Check BTC transaction status
      const btcUrl = `${networkConfig.mempoolUrl}/api/tx/${input.btcTxId}`;
      const btcResponse = await fetch(btcUrl);

      if (!btcResponse.ok) {
        if (btcResponse.status === 404) {
          return error(
            ErrorCode.CONTRACT_NOT_FOUND,
            `BTC transaction not found: ${input.btcTxId}`,
            undefined,
            'Verify the transaction ID is correct. It may not be broadcast yet.'
          );
        }
        return error(ErrorCode.RPC_CONNECTION_FAILED, `Mempool API error: ${btcResponse.status}`);
      }

      const btcTx = (await btcResponse.json()) as MempoolTxResponse;

      // Step 2: Get current block height for confirmation count
      let confirmations = 0;
      if (btcTx.status.confirmed && btcTx.status.block_height) {
        const tipUrl = `${networkConfig.mempoolUrl}/api/blocks/tip/height`;
        const tipResponse = await fetch(tipUrl);
        if (tipResponse.ok) {
          const tipHeight = parseInt(await tipResponse.text(), 10);
          confirmations = tipHeight - btcTx.status.block_height + 1;
        }
      }

      // Step 3: Find the TSS output (non-change output, typically P2TR)
      const tssOutput = btcTx.vout.find(
        (out) => out.scriptpubkey_address.startsWith('bcrt1p') // Taproot = TSS
      );
      const tssAddress = tssOutput?.scriptpubkey_address || 'unknown';

      // Step 4: Check EVM balance to see if credited
      const evmBalance = await this.wallet.publicClient.getBalance({
        address: this.wallet.address,
      });
      const evmCredited = evmBalance > 0n;

      // Step 5: Determine stage and suggestion
      let stage: BridgeStage;
      let stageDescription: string;
      let suggestion: string;

      if (!btcTx.status.confirmed) {
        stage = 'pending';
        stageDescription = 'BTC transaction pending confirmation';
        suggestion = 'Wait for BTC transaction to be mined (usually 1-2 minutes on regtest)';
      } else if (confirmations < 1) {
        stage = 'btc_confirmed';
        stageDescription = 'BTC confirmed, waiting for validators';
        suggestion = 'Validators will detect the deposit and process it (1-5 minutes)';
      } else if (!evmCredited) {
        stage = 'validators_processing';
        stageDescription = `BTC confirmed (${confirmations} confirmations), validators processing`;
        suggestion =
          'Validators are signing the EVM transaction. Check Executor contract for events. ' +
          'If stuck for >10 minutes, the validator set may be inactive on staging.';
      } else {
        stage = 'evm_credited';
        stageDescription = 'Bridge complete! EVM balance credited';
        suggestion = 'Your BTC is now available on the EVM layer. You can deploy contracts or transfer.';
      }

      return success({
        btcTxId: input.btcTxId,
        stage,
        stageDescription,
        btcConfirmations: confirmations,
        btcBlockHeight: btcTx.status.block_height || null,
        evmCredited,
        suggestion,
        links: {
          btcTx: `${networkConfig.mempoolUrl}/tx/${input.btcTxId}`,
          tssAddress: `${networkConfig.mempoolUrl}/address/${tssAddress}`,
          executorContract: `${networkConfig.explorerUrl}/address/0x0000000000000000000000000000000000001003`,
          evmAddress: `${networkConfig.explorerUrl}/address/${this.wallet.address}`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Failed to get bridge status: ${message}`);
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get bridge status: ${message}`);
    }
  }
}
