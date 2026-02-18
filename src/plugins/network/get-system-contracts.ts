/**
 * Tool: midl_get_system_contracts
 * Returns all MIDL system contract addresses
 */

import { z } from 'zod';
import { SystemContracts } from '@midl/executor';
import { ToolBase, type ToolConfig } from '../base/tool-base.js';
import { type ToolResponse, success } from '../../types.js';

const schema = z.object({}).strict();

type Input = z.infer<typeof schema>;

/** System contract info with address and description */
interface SystemContractInfo {
  name: string;
  address: string;
  description: string;
}

type Output = SystemContractInfo[];

const CONTRACT_DESCRIPTIONS: Record<keyof typeof SystemContracts, string> = {
  ValidatorRegistry: 'Registry of active validators in the network',
  Staking: 'Manages validator staking and delegation',
  MidlToken: 'Native MIDL token contract',
  Executor: 'Main executor contract for Bitcoin-EVM bridge',
  ExecutorL2: 'L2 executor for cross-chain transactions',
  SynthReservoir: 'Synthetic asset reservoir',
  GlobalParams: 'Network-wide configuration parameters',
  FeesDistributor: 'Fee distribution to validators',
  RuneImplementation: 'ERC20 implementation for bridged Runes',
  Treasury: 'Protocol treasury',
  Multicall3: 'Batch multiple read calls in one request',
};

const config: ToolConfig = {
  name: 'get_system_contracts',
  description:
    'Get all MIDL system contract addresses. These are predeployed contracts for core protocol functionality like bridging, staking, and runes.',
  schema,
  readOnly: true,
  destructive: false,
};

export class GetSystemContractsTool extends ToolBase<Input, Output> {
  constructor() {
    super(config);
  }

  async execute(_input: Input): Promise<ToolResponse<Output>> {
    const contracts: SystemContractInfo[] = Object.entries(SystemContracts).map(
      ([name, address]) => ({
        name,
        address,
        description: CONTRACT_DESCRIPTIONS[name as keyof typeof SystemContracts],
      })
    );

    return success(contracts);
  }
}
