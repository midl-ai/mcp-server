/**
 * Wallet Address Utilities
 * Smart defaults for address parameters based on operation type
 */

import { createBtcWalletFromEnv, type MidlBtcWalletClient } from '../btc-wallet.js';
import type { MidlWalletClient } from '../wallet.js';

/** Cached BTC wallet instance (lazy initialized) */
let btcWalletInstance: MidlBtcWalletClient | null = null;

/** Get or create the BTC wallet instance */
async function getBtcWallet(): Promise<MidlBtcWalletClient> {
  if (!btcWalletInstance) {
    btcWalletInstance = createBtcWalletFromEnv();
    await btcWalletInstance.connect();
  }
  return btcWalletInstance;
}

/** Get the EVM address from the wallet */
export function getEvmAddress(wallet: MidlWalletClient): string {
  return wallet.address;
}

/** Get the BTC payment address (for transfers, bridging) */
export async function getBtcPaymentAddress(): Promise<string> {
  const btcWallet = await getBtcWallet();
  if (!btcWallet.paymentAddress) {
    throw new Error('BTC wallet not connected - payment address unavailable');
  }
  return btcWallet.paymentAddress;
}

/** Get the BTC ordinals address (for runes, inscriptions) */
export async function getBtcOrdinalsAddress(): Promise<string> {
  const btcWallet = await getBtcWallet();
  if (!btcWallet.ordinalsAddress) {
    throw new Error('BTC wallet not connected - ordinals address unavailable');
  }
  return btcWallet.ordinalsAddress;
}

/** Address type based on operation */
export type AddressType = 'evm' | 'btc-payment' | 'btc-ordinals';

/** Get the appropriate address for an operation type */
export async function getDefaultAddress(
  wallet: MidlWalletClient,
  type: AddressType
): Promise<string> {
  switch (type) {
    case 'evm':
      return getEvmAddress(wallet);
    case 'btc-payment':
      return getBtcPaymentAddress();
    case 'btc-ordinals':
      return getBtcOrdinalsAddress();
  }
}

/** Resolve address - use provided or fall back to default */
export async function resolveAddress(
  wallet: MidlWalletClient,
  provided: string | undefined,
  defaultType: AddressType
): Promise<string> {
  if (provided) {
    return provided;
  }
  return getDefaultAddress(wallet, defaultType);
}
