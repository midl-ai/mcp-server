/**
 * Bridge Plugin - Bridge status tracking
 * Note: Rune ↔ ERC20 bridging is handled by the Runes plugin
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { GetBridgeStatusTool } from './get-bridge-status.js';

export class BridgePlugin extends PluginBase {
  readonly name = 'bridge';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new GetBridgeStatusTool(wallet));
  }
}
