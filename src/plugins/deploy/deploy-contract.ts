/**
 * Tool: midl_deploy_contract
 * Deploy smart contracts using built-in templates (ERC20, Counter, etc.)
 * No Solidity knowledge required - just provide template name and parameters
 */

import { z } from 'zod';
import solc from 'solc';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import type { MidlWalletClient } from '../../wallet.js';
import { type ToolResponse, type DeployResult, success, error, ErrorCode } from '../../types.js';
import { createLogger } from '../../logger.js';
import { generateFromTemplate, getTemplateNames } from './templates.js';

const log = createLogger('deploy-contract');

const templateList = getTemplateNames().join(', ');

const schema = z.object({
  template: z
    .string()
    .describe(`Contract template to deploy. Available: ${templateList}`),
  name: z.string().optional().describe('Token/contract name (for ERC20 template)'),
  symbol: z.string().optional().describe('Token symbol (for ERC20 template)'),
  initialSupply: z.string().optional().describe('Initial token supply (for ERC20 template)'),
});

type Input = z.infer<typeof schema>;

const config: ToolConfig = {
  name: 'deploy_contract',
  description:
    `Deploy a smart contract using built-in templates. No Solidity code needed. ` +
    `Available templates: ${templateList}. ` +
    `For ERC20: provide name, symbol, and initialSupply. ` +
    `For counter/storage: just provide the template name.`,
  schema,
  readOnly: false,
  destructive: true,
};

/** Compile Solidity source code using solc */
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
      // Generate source from template
      log.info(`Generating contract from template: ${input.template}`);
      const { source, contractName } = generateFromTemplate(input.template, {
        name: input.name,
        symbol: input.symbol,
        initialSupply: input.initialSupply,
      });

      // Compile
      log.info(`Compiling contract: ${contractName}`);
      const { abi, bytecode } = compileSolidity(source, contractName);

      // Deploy
      log.info('Deploying contract...');
      const result = await this.wallet.deployContract(
        abi as readonly unknown[],
        bytecode as `0x${string}`,
        [] // Templates use parameterless constructors with hardcoded values
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
        abi,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error(`Contract deployment failed: ${message}`);
      return error(ErrorCode.TX_REVERTED, `Deployment failed: ${message}`);
    }
  }
}
