#!/usr/bin/env python3
"""Lightweight regression sanity script for Finnhub-backed MCP server.

This script is intended as a quick manual regression check for the
Phoenix-like screener pipeline. It exercises the same paths used by
NestJS and the web UI:

- OHLC data from Finnhub via Nest `/api/market-data/candles`
- Local indicator calculation (`get_technical_indicator`)
- Scan evaluation (`scan_stocks` -> `_scan_stocks_core`)

It does **not** compare multiple providers anymore (Finnhub is the
only provider), but the filename is kept for continuity.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

# Ensure we can import the local server module
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from server import get_technical_indicator, _scan_stocks_core  # type: ignore


SYMBOLS: List[str] = ["AAPL", "MSFT", "NVDA"]


def build_price_filter() -> Dict[str, Any]:
    """Simple price filter: close > 100.

    Matches the shape produced by the Nest `filter-mapper` utility:
    - type: "price"
    - field: "close"
    - operator: one of [gt, gte, lt, lte, eq]
    """

    return {
        "type": "price",
        "field": "close",
        "operator": "gt",
        "value": 100,
    }


def build_rsi_filter() -> Dict[str, Any]:
    """RSI filter: RSI(14) > 70."""

    return {
        "type": "indicator",
        "field": "RSI",
        "operator": "gt",
        "value": 70,
        "time_period": 14,
    }


def build_sma_cross_filter() -> Dict[str, Any]:
    """Close > SMA(20).

    This is approximated using the existing indicator evaluation logic
    (indicator: "SMA", time_period: 20) and price comparison.
    """

    return {
        "type": "indicator",
        "field": "SMA",
        "operator": "gt",
        "value": 20,
        "time_period": 20,
    }


def run_price_filter_test() -> None:
    filters = [build_price_filter()]
    print("\n[TEST] Price filter: close > 100")
    result = _scan_stocks_core(SYMBOLS, filters, "AND")
    print(
        f"  • scanned={result['total_scanned']} matched={result['total_matched']}"
    )


def run_rsi_filter_test() -> None:
    filters = [build_rsi_filter()]
    print("\n[TEST] RSI filter: RSI(14) > 70")
    result = _scan_stocks_core(SYMBOLS, filters, "AND")
    print(
        f"  • scanned={result['total_scanned']} matched={result['total_matched']}"
    )

    # Also print latest RSI value per symbol for sanity
    print("  • latest RSI values:")
    for symbol in SYMBOLS:
        try:
            indicator = get_technical_indicator(symbol, "RSI", interval="daily", time_period=14)
            latest = indicator.get("latest_value")
            value = latest.get("value") if isinstance(latest, dict) else None
            print(f"    - {symbol}: {value}")
        except Exception as exc:  # pragma: no cover - manual script
            print(f"    - {symbol}: ERROR {exc}")


def run_sma_cross_test() -> None:
    filters = [build_sma_cross_filter()]
    print("\n[TEST] SMA cross filter: close > SMA(20) (approx)")
    result = _scan_stocks_core(SYMBOLS, filters, "AND")
    print(
        f"  • scanned={result['total_scanned']} matched={result['total_matched']}"
    )


def main() -> None:
    print("Finnhub regression sanity check")
    print("Symbols:", ", ".join(SYMBOLS))

    run_price_filter_test()
    run_rsi_filter_test()
    run_sma_cross_test()

    print("\nDONE. Review counts and indicator values above for sanity.")


if __name__ == "__main__":  # pragma: no cover - manual script
    main()
