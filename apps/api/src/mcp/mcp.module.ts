import { Module } from '@nestjs/common';
import { MCPService } from './mcp.service';

/**
 * McpModule exposes the MCPService so that feature modules
 * can interact with the Python FastMCP server.
 */
@Module({
  providers: [MCPService],
  exports: [MCPService]
})
export class McpModule { }
