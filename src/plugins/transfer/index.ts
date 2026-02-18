/**
 * Transfer Plugin - EVM transfers, token transfers, raw tx
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { TransferEvmTool } from './transfer-evm.js';
import { TransferTokenTool } from './transfer-token.js';
import { SendRawTransactionTool } from './send-raw-transaction.js';

export class TransferPlugin extends PluginBase {
  readonly name = 'transfer';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new TransferEvmTool(wallet));
    this.registerTool(new TransferTokenTool(wallet));
    this.registerTool(new SendRawTransactionTool(wallet));
  }
}
