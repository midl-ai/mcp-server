/**
 * Centralized logger for MIDL MCP Server
 * Outputs to stderr to keep stdout clean for MCP protocol
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

interface Logger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, err?: unknown) => void;
}

/** Create a logger instance with a specific context */
export function createLogger(context: string): Logger {
  return {
    debug: (message: string) => {
      if (shouldLog('debug')) {
        console.error(formatMessage('debug', context, message));
      }
    },
    info: (message: string) => {
      if (shouldLog('info')) {
        console.error(formatMessage('info', context, message));
      }
    },
    warn: (message: string) => {
      if (shouldLog('warn')) {
        console.error(formatMessage('warn', context, message));
      }
    },
    error: (message: string, err?: unknown) => {
      if (shouldLog('error')) {
        const errorDetail = err instanceof Error ? `: ${err.message}` : '';
        console.error(formatMessage('error', context, `${message}${errorDetail}`));
      }
    },
  };
}

/** Default logger for general use */
export const logger = createLogger('midl-mcp-server');
