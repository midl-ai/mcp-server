/**
 * Base class for tool plugins
 * Groups related tools together (e.g., NetworkPlugin, BalancePlugin)
 */

import type { ToolBase } from './tool-base.js';
import type { ToolMetadata, ToolResponse } from '../../types.js';

export abstract class PluginBase {
  /** Plugin name for logging/debugging */
  abstract readonly name: string;

  /** All tools in this plugin */
  protected tools: Map<string, ToolBase<unknown, unknown>> = new Map();

  /**
   * Register a tool with this plugin
   */
  protected registerTool(tool: ToolBase<unknown, unknown>): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get all tool metadata for MCP registration
   */
  getToolMetadata(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((tool) => tool.getMetadata());
  }

  /**
   * Get all tool names in this plugin
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    toolName: string,
    input: unknown
  ): Promise<ToolResponse<unknown> | null> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return null;
    }
    return tool.run(input);
  }

  /**
   * Check if this plugin handles a tool
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }
}
