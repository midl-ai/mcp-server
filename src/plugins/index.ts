/**
 * Plugin Registry - registers all tools with the MCP server
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MidlWalletClient } from '../wallet.js';
import type { PluginBase } from './base/plugin-base.js';
import { createLogger } from '../logger.js';
import { NetworkPlugin } from './network/index.js';
import { BalancePlugin } from './balance/index.js';
import { ContractPlugin } from './contract/index.js';
import { formatToolResult } from './response-formatter.js';

const log = createLogger('plugin-registry');

/** All available plugins */
function createPlugins(wallet: MidlWalletClient): PluginBase[] {
  return [
    new NetworkPlugin(wallet),
    new BalancePlugin(wallet),
    new ContractPlugin(wallet),
  ];
}

/** Register all plugins with the MCP server */
export function registerAllPlugins(server: McpServer, wallet: MidlWalletClient): void {
  const plugins = createPlugins(wallet);
  const explorerUrl = wallet.getNetworkInfo().explorerUrl;
  let totalTools = 0;

  for (const plugin of plugins) {
    for (const tool of plugin.getToolMetadata()) {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.schema,
          annotations: tool.annotations,
        },
        async (args) => {
          const result = await plugin.executeTool(tool.name, args);
          return formatToolResult(tool.name, result, explorerUrl);
        }
      );
      totalTools++;
    }

    log.info(`Registered plugin: ${plugin.name}`);
  }

  log.info(`Total tools registered: ${totalTools}`);
}
