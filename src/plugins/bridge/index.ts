/**
 * Bridge Plugin - BTC ↔ EVM bridging operations
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { BridgeBtcToEvmTool } from './bridge-btc-to-evm.js';
import { BridgeEvmToBtcTool } from './bridge-evm-to-btc.js';

export class BridgePlugin extends PluginBase {
  readonly name = 'bridge';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new BridgeBtcToEvmTool(wallet));
    this.registerTool(new BridgeEvmToBtcTool(wallet));
  }
}
