/**
 * Runes Plugin - Rune queries and operations
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { GetRunesTool } from './get-runes.js';
import { GetRuneBalanceTool } from './get-rune-balance.js';
import { TransferRuneTool } from './transfer-rune.js';
import { BridgeRuneToErc20Tool } from './bridge-rune-to-erc20.js';
import { BridgeErc20ToRuneTool } from './bridge-erc20-to-rune.js';

export class RunesPlugin extends PluginBase {
  readonly name = 'runes';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new GetRunesTool(wallet));
    this.registerTool(new GetRuneBalanceTool(wallet));
    this.registerTool(new TransferRuneTool(wallet));
    this.registerTool(new BridgeRuneToErc20Tool(wallet));
    this.registerTool(new BridgeErc20ToRuneTool(wallet));
  }
}
