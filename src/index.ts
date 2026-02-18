/**
 * MIDL MCP Server - Entry point
 * Dual transport: stdio (Claude Desktop/Cursor) + HTTP (integrations)
 */

import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getTransportMode, getHttpPort } from './config.js';
import { createWalletFromEnv, MidlWalletClient } from './wallet.js';
import { registerAllPlugins } from './plugins/index.js';
import { createLogger } from './logger.js';

const SERVER_NAME = 'midl-mcp-server';
const SERVER_VERSION = '1.0.0';

const log = createLogger(SERVER_NAME);

/** Initialize and start the MCP server */
async function main(): Promise<void> {
  // Validate environment and create wallet
  let wallet: MidlWalletClient;
  try {
    wallet = createWalletFromEnv();
    log.info(`Wallet initialized: ${wallet.address}`);
  } catch (err) {
    log.error('Failed to initialize wallet', err);
    process.exit(1);
  }

  // Create MCP server
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register all plugins
  registerAllPlugins(server, wallet);

  // Start with configured transport
  const transport = getTransportMode();

  if (transport === 'stdio') {
    await startStdio(server);
  } else {
    await startHttp(server);
  }
}

/** Start server with stdio transport (for Claude Desktop/Cursor) */
async function startStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info('Running on stdio transport');
}

/** Start server with HTTP transport (for web/remote clients) */
async function startHttp(server: McpServer): Promise<void> {
  const port = getHttpPort();

  // Dynamic import to avoid loading express for stdio mode
  const { default: express } = await import('express');
  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );
  const { randomUUID } = await import('crypto');

  const app = express();
  app.use(express.json());

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  app.post('/mcp', async (req, res) => {
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req, res) => {
    await transport.handleRequest(req, res);
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: SERVER_NAME, version: SERVER_VERSION });
  });

  await server.connect(transport);

  app.listen(port, () => {
    log.info(`Running on http://localhost:${port}`);
  });
}

// Run
main().catch((err) => {
  log.error('Fatal error', err);
  process.exit(1);
});
