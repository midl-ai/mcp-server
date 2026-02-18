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

// Shared wallet instance (created once at startup)
let sharedWallet: MidlWalletClient;

/** Create a new MCP server instance with all plugins registered */
function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
  registerAllPlugins(server, sharedWallet);
  return server;
}

/** Initialize and start the MCP server */
async function main(): Promise<void> {
  // Validate environment and create wallet (once)
  try {
    sharedWallet = createWalletFromEnv();
    log.info(`Wallet initialized: ${sharedWallet.address}`);
  } catch (err) {
    log.error('Failed to initialize wallet', err);
    process.exit(1);
  }

  // Start with configured transport
  const transport = getTransportMode();

  if (transport === 'stdio') {
    // Stdio: single server instance
    const server = createServer();
    await startStdio(server);
  } else {
    // HTTP: server created per request
    await startHttp();
  }
}

/** Start server with stdio transport (for Claude Desktop/Cursor) */
async function startStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info('Running on stdio transport');
}

/** Start server with HTTP transport (for web/remote clients) */
async function startHttp(): Promise<void> {
  const port = getHttpPort();

  // Dynamic import to avoid loading express for stdio mode
  const { default: express } = await import('express');
  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );

  const app = express();
  app.use(express.json());

  // Stateless mode: create new server + transport per request
  app.post('/mcp', async (req, res) => {
    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      await server.close();
    } catch (err) {
      log.error('MCP request failed', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.get('/mcp', async (req, res) => {
    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
      await server.close();
    } catch (err) {
      log.error('MCP request failed', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: SERVER_NAME, version: SERVER_VERSION });
  });

  // Start HTTP server
  const httpServer = app.listen(port, () => {
    log.info(`Running on http://localhost:${port}`);
  });

  // Keep process alive with interval (cleared on shutdown)
  const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

  // Graceful shutdown
  const shutdown = () => {
    clearInterval(keepAlive);
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Wait for server close
  await new Promise<void>((resolve) => httpServer.on('close', resolve));
}

// Run
main().catch((err) => {
  log.error('Fatal error', err);
  process.exit(1);
});
