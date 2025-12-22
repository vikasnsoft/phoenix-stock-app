#!/usr/bin/env python3
"""
test.py - flexible tester for local MCP-style server

Usage:
    python3 test.py            # uses server.py in current directory
    python3 test.py --server path/to/server.py
"""

import argparse
import asyncio
import pprint
from typing import Any, Dict

# Import the Client from your local fastmcp package
# (assumes fastmcp is installable or PYTHONPATH=. when running)
try:
    from fastmcp import Client
except Exception as e:
    raise SystemExit(
        "Failed to import fastmcp.Client. Make sure fastmcp package exists and is importable.\n"
        "If it's local, run: PYTHONPATH=. python3 test.py\n"
        "Or install the project in editable mode: pip install -e .\n\n"
        f"Original import error: {e}"
    ) from e

pp = pprint.PrettyPrinter(indent=2, width=120).pprint


def summarize_dict(d: Dict[str, Any], keys):
    out = {}
    for k in keys:
        if k in d:
            out[k] = d[k]
    return out


async def run_tests(server_path: str):
    async with Client(server_path) as client:
        print("=" * 72)
        print(f"Running tests against server module: {server_path}")
        print("=" * 72)

        # ---- Test 1: fetch_stock_data ----
        print("\n1) fetch_stock_data")
        resp = await client.call_tool(
            "fetch_stock_data",
            {"symbol": "AAPL", "interval": "daily", "outputsize": "compact"},
        )
        print("Raw response:")
        pp(resp)

        # Friendly parsing
        if isinstance(resp, dict):
            common_keys = ("data_points", "count", "latest_price", "last", "close", "price")
            summary = summarize_dict(resp, common_keys)
            if summary:
                print("Summary:")
                pp(summary)
            else:
                # try nested
                if "result" in resp and isinstance(resp["result"], dict):
                    print("Found nested 'result' key; summary of result:")
                    pp(summarize_dict(resp["result"], common_keys))
                else:
                    print("Could not find common keys for fetch_stock_data in the response.")

        # ---- Test 2: get_technical_indicator ----
        print("\n2) get_technical_indicator")
        resp = await client.call_tool(
            "get_technical_indicator",
            {
                "symbol": "AAPL",
                "indicator": "RSI",
                "interval": "daily",
                "time_period": 14,
            },
        )
        print("Raw response:")
        pp(resp)

        # Basic parse
        if isinstance(resp, dict):
            for k in ("latest_value", "value", "last", "result"):
                if k in resp:
                    print(f"Found key '{k}':")
                    pp(resp[k])
                    break

        # ---- Test 3: scan_stocks ----
        print("\n3) scan_stocks")
        resp = await client.call_tool(
            "scan_stocks",
            {
                "symbols": ["AAPL", "GOOGL", "MSFT", "TSLA"],
                "filters": [
                    {
                        "type": "indicator",
                        "field": "RSI",
                        "operator": "gt",
                        "value": 50,
                        "time_period": 14,
                    }
                ],
                "filter_logic": "AND",
            },
        )
        print("Raw response:")
        pp(resp)

        # Parse matched stocks if present
        if isinstance(resp, dict):
            matched = resp.get("matched_stocks") or resp.get("matches") or resp.get("results")
            if matched:
                print(f"Matched stocks: ({len(matched)})")
                for s in matched:
                    # try to print a small summary for each
                    if isinstance(s, dict):
                        symbol = s.get("symbol") or s.get("ticker") or s.get("name")
                        close = s.get("close") or s.get("price") or s.get("last")
                        print(f" - {symbol}: {close}")
                    else:
                        print(" -", s)
            else:
                print("No matched stocks found in response keys 'matched_stocks'/'matches'/'results'.")

        # ---- Test 4: run_preset_scan ----
        print("\n4) run_preset_scan")
        resp = await client.call_tool(
            "run_preset_scan",
            {"preset_name": "rsi_oversold", "symbols": ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]},
        )
        print("Raw response:")
        pp(resp)

        if isinstance(resp, dict):
            keys_to_show = ("preset_name", "preset_description", "total_matched", "matched")
            print("Summary (if present):")
            pp(summarize_dict(resp, keys_to_show))
            # matched stocks fallback
            matched = resp.get("matched") or resp.get("matched_stocks") or resp.get("matches")
            if matched:
                print("Matched list preview:")
                for m in (matched[:10] if isinstance(matched, list) else [matched]):
                    pp(m)

        print("\n" + "=" * 72)
        print("Tests finished.")
        print("=" * 72)


def main():
    parser = argparse.ArgumentParser(description="Run quick integration tests against local MCP server module.")
    parser.add_argument("--server", "-s", default="server.py", help="Path to server module (default: server.py)")
    args = parser.parse_args()

    try:
        asyncio.run(run_tests(args.server))
    except Exception as exc:
        print("ERROR running tests:", exc)


if __name__ == "__main__":
    main()
