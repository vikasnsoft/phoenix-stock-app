#!/usr/bin/env python3
"""Utility script to invoke an MCP tool and return JSON output."""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict

from fastmcp import Client


async def _call_tool(tool_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    server_path = str(Path(__file__).resolve().with_name("server.py"))
    async with Client(server_path) as client:
        response = await client.call_tool(tool_name, payload)
        result = response.data if hasattr(response, "data") else response
        if not isinstance(result, dict):
            raise TypeError("Tool result must be a dictionary")
        return result


async def _main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: run_tool.py <tool_name> '<json_payload>'")
    tool_name = sys.argv[1]
    try:
        payload = json.loads(sys.argv[2])
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON payload: {exc}") from exc
    result = await _call_tool(tool_name, payload)
    print(json.dumps(result))


if __name__ == "__main__":
    asyncio.run(_main())
