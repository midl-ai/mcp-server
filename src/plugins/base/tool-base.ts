/**
 * Base class for all MCP tools
 * Each tool extends this and implements execute()
 */

import type { z } from 'zod';
import type { ToolMetadata, ToolResponse } from '../../types.js';
import { TOOL_PREFIX } from '../../config.js';

export interface ToolConfig {
  /** Tool name without prefix (e.g., 'get_network_info') */
  name: string;
  /** Human-readable description for AI context */
  description: string;
  /** Zod schema for input validation */
  schema: z.ZodType;
  /** Is this a read-only operation? */
  readOnly: boolean;
  /** Could this operation be destructive? */
  destructive?: boolean;
}

export abstract class ToolBase<TInput, TOutput> {
  readonly name: string;
  readonly description: string;
  readonly schema: z.ZodType;
  readonly readOnly: boolean;
  readonly destructive: boolean;

  constructor(config: ToolConfig) {
    this.name = `${TOOL_PREFIX}${config.name}`;
    this.description = config.description;
    this.schema = config.schema;
    this.readOnly = config.readOnly;
    this.destructive = config.destructive ?? false;
  }

  /**
   * Get tool metadata for MCP registration
   */
  getMetadata(): ToolMetadata {
    return {
      name: this.name,
      description: this.description,
      schema: this.schema,
      annotations: {
        readOnlyHint: this.readOnly,
        destructiveHint: this.destructive,
      },
    };
  }

  /**
   * Execute the tool with validated input
   * Subclasses must implement this
   */
  abstract execute(input: TInput): Promise<ToolResponse<TOutput>>;

  /**
   * Safe execution wrapper - validates input and catches errors
   */
  async run(rawInput: unknown): Promise<ToolResponse<TOutput>> {
    try {
      const parseResult = this.schema.safeParse(rawInput);

      if (!parseResult.success) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `Invalid input: ${parseResult.error.message}`,
            details: { issues: parseResult.error.issues },
          },
        };
      }

      return await this.execute(parseResult.data as TInput);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `Tool execution failed: ${message}`,
        },
      };
    }
  }
}
