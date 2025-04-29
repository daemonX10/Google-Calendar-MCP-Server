/**
 * Type definitions for MCP server
 */

// Tool definition interfaces
export interface ToolParameterDefinition {
  type: string;
  description?: string;
  items?: {
    type: string;
  };
}

export interface ToolDefinition {
  description: string;
  parameters: Record<string, ToolParameterDefinition>;
}

// Request context interface
export interface RequestContext {
  request: {
    name: string;
    parameters: any;
  };
  session?: {
    send_log_message?: (level: string, data: string) => void;
  };
}

// Tool response interfaces
export interface ToolResponseValue {
  value: any;
}

export interface ToolResponseError {
  error: {
    message: string;
    code: string;
  };
}

export type ToolResponse = ToolResponseValue | ToolResponseError;

// Tools interface
export interface Tools {
  [key: string]: any;
}