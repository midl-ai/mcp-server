/**
 * Response Formatter - centralizes MCP response formatting
 * Handles both JSON text and UI card content in one place
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolResponse } from '../types.js';
import { generateUICard } from '../ui/card-generators.js';

/**
 * Format a tool result for MCP response
 * Returns JSON text + optional UI card
 */
export function formatToolResult(
  toolName: string,
  result: ToolResponse<unknown> | null,
  explorerUrl: string
): CallToolResult {
  if (!result) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'Tool not found' }) }],
      isError: true,
    };
  }

  const content: CallToolResult['content'] = [
    { type: 'text', text: JSON.stringify(result, null, 2) },
  ];

  // Add UI card if generator exists for this tool
  const uiCard = generateUICard(toolName, result, explorerUrl);
  if (uiCard) {
    content.push(uiCard as CallToolResult['content'][number]);
  }

  return {
    content,
    isError: !result.success,
  };
}
