/**
 * Tool: midl_deploy_contract
 * Compile and deploy a smart contract from Solidity source or pre-compiled bytecode
 */

import { z } from 'zod';
import solc from 'solc';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, type DeployResult, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';

const log = createLogger('deploy-contract');

const schema = z
  .object({
    source: z.string().optional().describe('Solidity source code'),
    contractName: z.string().optional().describe('Contract name in source (required if source provided)'),
    abi: z.array(z.unknown()).optional().describe('Pre-compiled ABI array'),
    bytecode: z.string().optional().describe('Pre-compiled bytecode (0x...)'),
    constructorArgs: z.array(z.unknown()).default([]).describe('Constructor arguments'),
  })
  .refine(
    (data) => (data.source && data.contractName) || (data.abi && data.bytecode),
    { message: 'Provide either source+contractName or abi+bytecode' }
  );

type Input = z.infer<typeof schema>;

const config: ToolConfig = {
  name: 'deploy_contract',
  description:
    'Deploy a smart contract. Provide Solidity source code and contract name (recommended) ' +
    'OR pre-compiled ABI and bytecode. Returns deployed contract address and explorer link.',
  schema,
  readOnly: false,
  destructive: true,
};

/** Compile Solidity source code using solc */
function compileSolidity(
  sourceCode: string,
  contractName: string
): { abi: unknown[]; bytecode: string; warnings: string[] } {
  const input = {
    language: 'Solidity',
    sources: {
      'contract.sol': { content: sourceCode },
    },
    settings: {
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode'] },
      },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // Check for compilation errors
  const errors =
    output.errors?.filter((e: { severity: string }) => e.severity === 'error') ?? [];
  if (errors.length > 0) {
    const errorMessages = errors
      .map((e: { formattedMessage: string }) => e.formattedMessage)
      .join('\n');
    throw new Error(`Compilation failed:\n${errorMessages}`);
  }

  // Find the contract
  const contracts = output.contracts?.['contract.sol'];
  if (!contracts) {
    throw new Error('No contracts found in source');
  }

  const contract = contracts[contractName];
  if (!contract) {
    const available = Object.keys(contracts).join(', ');
    throw new Error(`Contract "${contractName}" not found. Available: ${available}`);
  }

  const warnings =
    output.errors
      ?.filter((e: { severity: string }) => e.severity === 'warning')
      .map((w: { formattedMessage: string }) => w.formattedMessage) ?? [];

  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
    warnings,
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
      let contractAbi: unknown[];
      let contractBytecode: string;
      let warnings: string[] = [];

      // Compile from source or use pre-compiled
      if (input.source && input.contractName) {
        log.info(`Compiling contract: ${input.contractName}`);
        const compiled = compileSolidity(input.source, input.contractName);
        contractAbi = compiled.abi;
        contractBytecode = compiled.bytecode;
        warnings = compiled.warnings;
        log.info(`Compilation successful, ${warnings.length} warnings`);
      } else if (input.abi && input.bytecode) {
        contractAbi = input.abi;
        contractBytecode = input.bytecode;
      } else {
        return error(
          ErrorCode.INVALID_ABI,
          'Provide either source+contractName or abi+bytecode'
        );
      }

      log.info('Deploying contract...');
      const result = await this.wallet.deployContract(
        contractAbi as readonly unknown[],
        contractBytecode as `0x${string}`,
        input.constructorArgs as readonly unknown[]
      );

      if (!result.success) {
        return result as ToolResponse<never>;
      }

      return success({
        contractAddress: result.data.contractAddress,
        transactionHash: result.data.transactionHash,
        blockNumber: result.data.blockNumber,
        status: result.data.status,
        gasUsed: result.data.gasUsed,
        explorerUrl: result.data.explorerUrl,
        abi: contractAbi,
        warnings,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Contract deployment failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `Contract deployment failed: ${message}`);
    }
  }
}
