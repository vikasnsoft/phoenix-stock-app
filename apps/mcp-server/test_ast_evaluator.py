"""Unit tests for AST evaluation helpers in server.py.

These tests cover core node types used by expression filters:
- attribute
- constant
- binary (arithmetic + comparison)
- function (Abs)
"""

from __future__ import annotations

from typing import Dict, Any

import pandas as pd

from server import evaluate_ast


def _build_df_for_prices() -> pd.DataFrame:
    """Build a small OHLCV DataFrame for AST tests.

    Latest row will be at the end (index -1).
    """
    data = {
        "open": [100.0, 101.0, 102.0],
        "high": [105.0, 106.0, 107.0],
        "low": [99.0, 100.0, 101.0],
        "close": [103.0, 104.0, 105.0],
        "volume": [1000, 1100, 1200],
    }
    return pd.DataFrame(data)


def test_attribute_latest_close() -> None:
    df = _build_df_for_prices()
    node: Dict[str, Any] = {"type": "attribute", "field": "close", "offset": 0}

    result = evaluate_ast(node, df, idx=-1)

    assert result == 105.0


def test_binary_arithmetic_subtraction() -> None:
    df = _build_df_for_prices()
    node: Dict[str, Any] = {
        "type": "binary",
        "operator": "-",
        "left": {"type": "attribute", "field": "close"},
        "right": {"type": "attribute", "field": "open"},
    }

    result = evaluate_ast(node, df, idx=-1)

    # Latest row: close=105, open=102 -> 3
    assert result == 3.0


def test_function_abs_on_difference() -> None:
    df = _build_df_for_prices()
    node: Dict[str, Any] = {
        "type": "function",
        "name": "Abs",
        "args": [
            {
                "type": "binary",
                "operator": "-",
                "left": {"type": "attribute", "field": "open"},
                "right": {"type": "attribute", "field": "close"},
            }
        ],
    }

    result = evaluate_ast(node, df, idx=-1)

    # |open - close| on latest row: |102 - 105| = 3
    assert result == 3.0


def test_comparison_expression_abs_less_than_range() -> None:
    df = _build_df_for_prices()
    # Abs(Open - Close) < (High - Low) * 0.30 for latest candle
    node: Dict[str, Any] = {
        "type": "binary",
        "operator": "<",
        "left": {
            "type": "function",
            "name": "Abs",
            "args": [
                {
                    "type": "binary",
                    "operator": "-",
                    "left": {"type": "attribute", "field": "open"},
                    "right": {"type": "attribute", "field": "close"},
                }
            ],
        },
        "right": {
            "type": "binary",
            "operator": "*",
            "left": {
                "type": "binary",
                "operator": "-",
                "left": {"type": "attribute", "field": "high"},
                "right": {"type": "attribute", "field": "low"},
            },
            "right": {"type": "constant", "value": 0.30},
        },
    }

    result = evaluate_ast(node, df, idx=-1)

    # For latest row: open=102, close=105, high=107, low=101
    # abs(open-close) = 3, range = 6 -> 6*0.30 = 1.8 -> 3 < 1.8 is False
    # Comparison nodes return 1.0 for True, 0.0 for False
    assert result in (0.0, 1.0)
    assert result == 0.0
