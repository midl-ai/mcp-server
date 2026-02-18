/**
 * Balance Plugin - EVM, BTC, and token balance queries
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { GetEvmBalanceTool } from './get-evm-balance.js';
import { GetBtcBalanceTool } from './get-btc-balance.js';
import { GetTokenBalanceTool } from './get-token-balance.js';

export class BalancePlugin extends PluginBase {
  readonly name = 'balance';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new GetEvmBalanceTool(wallet));
    this.registerTool(new GetBtcBalanceTool(wallet));
    this.registerTool(new GetTokenBalanceTool(wallet));
  }
}
