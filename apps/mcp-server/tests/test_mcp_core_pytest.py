"""Pytest integration tests for the MCP server core tools.

These tests call the FastMCP server via Client and validate
core tools and rich filter types (price_change, volume_change,
price_52week, gap, pattern) as well as preset scans.
"""
from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4

import pytest
from fastmcp import Client


SERVER_PATH: str = str(Path(__file__).resolve().parent.parent / "server.py")


pytestmark = pytest.mark.skipif(
    not os.getenv("ALPHA_VANTAGE_API_KEY"),
    reason=(
        "ALPHA_VANTAGE_API_KEY not set; integration tests require "
        "real Alpha Vantage access"
    ),
)


def _run_client_tool(tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Run an MCP tool via FastMCP Client and return the result dictionary.

    Args:
        tool_name: Name of the MCP tool to call.
        params: Parameters to send to the tool.

    Returns:
        Parsed result dictionary returned by the MCP tool.
    """

    async def _run() -> Dict[str, Any]:
        async with Client(SERVER_PATH) as client:  # type: ignore[arg-type]
            response = await client.call_tool(tool_name, params)
            result = response.data if hasattr(response, "data") else response
            assert isinstance(result, dict)
            return result

    return asyncio.run(_run())


def test_fetch_stock_data_basic() -> None:
    """Basic smoke test for fetch_stock_data tool."""
    result = _run_client_tool(
        "fetch_stock_data",
        {"symbol": "AAPL", "interval": "daily", "outputsize": "compact"},
    )

    assert result["symbol"] == "AAPL"
    assert result["interval"] == "daily"
    assert result["data_points"] > 0
    assert isinstance(result["data"], list)
    assert len(result["data"]) == result["data_points"]


def test_get_technical_indicator_rsi() -> None:
    """Verify RSI indicator tool returns values for a symbol."""
    result = _run_client_tool(
        "get_technical_indicator",
        {
            "symbol": "AAPL",
            "indicator": "RSI",
            "interval": "daily",
            "time_period": 14,
        },
    )

    assert result["symbol"] == "AAPL"
    assert result["indicator"].upper() == "RSI"
    assert isinstance(result["values"], list)
    assert len(result["values"]) > 0
    assert result["latest_value"] is not None


def test_scan_stocks_price_change_filter() -> None:
    """Scan stocks using the price_change filter type."""
    result = _run_client_tool(
        "scan_stocks",
        {
            "symbols": ["AAPL", "MSFT", "GOOGL"],
            "filters": [
                {
                    "type": "price_change",
                    "field": "close",
                    "operator": "gt",
                    "value": -10.0,
                    "lookback": 5,
                }
            ],
            "filter_logic": "AND",
        },
    )

    assert "matched_stocks" in result
    assert "failed_stocks" in result
    if result["matched_stocks"]:
        details = result["matched_stocks"][0]["filter_details"][0]
        assert details["type"] == "price_change"
        assert isinstance(details["current_value"], float)


def test_scan_stocks_volume_change_filter() -> None:
    """Scan stocks using the volume_change filter type."""
    result = _run_client_tool(
        "scan_stocks",
        {
            "symbols": ["AAPL", "MSFT", "GOOGL"],
            "filters": [
                {
                    "type": "volume_change",
                    "operator": "gt",
                    "value": -50.0,
                    "lookback": 3,
                }
            ],
            "filter_logic": "AND",
        },
    )

    assert "matched_stocks" in result
    assert "failed_stocks" in result
    if result["matched_stocks"]:
        details = result["matched_stocks"][0]["filter_details"][0]
        assert details["type"] == "volume_change"
        assert isinstance(details["current_value"], float)


def test_scan_stocks_gap_filter() -> None:
    """Scan stocks using the gap filter type.

    This uses an extremely low threshold so that the filter is expected to
    pass for typical equities, and focuses on response structure rather than
    a specific market condition.
    """

    result = _run_client_tool(
        "scan_stocks",
        {
            "symbols": ["AAPL", "MSFT", "GOOGL"],
            "filters": [
                {
                    "type": "gap",
                    "operator": "gt",
                    "value": -1000.0,
                }
            ],
            "filter_logic": "AND",
        },
    )

    assert "matched_stocks" in result
    assert "failed_stocks" in result
    if result["matched_stocks"]:
        details = result["matched_stocks"][0]["filter_details"][0]
        assert details["type"] == "gap"
        assert isinstance(details["current_value"], float)
        assert "current_open" in details
        assert "previous_close" in details


def test_scan_stocks_pattern_filter() -> None:
    """Scan stocks using the pattern filter type.

    This uses a simple pattern name and asserts that the scan executes and
    returns the expected top-level keys. Pattern matches are data-dependent,
    so details are only inspected when matches are present.
    """

    result = _run_client_tool(
        "scan_stocks",
        {
            "symbols": ["AAPL", "MSFT", "GOOGL"],
            "filters": [
                {
                    "type": "pattern",
                    "pattern": "hammer",
                }
            ],
            "filter_logic": "AND",
        },
    )

    assert "matched_stocks" in result
    assert "failed_stocks" in result
    if result["matched_stocks"]:
        details = result["matched_stocks"][0]["filter_details"][0]
        assert details["type"] == "pattern"
        assert details["pattern"] == "hammer"


def test_price_52week_filter_distance_keys() -> None:
    """Ensure price_52week filter returns distance metrics and bounds."""
    result = _run_client_tool(
        "scan_stocks",
        {
            "symbols": ["AAPL"],
            "filters": [
                {
                    "type": "price_52week",
                    "field": "close",
                    "operator": "lte",
                    "value": 100.0,
                    "metric": "distance_from_high_pct",
                    "lookback_days": 252,
                }
            ],
            "filter_logic": "AND",
        },
    )

    assert "matched_stocks" in result
    assert "failed_stocks" in result
    # Check filter details structure even if no match
    if result["matched_stocks"]:
        details = result["matched_stocks"][0]["filter_details"][0]
        assert details["type"] == "price_52week"
        assert "high_52w" in details
        assert "low_52w" in details


def test_run_preset_scan_breakout_52week() -> None:
    """Run breakout_52week preset and verify basic structure."""
    result = _run_client_tool(
        "run_preset_scan",
        {
            "preset_name": "breakout_52week",
            "symbols": ["AAPL", "MSFT", "GOOGL"],
        },
    )

    assert result["preset_name"] == "breakout_52week"
    assert "preset_description" in result
    assert "matched_stocks" in result
    assert "total_scanned" in result


def test_watchlist_crud_and_scan() -> None:
    """Exercise watchlist lifecycle and scan execution."""
    unique_name = f"Pytest Watchlist {uuid4().hex[:6]}"
    entry = _run_client_tool(
        "create_watchlist",
        {
            "name": unique_name,
            "symbols": ["AAPL", "MSFT"],
            "description": "pytest watchlist",
        },
    )

    try:
        assert entry["name"] == unique_name
        assert entry["symbols"] == ["AAPL", "MSFT"]

        listing = _run_client_tool("list_watchlists", {})
        listed_ids = [item["id"] for item in listing.get("watchlists", [])]
        assert entry["id"] in listed_ids

        updated = _run_client_tool(
            "update_watchlist_symbols",
            {
                "identifier": entry["id"],
                "symbols": ["GOOGL", "TSLA"],
            },
        )
        assert updated["symbols"] == ["GOOGL", "TSLA"]

        scan_result = _run_client_tool(
            "get_watchlist_scan_results",
            {
                "identifier": entry["id"],
                "filters": [
                    {"type": "price", "field": "close", "operator": "gt", "value": 0}
                ],
                "filter_logic": "AND",
            },
        )
        assert scan_result["total_scanned"] == len(updated["symbols"])
    finally:
        try:
            _run_client_tool("delete_watchlist", {"identifier": entry["id"]})
        except Exception:
            pass


def test_saved_scan_crud_and_run() -> None:
    """Exercise saved scan lifecycle and execution."""
    unique_name = f"Pytest Scan {uuid4().hex[:6]}"
    entry = _run_client_tool(
        "create_saved_scan",
        {
            "name": unique_name,
            "filters": [
                {"type": "indicator", "field": "RSI", "operator": "gt", "value": 40, "time_period": 14}
            ],
            "filter_logic": "AND",
            "symbols": ["AAPL", "MSFT"],
            "description": "pytest scan",
        },
    )

    try:
        assert entry["name"] == unique_name
        listing = _run_client_tool("list_saved_scans", {})
        listed_ids = [item["id"] for item in listing.get("scans", [])]
        assert entry["id"] in listed_ids

        run_result = _run_client_tool(
            "run_saved_scan",
            {
                "identifier": entry["id"],
            },
        )
        assert run_result["total_scanned"] == len(entry["symbols"])
    finally:
        try:
            _run_client_tool("delete_saved_scan", {"identifier": entry["id"]})
        except Exception:
            pass
