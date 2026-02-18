/**
 * Bitcoin Plugin - UTXOs, transactions, fee rates
 */

import { PluginBase } from '../base/plugin-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { GetUtxosTool } from './get-utxos.js';
import { GetTransactionTool } from './get-transaction.js';
import { GetTransactionReceiptTool } from './get-transaction-receipt.js';
import { GetFeeRateTool } from './get-fee-rate.js';

export class BitcoinPlugin extends PluginBase {
  readonly name = 'bitcoin';

  constructor(wallet: MidlWalletClient) {
    super();
    this.registerTool(new GetUtxosTool(wallet));
    this.registerTool(new GetTransactionTool(wallet));
    this.registerTool(new GetTransactionReceiptTool(wallet));
    this.registerTool(new GetFeeRateTool(wallet));
  }
}
