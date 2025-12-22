import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_BUFFER_BYTES = 10 * 1024 * 1024;

export interface McpToolRequest<TPayload extends Record<string, unknown>> {
  readonly toolName: string;
  readonly payload: TPayload;
}

/**
 * MCPService shells out to the Python FastMCP helper so Nest modules can use the MCP tools.
 */
@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);
  private readonly pythonExecutable = process.env.MCP_PYTHON_BIN ?? join(process.cwd(), '..', 'mcp-server', 'venv', 'bin', 'python3');
  private readonly scriptPath = process.env.MCP_SCRIPT_PATH ?? join(process.cwd(), '..', 'mcp-server', 'run_tool.py');
  private readonly timeoutMs = Number(process.env.MCP_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  private readonly maxBuffer = Number(process.env.MCP_MAX_BUFFER ?? DEFAULT_BUFFER_BYTES);

  /**
   * Execute a FastMCP tool and return the parsed JSON payload.
   * @param request tool name and payload to send to the MCP server.
   * @returns parsed JSON result from the tool.
   */
  public async executeTool<TResponse, TPayload extends Record<string, unknown>>(request: McpToolRequest<TPayload>): Promise<TResponse> {
    const args = [this.scriptPath, request.toolName, JSON.stringify(request.payload)];
    this.logger.debug(`Invoking MCP tool: ${request.toolName}`);
    const rawOutput = await this.runCommand(args);
    return this.parseResponse<TResponse>(rawOutput);
  }

  private async runCommand(args: string[]): Promise<string> {
    try {
      const { stdout, stderr } = await execFileAsync(this.pythonExecutable, args, {
        cwd: process.cwd(),
        env: process.env,
        timeout: this.timeoutMs,
        maxBuffer: this.maxBuffer
      });
      if (stderr) {
        this.logger.debug(`MCP stderr: ${stderr}`);
      }
      return stdout.trim();
    } catch (error) {
      this.logger.error(`MCP invocation failed: ${error}`);
      throw error;
    }
  }

  private parseResponse<TResponse>(stdout: string): TResponse {
    if (!stdout) {
      throw new Error('MCP tool returned empty output');
    }
    try {
      return JSON.parse(stdout) as TResponse;
    } catch (error) {
      this.logger.error(`Failed to parse MCP response: ${error}`);
      throw error;
    }
  }
}
