/**
 * Utility Plugin - address conversion, gas estimation, rune ERC20 lookup
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { ConvertBtcToEvmTool } from './convert-btc-to-evm.js';
import { GetRuneErc20AddressTool } from './get-rune-erc20-address.js';
import { EstimateGasTool } from './estimate-gas.js';

export class UtilityPlugin extends PluginBase {
  readonly name = 'utility';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new ConvertBtcToEvmTool(wallet));
    this.registerTool(new GetRuneErc20AddressTool(wallet));
    this.registerTool(new EstimateGasTool(wallet));
  }
}
