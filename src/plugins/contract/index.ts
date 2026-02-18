/**
 * Contract Plugin - read, write, logs, verify
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { ReadContractTool } from './read-contract.js';
import { WriteContractTool } from './write-contract.js';
import { GetLogsTool } from './get-logs.js';
import { VerifyContractTool } from './verify-contract.js';

export class ContractPlugin extends PluginBase {
  readonly name = 'contract';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new ReadContractTool(wallet));
    this.registerTool(new WriteContractTool(wallet));
    this.registerTool(new GetLogsTool(wallet));
    this.registerTool(new VerifyContractTool(wallet));
  }
}
