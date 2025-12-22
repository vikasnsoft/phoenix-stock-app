
import pandas as pd
from server import evaluate_ast

# Mock DataFrame
df = pd.DataFrame({
    'close': [100.0, 101.0, 102.0],
    'volume': [1000, 2000, 3000],
    'rsi': [30.0, 50.0, 70.0] 
})

# Mock Indicator Getter override for the test
import server
def mock_get_indicator(df, field, period, idx):
    # Just return dummy values based on field name for testing
    if 'rsi' in field.lower():
        return df['rsi'].iloc[idx]
    return 0
server._get_indicator_value = mock_get_indicator

# 1. Test AND Logic: Close > 100 AND Volume > 2000 (Last row: Close=102, Vol=3000 -> True AND True)
# Generated AST for: (Close > 100) * (Volume > 2000)
ast_and = {
    'type': 'binary',
    'operator': '*',
    'left': {
        'type': 'binary',
        'operator': '>',
        'left': {'type': 'attribute', 'field': 'close'},
        'right': {'type': 'constant', 'value': 100}
    },
    'right': {
        'type': 'binary',
        'operator': '>',
        'left': {'type': 'attribute', 'field': 'volume'},
        'right': {'type': 'constant', 'value': 2000}
    }
}

# 2. Test OR Logic: Close > 200 (False) OR Volume > 2000 (True)
# Generated AST for: (Close > 200) + (Volume > 2000)
ast_or = {
    'type': 'binary',
    'operator': '+',
    'left': {
        'type': 'binary',
        'operator': '>',
        'left': {'type': 'attribute', 'field': 'close'},
        'right': {'type': 'constant', 'value': 200}
    },
    'right': {
        'type': 'binary',
        'operator': '>',
        'left': {'type': 'attribute', 'field': 'volume'},
        'right': {'type': 'constant', 'value': 2000}
    }
}

print("Testing AST Evaluation...")
idx = -1 # Latest

try:
    res_and = evaluate_ast(ast_and, df, idx)
    print(f"AND Result: {res_and} (Expected 1.0)")
    
    res_or = evaluate_ast(ast_or, df, idx)
    print(f"OR Result: {res_or} (Expected 1.0 or 0.0 + 1.0 = 1.0)")
    
    if res_and > 0 and res_or > 0:
        print("SUCCESS: Logic Trees Validated")
    else:
        print("FAILURE: Logic validation failed")

except Exception as e:
    print(f"ERROR: {e}")
