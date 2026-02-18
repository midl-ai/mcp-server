/**
 * Deploy Plugin - contract deployment
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { DeployContractTool } from './deploy-contract.js';

export class DeployPlugin extends PluginBase {
  readonly name = 'deploy';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new DeployContractTool(wallet));
  }
}
