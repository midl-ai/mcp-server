/**
 * Built-in Solidity contract templates
 * Users select a template and provide parameters - no Solidity knowledge required
 */

/** Template definition */
export interface ContractTemplate {
  name: string;
  description: string;
  params: Array<{
    name: string;
    type: 'string' | 'number';
    description: string;
    required: boolean;
  }>;
  generate: (params: Record<string, unknown>) => { source: string; contractName: string };
}

/** ERC20 Token template */
const erc20Template: ContractTemplate = {
  name: 'erc20',
  description: 'Standard ERC20 fungible token with name, symbol, and initial supply',
  params: [
    { name: 'name', type: 'string', description: 'Token name (e.g., "BitcoinCoffee")', required: true },
    { name: 'symbol', type: 'string', description: 'Token symbol (e.g., "BCOF")', required: true },
    { name: 'initialSupply', type: 'number', description: 'Initial supply (without decimals)', required: true },
  ],
  generate: (params) => ({
    contractName: 'Token',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Token {
    string public name = "${params.name}";
    string public symbol = "${params.symbol}";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        totalSupply = ${params.initialSupply} * 10**decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}`,
  }),
};

/** Simple Counter template */
const counterTemplate: ContractTemplate = {
  name: 'counter',
  description: 'Simple counter with increment, decrement, and reset functions',
  params: [],
  generate: () => ({
    contractName: 'Counter',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 public count;

    event CountChanged(uint256 newCount);

    function increment() public {
        count++;
        emit CountChanged(count);
    }

    function decrement() public {
        require(count > 0, "Count cannot go below zero");
        count--;
        emit CountChanged(count);
    }

    function reset() public {
        count = 0;
        emit CountChanged(count);
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}`,
  }),
};

/** Storage contract template */
const storageTemplate: ContractTemplate = {
  name: 'storage',
  description: 'Simple key-value storage contract',
  params: [],
  generate: () => ({
    contractName: 'Storage',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Storage {
    mapping(bytes32 => uint256) private data;

    event DataStored(bytes32 indexed key, uint256 value);

    function store(bytes32 key, uint256 value) public {
        data[key] = value;
        emit DataStored(key, value);
    }

    function retrieve(bytes32 key) public view returns (uint256) {
        return data[key];
    }
}`,
  }),
};

/** All available templates */
export const TEMPLATES: Record<string, ContractTemplate> = {
  erc20: erc20Template,
  counter: counterTemplate,
  storage: storageTemplate,
};

/** Get list of available template names */
export function getTemplateNames(): string[] {
  return Object.keys(TEMPLATES);
}

/** Get template by name */
export function getTemplate(name: string): ContractTemplate | undefined {
  return TEMPLATES[name.toLowerCase()];
}

/** Generate contract source from template */
export function generateFromTemplate(
  templateName: string,
  params: Record<string, unknown>
): { source: string; contractName: string } {
  const template = getTemplate(templateName);
  if (!template) {
    throw new Error(`Unknown template: ${templateName}. Available: ${getTemplateNames().join(', ')}`);
  }

  // Validate required params
  for (const param of template.params) {
    if (param.required && params[param.name] === undefined) {
      throw new Error(`Missing required parameter: ${param.name}`);
    }
  }

  return template.generate(params);
}
