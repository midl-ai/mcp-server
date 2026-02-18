/**
 * Tool: midl_get_rune_erc20_address
 * Get the ERC20 contract address for a Rune (CREATE2-derived)
 */

import { z } from 'zod';
import { encodePacked, getContractAddress, keccak256 } from 'viem';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success } from '../../types.js';
import { SystemContracts } from '@midl/executor';

const RUNE_ID_REGEX = /^\d+:\d+$/;

const schema = z.object({
  runeId: z
    .string()
    .regex(RUNE_ID_REGEX, 'Invalid rune ID format. Expected format: blockHeight:txIndex (e.g., "840000:1")')
    .describe('Rune ID in format blockHeight:txIndex (e.g., "840000:1")'),
});

type Input = z.infer<typeof schema>;

interface RuneAddressResult {
  runeId: string;
  erc20Address: string;
  explorerUrl: string;
}

const config: ToolConfig = {
  name: 'get_rune_erc20_address',
  description:
    'Get the ERC20 contract address for a Rune. Each Rune has a deterministic ERC20 address derived via CREATE2.',
  schema,
  readOnly: true,
  destructive: false,
};

/** Convert rune ID string to bytes32 format for salt calculation */
function runeIdToBytes32(runeId: string): `0x${string}` {
  const parts = runeId.split(':');
  const blockHeight = Number(parts[0]);
  const txIndex = Number(parts[1]);
  // Pack as two uint128 values (block height and tx index)
  const blockHex = blockHeight.toString(16).padStart(32, '0');
  const txHex = txIndex.toString(16).padStart(32, '0');
  return `0x${blockHex}${txHex}` as `0x${string}`;
}

/** Derive ERC20 address for a Rune using CREATE2 */
function getCreate2RuneAddress(runeId: string): `0x${string}` {
  const salt = keccak256(encodePacked(['bytes32'], [runeIdToBytes32(runeId)]));
  // Minimal proxy bytecode pointing to RuneImplementation
  const bytecode: `0x${string}` = `0x3d602d80600a3d3981f3363d3d373d3d3d363d73${SystemContracts.RuneImplementation.slice(2)}5af43d82803e903d91602b57fd5bf3`;

  return getContractAddress({
    opcode: 'CREATE2',
    from: SystemContracts.Executor,
    salt,
    bytecode,
  });
}

export class GetRuneErc20AddressTool extends ToolBase<Input, RuneAddressResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<RuneAddressResult>> {
    const erc20Address = getCreate2RuneAddress(input.runeId);
    const networkConfig = this.wallet.getNetworkInfo();

    return success({
      runeId: input.runeId,
      erc20Address,
      explorerUrl: `${networkConfig.explorerUrl}/address/${erc20Address}`,
    });
  }
}
