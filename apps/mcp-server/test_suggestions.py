
import sys
import json
from server import parse_natural_language_query

SUGGESTIONS = [
    "RSI 14 above 70",
    "Close crossed above SMA 50",
    "Volume > 1000000 and Close > 50",
    "consecutive 3 green candles",
    "EMA 20 > EMA 50",
    "Close > VWAP",
    "Stoch 14 below 20",
    "High > All Time High",
    "MACD crossed above Signal",
    "RSI 14 > 50 and SMA 20 > SMA 50",
    "Low < Bollinger Lower",
    "ADX 14 > 25",
    "Market Cap > 10000000000",
    "Close > Open and Volume > 500000"
]

def run_tests():
    print(f"Testing {len(SUGGESTIONS)} suggestions...")
    print("-" * 60)
    
    passed = 0
    failed = 0
    
    for i, prompt in enumerate(SUGGESTIONS):
        try:
            print(f"[{i+1}/{len(SUGGESTIONS)}] Testing: '{prompt}'")
            # fastmcp Tool object stores the original function in .fn
            result = parse_natural_language_query.fn(query=prompt)
            filters = result.get('filters', [])
            
            if not filters:
                print(f"  WARING: No filters generated.")
            else:
                print(f"  SUCCESS: Generated {len(filters)} filters.")
                # print(json.dumps(filters[0], indent=2)) # Print first filter for debug if needed
            
            passed += 1
            
        except Exception as e:
            print(f"  ERROR: {e}")
            failed += 1
        
        print("-" * 60)

    print(f"\nFinal Results: {passed} Passed, {failed} Failed")

if __name__ == "__main__":
    run_tests()
