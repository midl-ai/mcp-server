/**
 * Tool: midl_deploy_contract
 * Deploy smart contracts using MIDL intention flow:
 * 1. Built-in templates (ERC20, Counter) - recommended for most users
 * 2. Custom Solidity source code - for advanced users
 * 3. Pre-compiled ABI + bytecode - for maximum flexibility
 */

import { z } from 'zod';
import solc from 'solc';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, type DeployResult, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { generateFromTemplate, getTemplateNames } from './templates.js';
import { createBtcWalletFromEnv } from '../../btc-wallet.js';
import { getNetworkConfig } from '../../config.js';

const log = createLogger('deploy-contract');

const templateList = getTemplateNames().join(', ');

const schema = z
  .object({
    // Option 1: Template-based (recommended)
    template: z.string().optional().describe(`Template name: ${templateList}`),
    name: z.string().optional().describe('Token name (for ERC20)'),
    symbol: z.string().optional().describe('Token symbol (for ERC20)'),
    initialSupply: z.string().optional().describe('Initial supply (for ERC20)'),
    // Option 2: Custom Solidity source
    source: z.string().optional().describe('Solidity source code'),
    contractName: z.string().optional().describe('Contract name in source'),
    // Option 3: Pre-compiled
    abi: z.array(z.unknown()).optional().describe('Pre-compiled ABI'),
    bytecode: z.string().optional().describe('Pre-compiled bytecode (0x...)'),
    // Common
    constructorArgs: z.array(z.unknown()).default([]).describe('Constructor arguments'),
  })
  .refine(
    (d) => d.template || (d.source && d.contractName) || (d.abi && d.bytecode),
    { message: 'Provide template, source+contractName, or abi+bytecode' }
  );

type Input = z.infer<typeof schema>;

const config: ToolConfig = {
  name: 'deploy_contract',
  description:
    `Deploy a smart contract. Three options:\n` +
    `1. Template (easiest): template="erc20" + name, symbol, initialSupply\n` +
    `2. Source code: source="pragma solidity..." + contractName\n` +
    `3. Pre-compiled: abi + bytecode\n` +
    `Templates: ${templateList}`,
  schema,
  readOnly: false,
  destructive: true,
};

/** Compile Solidity source code */
function compileSolidity(
  sourceCode: string,
  contractName: string
): { abi: unknown[]; bytecode: string } {
  const input = {
    language: 'Solidity',
    sources: { 'contract.sol': { content: sourceCode } },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((e: { severity: string }) => e.severity === 'error') ?? [];

  if (errors.length > 0) {
    const msgs = errors.map((e: { formattedMessage: string }) => e.formattedMessage).join('\n');
    throw new Error(`Compilation failed:\n${msgs}`);
  }

  const contract = output.contracts?.['contract.sol']?.[contractName];
  if (!contract) {
    const available = Object.keys(output.contracts?.['contract.sol'] ?? {}).join(', ');
    throw new Error(`Contract "${contractName}" not found. Available: ${available}`);
  }

  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
  };
}

export class DeployContractTool extends ToolBase<Input, DeployResult> {
  private readonly wallet: MidlWalletClient;

  constructor(wallet: MidlWalletClient) {
    super(config);
    this.wallet = wallet;
  }

  async execute(input: Input): Promise<ToolResponse<DeployResult>> {
    try {
      let abi: unknown[];
      let bytecode: string;
      let args = input.constructorArgs;

      // Option 1: Template
      if (input.template) {
        log.info(`Using template: ${input.template}`);
        const { source, contractName } = generateFromTemplate(input.template, {
          name: input.name,
          symbol: input.symbol,
          initialSupply: input.initialSupply,
        });
        const compiled = compileSolidity(source, contractName);
        abi = compiled.abi;
        bytecode = compiled.bytecode;
        args = []; // Templates have hardcoded constructor values
      }
      // Option 2: Custom source
      else if (input.source && input.contractName) {
        log.info(`Compiling custom source: ${input.contractName}`);
        const compiled = compileSolidity(input.source, input.contractName);
        abi = compiled.abi;
        bytecode = compiled.bytecode;
      }
      // Option 3: Pre-compiled
      else if (input.abi && input.bytecode) {
        log.info('Using pre-compiled ABI and bytecode');
        abi = input.abi;
        bytecode = input.bytecode;
      } else {
        return error(ErrorCode.INVALID_ABI, 'Provide template, source+contractName, or abi+bytecode');
      }

      log.info('Deploying contract via MIDL intention flow...');

      // Use BTC wallet for intention-based deployment
      const btcWallet = createBtcWalletFromEnv();
      await btcWallet.connect();

      const result = await btcWallet.deployContract(
        abi as readonly unknown[],
        bytecode as `0x${string}`,
        args as readonly unknown[]
      );

      const networkConfig = getNetworkConfig();

      return success({
        contractAddress: result.contractAddress,
        transactionHash: result.evmTxHash,
        blockNumber: 0, // Not immediately available with intention flow
        status: 'pending_confirmation',
        gasUsed: 'pending',
        explorerUrl: `${networkConfig.explorerUrl}/address/${result.contractAddress}`,
        abi,
        btcTxId: result.btcTxId,
        btcExplorerUrl: `${networkConfig.mempoolUrl}/tx/${result.btcTxId}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Deployment failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `Deployment failed: ${message}`);
    }
  }
}
