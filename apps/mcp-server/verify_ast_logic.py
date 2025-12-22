import pandas as pd
import numpy as np
from server import evaluate_ast, _get_indicator_value

# Mock Data
data = {
    'open': [100, 102, 105, 103, 108],
    'high': [105, 106, 110, 108, 112],
    'low': [95, 98, 100, 99, 105],
    'close': [102, 104, 108, 101, 110],
    'volume': [1000, 1200, 1500, 1100, 1300]
}
df = pd.DataFrame(data)

# Mock Indicator Calculation (monkey patch or just rely on simple logic if possible)
# Since _get_indicator_value calls calculate_rsi etc., we might need to mock those or just test basic math/logic
# For this test, we'll trust the math ops and focus on AST structure.
# We can mock _get_indicator_value to return predictable values.

def mock_get_indicator_value(df, field, time_period, idx):
    if field == 'SMA': return 105.0
    if field == 'EMA': return 100.0
    return 0.0

import server
server._get_indicator_value = mock_get_indicator_value

def test_ast(name, node, expected, idx=-1):
    try:
        result = evaluate_ast(node, df, idx)
        passed = bool(result)
        if passed == expected:
            print(f"✅ {name}: Passed (Result: {result})")
        else:
            print(f"❌ {name}: Failed (Expected {expected}, got {passed}, Result: {result})")
    except Exception as e:
        print(f"❌ {name}: Error - {e}")

print("Testing AST Evaluation...")

# 1. Simple Attribute Comparison: Close > Open (110 > 108) -> True
node1 = {
    'type': 'binary',
    'operator': '>',
    'left': {'type': 'attribute', 'field': 'close'},
    'right': {'type': 'attribute', 'field': 'open'}
}
test_ast("Close > Open", node1, True)

# 2. Binary Op: (High - Low) > 5 (112 - 105 = 7 > 5) -> True
node2 = {
    'type': 'binary',
    'operator': '>',
    'left': {
        'type': 'binary',
        'operator': '-',
        'left': {'type': 'attribute', 'field': 'high'},
        'right': {'type': 'attribute', 'field': 'low'}
    },
    'right': {'type': 'constant', 'value': 5}
}
test_ast("(High - Low) > 5", node2, True)

# 3. Indicator Comparison: SMA(20) > EMA(50) (105 > 100) -> True
node3 = {
    'type': 'binary',
    'operator': '>',
    'left': {'type': 'indicator', 'field': 'SMA', 'time_period': 20},
    'right': {'type': 'indicator', 'field': 'EMA', 'time_period': 50}
}
test_ast("SMA > EMA", node3, True)

# 4. Function: Abs(Open - Close) > 1 (Abs(108 - 110) = 2 > 1) -> True
node4 = {
    'type': 'binary',
    'operator': '>',
    'left': {
        'type': 'function',
        'name': 'Abs',
        'args': [{
            'type': 'binary',
            'operator': '-',
            'left': {'type': 'attribute', 'field': 'open'},
            'right': {'type': 'attribute', 'field': 'close'}
        }]
    },
    'right': {'type': 'constant', 'value': 1}
}
test_ast("Abs(Open - Close) > 1", node4, True)

# 5. Offset: Close(0) > Close(1) (110 > 101) -> True
node5 = {
    'type': 'binary',
    'operator': '>',
    'left': {'type': 'attribute', 'field': 'close', 'offset': 0},
    'right': {'type': 'attribute', 'field': 'close', 'offset': 1}
}
test_ast("Close(0) > Close(1)", node5, True)

# 6. Offset: Close(1) > Close(0) (101 > 110) -> False
node6 = {
    'type': 'binary',
    'operator': '>',
    'left': {'type': 'attribute', 'field': 'close', 'offset': 1},
    'right': {'type': 'attribute', 'field': 'close', 'offset': 0}
}
test_ast("Close(1) > Close(0)", node6, False)
