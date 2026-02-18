/**
 * MIDL Wallet Client - handles blockchain interactions
 * Server-side signing via MIDL_PRIVATE_KEY environment variable
 */

import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getNetworkConfig } from './config.js';
import { error, ErrorCode, type ToolResponse, type BalanceInfo, type TxReceipt } from './types.js';

export class MidlWalletClient {
  public readonly address: `0x${string}`;
  public readonly account: ReturnType<typeof privateKeyToAccount>;
  public readonly walletClient: ReturnType<typeof createWalletClient>;
  public readonly publicClient: ReturnType<typeof createPublicClient>;
  private readonly networkConfig: ReturnType<typeof getNetworkConfig>;

  constructor(privateKey: `0x${string}`) {
    this.account = privateKeyToAccount(privateKey);
    this.address = this.account.address;
    this.networkConfig = getNetworkConfig();

    // Use chain definition from SDK via config
    const { chain, rpcUrl } = this.networkConfig;

    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(rpcUrl),
    });

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  /** Get current block number */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  /** Get EVM balance for an address */
  async getBalance(address: `0x${string}`): Promise<ToolResponse<BalanceInfo>> {
    try {
      const balance = await this.publicClient.getBalance({ address });
      const blockNumber = await this.getBlockNumber();

      return {
        success: true,
        data: {
          address,
          balance: balance.toString(),
          balanceFormatted: `${formatEther(balance)} BTC`,
          network: this.networkConfig.name,
          blockNumber: Number(blockNumber),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return error(ErrorCode.RPC_CONNECTION_FAILED, `Failed to get balance: ${message}`);
    }
  }

  /** Send native BTC on EVM layer */
  async sendTransaction(
    to: `0x${string}`,
    value: bigint
  ): Promise<ToolResponse<TxReceipt>> {
    try {
      const hash = await this.walletClient.sendTransaction({
        account: this.account,
        to,
        value,
        chain: this.networkConfig.chain,
      });
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        data: {
          transactionHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          status: receipt.status === 'success' ? 'success' : 'reverted',
          gasUsed: receipt.gasUsed.toString(),
          explorerUrl: `${this.networkConfig.explorerUrl}/tx/${receipt.transactionHash}`,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('insufficient funds')) {
        return error(ErrorCode.INSUFFICIENT_FUNDS, message);
      }
      return error(ErrorCode.TX_REVERTED, `Transaction failed: ${message}`);
    }
  }

  /** Read from a contract */
  async readContract<T>(
    address: `0x${string}`,
    abi: readonly unknown[],
    functionName: string,
    args: readonly unknown[] = []
  ): Promise<ToolResponse<T>> {
    try {
      const result = await this.publicClient.readContract({
        address,
        abi,
        functionName,
        args,
      });
      return { success: true, data: result as T };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return error(ErrorCode.CONTRACT_NOT_FOUND, `Contract read failed: ${message}`);
    }
  }

  /** Write to a contract */
  async writeContract(
    address: `0x${string}`,
    abi: readonly unknown[],
    functionName: string,
    args: readonly unknown[] = []
  ): Promise<ToolResponse<TxReceipt>> {
    try {
      const hash = await this.walletClient.writeContract({
        account: this.account,
        chain: this.networkConfig.chain,
        address,
        abi,
        functionName,
        args,
      });
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        data: {
          transactionHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          status: receipt.status === 'success' ? 'success' : 'reverted',
          gasUsed: receipt.gasUsed.toString(),
          explorerUrl: `${this.networkConfig.explorerUrl}/tx/${receipt.transactionHash}`,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return error(ErrorCode.TX_REVERTED, `Contract write failed: ${message}`);
    }
  }

  /** Deploy a contract */
  async deployContract(
    abi: readonly unknown[],
    bytecode: `0x${string}`,
    args: readonly unknown[] = []
  ): Promise<ToolResponse<{ contractAddress: string } & TxReceipt>> {
    try {
      const hash = await this.walletClient.deployContract({
        account: this.account,
        chain: this.networkConfig.chain,
        abi,
        bytecode,
        args,
      });
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      if (!receipt.contractAddress) {
        return error(ErrorCode.TX_REVERTED, 'Contract deployment failed: no address returned');
      }

      return {
        success: true,
        data: {
          contractAddress: receipt.contractAddress,
          transactionHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          status: receipt.status === 'success' ? 'success' : 'reverted',
          gasUsed: receipt.gasUsed.toString(),
          explorerUrl: `${this.networkConfig.explorerUrl}/address/${receipt.contractAddress}`,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return error(ErrorCode.TX_REVERTED, `Contract deployment failed: ${message}`);
    }
  }

  /** Get network info */
  getNetworkInfo(): ReturnType<typeof getNetworkConfig> {
    return this.networkConfig;
  }
}

/**
 * Create wallet client from environment variable
 * Throws if MIDL_PRIVATE_KEY is missing or invalid
 */
export function createWalletFromEnv(): MidlWalletClient {
  const privateKey = process.env.MIDL_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('MIDL_PRIVATE_KEY environment variable is required');
  }

  // Ensure 0x prefix
  const normalizedKey = privateKey.startsWith('0x')
    ? (privateKey as `0x${string}`)
    : (`0x${privateKey}` as `0x${string}`);

  // Validate hex format (64 chars after 0x)
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedKey)) {
    throw new Error('MIDL_PRIVATE_KEY must be a 64-character hex string');
  }

  return new MidlWalletClient(normalizedKey);
}
