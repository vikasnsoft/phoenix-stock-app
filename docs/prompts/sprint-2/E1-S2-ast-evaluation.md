# E1-S2: AST Evaluation in MCP Engine

**Epic**: Expression/Filter Engine & Builder 2.0  
**Sprint**: 2  
**Status**: Pending  
**Priority**: P0 (Must for MVP)

## Goal

Implement expression AST evaluator in the MCP Python engine that can compute arithmetic, comparisons, and basic functions on OHLCV + indicator data.

## Context

- Expression ASTs are now passed through from Nest to MCP (E1-S1)
- Need to evaluate expressions like: `Abs(Open - Close) < (High - Low) * 0.30`
- Current `evaluate_single_filter` only handles simple field comparisons

## Technical Requirements

### 1. Create AST Evaluator Module

**File**: `apps/mcp-server/ast_evaluator.py` (new file)

```python
"""
AST Expression Evaluator for Stock Filters
Evaluates expression trees against pandas DataFrame rows.
"""

from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime


class ASTEvaluator:
    """Evaluates expression AST nodes against stock data."""

    def __init__(self, df: pd.DataFrame, symbol: str):
        """
        Initialize evaluator with stock data.

        Args:
            df: DataFrame with OHLCV data (indexed by date)
            symbol: Stock symbol for indicator cache lookups
        """
        self.df = df
        self.symbol = symbol
        self.indicator_cache = {}  # Cache calculated indicators

    def evaluate(self, node: Dict[str, Any], offset: int = 0) -> float:
        """
        Evaluate an AST node to a numeric value.

        Args:
            node: Expression node dict with 'type' field
            offset: Days ago to evaluate (0 = latest)

        Returns:
            Numeric result of evaluation
        """
        node_type = node.get('type')

        if node_type == 'attribute':
            return self._eval_attribute(node, offset)
        elif node_type == 'indicator':
            return self._eval_indicator(node, offset)
        elif node_type == 'constant':
            return float(node.get('value', 0))
        elif node_type == 'binary':
            return self._eval_binary(node, offset)
        elif node_type == 'function':
            return self._eval_function(node, offset)
        else:
            raise ValueError(f"Unknown node type: {node_type}")

    def _eval_attribute(self, node: Dict[str, Any], base_offset: int) -> float:
        """Evaluate stock attribute (open, high, low, close, volume)."""
        field = node.get('field', '').lower()
        node_offset = node.get('offset', 0)
        total_offset = base_offset + node_offset

        if field not in ['open', 'high', 'low', 'close', 'volume']:
            raise ValueError(f"Invalid attribute: {field}")

        idx = -(total_offset + 1)  # -1 for latest, -2 for 1 day ago, etc.
        if abs(idx) > len(self.df):
            raise ValueError(f"Offset {total_offset} exceeds data length")

        return float(self.df.iloc[idx][field])

    def _eval_indicator(self, node: Dict[str, Any], base_offset: int) -> float:
        """Evaluate technical indicator (SMA, EMA, RSI, etc.)."""
        field = node.get('field', '').upper()
        time_period = node.get('time_period', 14)
        node_offset = node.get('offset', 0)
        total_offset = base_offset + node_offset

        # Import indicator calculators
        from server import (
            calculate_sma, calculate_ema, calculate_rsi,
            calculate_macd, calculate_bollinger_bands
        )

        cache_key = f"{field}_{time_period}"
        if cache_key not in self.indicator_cache:
            if field == 'SMA':
                self.indicator_cache[cache_key] = calculate_sma(self.df, time_period)
            elif field == 'EMA':
                self.indicator_cache[cache_key] = calculate_ema(self.df, time_period)
            elif field == 'RSI':
                self.indicator_cache[cache_key] = calculate_rsi(self.df, time_period)
            elif field == 'MACD':
                macd_data = calculate_macd(self.df)
                self.indicator_cache[cache_key] = macd_data['macd']
            elif field == 'BBANDS_UPPER':
                bbands = calculate_bollinger_bands(self.df, time_period)
                self.indicator_cache[cache_key] = bbands['upper']
            elif field == 'BBANDS_MIDDLE':
                bbands = calculate_bollinger_bands(self.df, time_period)
                self.indicator_cache[cache_key] = bbands['middle']
            elif field == 'BBANDS_LOWER':
                bbands = calculate_bollinger_bands(self.df, time_period)
                self.indicator_cache[cache_key] = bbands['lower']
            else:
                raise ValueError(f"Unsupported indicator: {field}")

        series = self.indicator_cache[cache_key]
        idx = -(total_offset + 1)
        if abs(idx) > len(series):
            raise ValueError(f"Offset {total_offset} exceeds indicator data length")

        value = series.iloc[idx]
        if pd.isna(value):
            raise ValueError(f"Indicator {field} not available at offset {total_offset}")

        return float(value)

    def _eval_binary(self, node: Dict[str, Any], offset: int) -> float:
        """Evaluate binary operation (arithmetic or comparison)."""
        left = self.evaluate(node.get('left', {}), offset)
        right = self.evaluate(node.get('right', {}), offset)
        operator = node.get('operator', '')

        # Arithmetic operators
        if operator == '+':
            return left + right
        elif operator == '-':
            return left - right
        elif operator == '*':
            return left * right
        elif operator == '/':
            if right == 0:
                raise ValueError("Division by zero")
            return left / right

        # Comparison operators (return 1.0 for True, 0.0 for False)
        elif operator == '>':
            return 1.0 if left > right else 0.0
        elif operator == '>=':
            return 1.0 if left >= right else 0.0
        elif operator == '<':
            return 1.0 if left < right else 0.0
        elif operator == '<=':
            return 1.0 if left <= right else 0.0
        elif operator == '==':
            return 1.0 if abs(left - right) < 0.01 else 0.0
        elif operator == '!=':
            return 1.0 if abs(left - right) >= 0.01 else 0.0

        else:
            raise ValueError(f"Unknown operator: {operator}")

    def _eval_function(self, node: Dict[str, Any], offset: int) -> float:
        """Evaluate function call (abs, min, max, etc.)."""
        func_name = node.get('name', '').lower()
        args = node.get('args', [])

        if func_name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() requires exactly 1 argument")
            return abs(self.evaluate(args[0], offset))

        elif func_name == 'min':
            if len(args) < 2:
                raise ValueError("min() requires at least 2 arguments")
            return min(self.evaluate(arg, offset) for arg in args)

        elif func_name == 'max':
            if len(args) < 2:
                raise ValueError("max() requires at least 2 arguments")
            return max(self.evaluate(arg, offset) for arg in args)

        else:
            raise ValueError(f"Unknown function: {func_name}")


def evaluate_expression_filter(
    symbol: str,
    df: pd.DataFrame,
    filter_config: Dict[str, Any]
) -> tuple[bool, Dict[str, Any]]:
    """
    Evaluate a filter with an expression AST.

    Args:
        symbol: Stock symbol
        df: OHLCV DataFrame
        filter_config: Filter dict with 'expression' and 'operator' keys

    Returns:
        (passed: bool, details: dict)
    """
    expression = filter_config.get('expression')
    if not expression:
        raise ValueError("Filter is missing 'expression' field")

    evaluator = ASTEvaluator(df, symbol)

    try:
        result = evaluator.evaluate(expression, offset=0)

        # For comparison expressions, result is already 1.0 or 0.0
        # For arithmetic expressions, we need to compare against 0 or use operator
        operator = filter_config.get('operator', 'gt')

        if operator == 'gt':
            passed = result > 0
        elif operator == 'ne':
            passed = abs(result) > 0.01
        else:
            # Expression should evaluate to boolean (1.0 or 0.0)
            passed = result >= 0.5

        detail = {
            'type': 'expression',
            'result': float(result),
            'passed': passed
        }

        return passed, detail

    except Exception as e:
        return False, {'type': 'expression', 'error': str(e), 'passed': False}
```

