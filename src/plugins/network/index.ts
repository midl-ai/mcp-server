/**
 * Network Plugin - network info, system contracts, and blocks
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { GetNetworkInfoTool } from './get-network-info.js';
import { GetSystemContractsTool } from './get-system-contracts.js';
import { GetBlockTool } from './get-block.js';

export class NetworkPlugin extends PluginBase {
  readonly name = 'network';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new GetNetworkInfoTool(wallet));
    this.registerTool(new GetSystemContractsTool());
    this.registerTool(new GetBlockTool(wallet));
  }
}
