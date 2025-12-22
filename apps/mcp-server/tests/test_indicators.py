import sys
import os
import pandas as pd
import numpy as np
import unittest

# Add parent dir
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import calculate_psar, calculate_ichimoku, _get_indicator_value

class TestIndicators(unittest.TestCase):
    def setUp(self):
        self.df = self.create_sample_df(100)

    def create_sample_df(self, periods=100):
        dates = pd.date_range(start='2024-01-01', periods=periods)
        data = {
            'open': np.random.randn(periods).cumsum() + 100,
            'high': np.random.randn(periods).cumsum() + 105,
            'low': np.random.randn(periods).cumsum() + 95,
            'close': np.random.randn(periods).cumsum() + 100,
            'volume': np.random.randint(1000, 100000, periods)
        }
        df = pd.DataFrame(data, index=dates)
        df['high'] = df[['open', 'close', 'high']].max(axis=1)
        df['low'] = df[['open', 'close', 'low']].min(axis=1)
        return df

    def test_psar_calculation(self):
        psar = calculate_psar(self.df, step=0.02, max_step=0.2)
        self.assertEqual(len(psar), 100)
        self.assertFalse(psar.isna().any())

    def test_ichimoku_calculation(self):
        ichimoku = calculate_ichimoku(self.df, 9, 26, 52)
        self.assertIn('tenkan', ichimoku)
        self.assertIn('kijun', ichimoku)
        self.assertIn('senkou_a', ichimoku)
        self.assertEqual(len(ichimoku['tenkan']), 100)

    def test_get_indicator_value_params(self):
        # Test BB_WIDTH
        width = _get_indicator_value(self.df, 'BB_WIDTH', 20, -1, params={'std_dev': 2})
        self.assertIsInstance(width, float)
        
        # Test PSAR with params
        sar = _get_indicator_value(self.df, 'PARABOLIC_SAR', 0, -1, params={'step': 0.05, 'max': 0.3})
        self.assertIsInstance(sar, float)
        
        # Test Ichimoku Kijun
        kijun = _get_indicator_value(self.df, 'ICHIMOKU_KIJUN', 0, -1, params={'period_med': 20})
        self.assertIsInstance(kijun, float)

if __name__ == '__main__':
    unittest.main()