### 2. Integrate into `evaluate_single_filter`

**File**: `apps/mcp-server/server.py`

Update `evaluate_single_filter` to check for `expression` field:

```python
def evaluate_single_filter(
    symbol: str,
    df: pd.DataFrame,
    filter_config: Dict[str, Any]
) -> tuple[bool, Dict[str, Any]]:
    """
    Evaluate a single filter condition against stock data.

    Returns:
        (passed: bool, detail: dict)
    """
    filter_type = filter_config.get('type', '').lower()

    # NEW: Check if filter has an expression AST
    if 'expression' in filter_config and filter_config['expression']:
        from ast_evaluator import evaluate_expression_filter
        return evaluate_expression_filter(symbol, df, filter_config)

    # ... existing filter evaluation logic for price, indicator, volume, etc.
```

### 3. Add Unit Tests

**File**: `apps/mcp-server/test_ast_evaluator.py` (new file)

```python
import pytest
import pandas as pd
from ast_evaluator import ASTEvaluator

def test_simple_attribute():
    df = pd.DataFrame({
        'open': [100, 101, 102],
        'high': [105, 106, 107],
        'low': [99, 100, 101],
        'close': [103, 104, 105],
        'volume': [1000, 1100, 1200]
    })

    evaluator = ASTEvaluator(df, 'TEST')

    node = {'type': 'attribute', 'field': 'close', 'offset': 0}
    result = evaluator.evaluate(node)

    assert result == 105.0  # Latest close

def test_binary_arithmetic():
    df = pd.DataFrame({
        'open': [100],
        'close': [103],
        'high': [105],
        'low': [99],
        'volume': [1000]
    })

    evaluator = ASTEvaluator(df, 'TEST')

    # Test: (Close - Open) => (103 - 100) = 3
    node = {
        'type': 'binary',
        'operator': '-',
        'left': {'type': 'attribute', 'field': 'close'},
        'right': {'type': 'attribute', 'field': 'open'}
    }

    result = evaluator.evaluate(node)
    assert result == 3.0

def test_abs_function():
    df = pd.DataFrame({
        'open': [103],
        'close': [100],
        'high': [105],
        'low': [99],
        'volume': [1000]
    })

    evaluator = ASTEvaluator(df, 'TEST')

    # Test: Abs(Open - Close) => Abs(103 - 100) = 3
    node = {
        'type': 'function',
        'name': 'abs',
        'args': [{
            'type': 'binary',
            'operator': '-',
            'left': {'type': 'attribute', 'field': 'open'},
            'right': {'type': 'attribute', 'field': 'close'}
        }]
    }

    result = evaluator.evaluate(node)
    assert result == 3.0
```

