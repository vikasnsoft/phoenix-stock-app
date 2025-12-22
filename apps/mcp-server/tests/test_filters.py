
import pytest
import pandas as pd
import numpy as np
from server import evaluate_single_filter, _get_indicator_value

@pytest.fixture
def sample_df():
    """Create a sample DataFrame with price and indicator data."""
    dates = pd.date_range(start="2023-01-01", periods=100, freq="D")
    df = pd.DataFrame({
        "open": np.linspace(100, 200, 100),
        "high": np.linspace(105, 205, 100),
        "low": np.linspace(95, 195, 100),
        "close": np.linspace(100, 200, 100),
        "volume": np.random.randint(1000, 5000, 100)
    }, index=dates)
    
    # Add an SMA column manually for testing
    # SMA(20) at index i is average of close[i-19:i+1]
    df['SMA_20'] = df['close'].rolling(window=20).mean()
    
    # Ensure no NaNs for simple tests (fill with 0 or drop)
    df.fillna(0, inplace=True)
    
    return df

def test_price_filter_simple_gt(sample_df):
    """Test price > value filter."""
    # Latest close is 200.0
    filter_config = {
        "type": "price",
        "field": "close",
        "operator": "gt",
        "value": 150.0
    }
    passed, details = evaluate_single_filter("TEST", sample_df, filter_config)
    assert passed is True
    assert details["passed"] is True

    filter_config["value"] = 250.0
    passed, details = evaluate_single_filter("TEST", sample_df, filter_config)
    assert passed is False


def test_price_filter_formatted_values(sample_df):
    """Test price filter with offset."""
    # 2 days ago (index -3 from end, since 0 is -1)
    # 200, 198.something... 
    # With linspace(100, 200, 100), step is ~1.01
    
    # Check logic matches implementation: offset 0 -> idx -1
    
    filter_config = {
        "type": "price",
        "field": "close",
        "operator": "gt",
        "value": 100.0,
        "offset": 10  # 11 days ago
    }
    passed, details = evaluate_single_filter("TEST", sample_df, filter_config)
    assert passed is True


def test_dynamic_indicator_comparison(sample_df):
    """Test Price > SMA(20)."""
    # SMA 20 of linear trend 100->200
    # At end: price=200. SMA is avg of last 20. 
    # Last 20 are roughly 180-200. Avg approx 190.
    # So Close (200) > SMA (190) should be True.
    
    filter_config = {
        "type": "price",
        "field": "close",
        "operator": "gt",
        "value": {
            "type": "indicator",
            "field": "SMA",
            "time_period": 20
        }
    }
    
    # We must ensure _get_indicator_value works or is mocked.
    # server.py _get_indicator_value likely calculates it if not present, or uses TA-Lib.
    # Since we added 'SMA_20' manually in fixture, if the function looks for it, great.
    # If it calculates using talib/pandas_ta, we need that installed.
    # Assuming server logic handles calculation.
    
    # However, to be safe and dependent only on evaluate_single_filter logic (which calls _get_indicator_value),
    # let's look at _get_indicator_value in server.py.
    # If it computes it, we rely on installed libs. 
    
    passed, details = evaluate_single_filter("TEST", sample_df, filter_config)
    assert passed is True

def test_dynamic_indicator_crossover(sample_df):
    """Test Price crossed_above SMA(20)."""
    # For a linear trend, Price is always > SMA. It never crosses recently.
    # It crossed way back.
    
    filter_config = {
        "type": "price",
        "field": "close",
        "operator": "crossed_above",
        "value": {
            "type": "indicator",
            "field": "SMA",
            "time_period": 20
        }
    }
    
    passed, details = evaluate_single_filter("TEST", sample_df, filter_config)
    # Should be False as it's been above for a long time
    assert passed is False
    
    # Create a crossover scenario
    # Make price drop below then jump above
    # Manipulate last 2 rows
    # SMA is around 190.
    # Set prev close to 180 (below SMA), current to 200 (above SMA)
    
    sample_df.iloc[-2, sample_df.columns.get_loc('close')] = 180.0
    sample_df.iloc[-1, sample_df.columns.get_loc('close')] = 200.0
    
    # We need to make sure SMA doesn't move too much. 1 point change in 1 value of 20 changes sum by 1/20. Negligible.
    # Assume SMA at -2 is > 180 and at -1 is < 200.
    
    passed, details = evaluate_single_filter("TEST", sample_df, filter_config)
    
    # Debug print if it fails
    if not passed:
        print(f"Details: {details}")
        
    # This might fail if _get_indicator_value re-calculates SMA based on modified close prices dynamically
    # and we didn't update the SMA column?
    # server.py logic:
    # compare_value = _get_indicator_value(df, rhs_field, rhs_period, idx)
    # previous_compare = _get_indicator_value(df, rhs_field, rhs_period, prev_idx)
    
    # If _get_indicator_value uses pre-calculated column "SMA_20" if present, then our manual column persists.
    # If it re-calculates, it uses the modified close.
    # Let's verify _get_indicator_value behavior or just rely on the test running to find out.
    
    # For now, assert True, but be ready to inspect.
    assert passed is True

def test_ast_evaluation_basic(sample_df):
    """Test basic AST expression like 'close > 100'."""
    filter_config = {
        "type": "expression",
        "expression": {
            "type": "binary",
            "operator": ">",
            "left": {"type": "attribute", "field": "close"},
            "right": {"type": "constant", "value": 100}
        }
    }
    
    passed, details = evaluate_single_filter("TEST", sample_df, filter_config)
    if not passed:
        print(f"Details: {details}")
    assert passed is True
