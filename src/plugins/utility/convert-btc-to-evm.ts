/**
 * Tool: midl_convert_btc_to_evm
 * Derive EVM address from Bitcoin public key
 */

import { z } from 'zod';
import { getAddress, keccak256, toHex } from 'viem';
import { hexToBytes } from '@noble/hashes/utils';
import { Point } from '@noble/secp256k1';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('convert-btc-to-evm');

const schema = z.object({
  publicKey: z
    .string()
    .regex(/^(0x)?[a-fA-F0-9]{66}$|^(0x)?[a-fA-F0-9]{130}$/, 'Invalid public key (33 or 65 bytes hex)')
    .describe('Bitcoin public key (compressed 33 bytes or uncompressed 65 bytes, hex)'),
});

type Input = z.infer<typeof schema>;

interface ConvertResult {
  publicKey: string;
  evmAddress: string;
}

const config: ToolConfig = {
  name: 'convert_btc_to_evm',
  description:
    'Derive EVM address from Bitcoin public key (compressed 33-byte or uncompressed 65-byte hex). ' +
    'In MIDL, each BTC key deterministically maps to one EVM address via keccak256.',
  schema,
  readOnly: true,
  destructive: false,
};

/** Derive EVM address from Bitcoin public key */
function deriveEvmAddress(publicKeyHex: string): `0x${string}` {
  // Normalize to remove 0x prefix if present
  const cleanHex = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;
  let pk = hexToBytes(cleanHex);

  // If compressed (33 bytes), decompress to uncompressed (65 bytes)
  if (pk.length === 33) {
    pk = Point.fromHex(pk).toRawBytes(false);
  }

  // Remove the 0x04 prefix (uncompressed point marker) to get 64 bytes
  const publicKeyNoPrefix = pk.slice(1);

  // keccak256 of the 64-byte public key, take last 20 bytes
  const hash = keccak256(toHex(publicKeyNoPrefix));
  const addressBytes = hexToBytes(hash.slice(2)).slice(-20);

  return getAddress(toHex(addressBytes));
}

export class ConvertBtcToEvmTool extends ToolBase<Input, ConvertResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<ConvertResult>> {
    try {
      const evmAddress = deriveEvmAddress(input.publicKey);

      return success({
        publicKey: input.publicKey,
        evmAddress,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Address derivation failed: ${message}`);
      return error(ErrorCode.INVALID_ADDRESS, `Failed to derive EVM address: ${message}`);
    }
  }
}