## Files to Create/Modify

- **Create**: `apps/mcp-server/ast_evaluator.py` (full evaluator)
- **Create**: `apps/mcp-server/test_ast_evaluator.py` (unit tests)
- **Modify**: `apps/mcp-server/server.py` (`evaluate_single_filter` integration)

## Acceptance Criteria

- [ ] AST evaluator handles all node types (attribute, indicator, constant, binary, function)
- [ ] Unit tests pass for simple expressions
- [ ] Complex expression works: `Abs(Open - Close) < (High - Low) * 0.30`
- [ ] Scan with expression filter returns correct matches
- [ ] Errors are gracefully handled with clear messages

## Testing Steps

1. **Unit tests**:

   ```bash
   cd apps/mcp-server
   source venv/bin/activate
   pytest test_ast_evaluator.py -v
   ```

2. **Integration test via API**:

   ```bash
   curl -X POST http://localhost:4001/api/scans/run \
     -H "Content-Type: application/json" \
     -d '{
       "symbols": ["AAPL"],
       "filters": [{
         "type": "expression",
         "operator": "gt",
         "expression": {
           "type": "function",
           "name": "abs",
           "args": [{
             "type": "binary",
             "operator": "-",
             "left": {"type": "attribute", "field": "open"},
             "right": {"type": "attribute", "field": "close"}
           }]
         }
       }],
       "filterLogic": "AND"
     }'
   ```

3. **Expected result**: Stocks where `|Open - Close| > 0`

## Dependencies

- E1-S1: Wire ExpressionNodeDto (must be complete)

## Next Steps

- E1-S3: Grouped filters (nested AND/OR logic)
- E1-S4: Min/Max functional filters
