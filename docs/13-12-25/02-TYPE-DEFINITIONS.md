# 🔷 Step 2: Type Definitions

## Overview

Define TypeScript types and interfaces for the filter builder. This provides type safety and better IDE support.

## File Location

Create: `src/lib/types/filter.types.ts`

## Complete Type Definitions

```typescript
// src/lib/types/filter.types.ts

/**
 * Offset types - represents timeframe for data points
 */
export type OffsetType =
  | 'latest'      // Current candle
  | '1d_ago'      // 1 day ago
  | '2d_ago'      // 2 days ago
  | '3d_ago'      // 3 days ago
  | '5d_ago'      // 5 days ago (1 week)
  | '10d_ago'     // 10 days ago
  | '20d_ago'     // 20 days ago (1 month)
  | '50d_ago'     // 50 days ago
  | '100d_ago'    // 100 days ago
  | '252d_ago'    // 252 days ago (1 year)
  | '1w_ago'      // 1 week ago (weekly candle)
  | '1m_ago'      // 1 month ago (monthly candle)
  | '3m_ago'      // 3 months ago
  | '6m_ago'      // 6 months ago
  | '1y_ago';     // 1 year ago (yearly candle)

/**
 * Basic stock attributes
 */
export type StockAttribute = 
  | 'close' 
  | 'open' 
  | 'high' 
  | 'low' 
  | 'volume';

/**
 * Technical indicator types
 */
export type IndicatorType =
  // Moving Averages
  | 'sma'              // Simple Moving Average
  | 'ema'              // Exponential Moving Average
  | 'wma'              // Weighted Moving Average
  | 'tma'              // Triangular Moving Average
  // Momentum Indicators
  | 'rsi'              // Relative Strength Index
  | 'macd'             // MACD Line
  | 'macd_signal'      // MACD Signal Line
  | 'macd_histogram'   // MACD Histogram
  | 'stochastic_k'     // Stochastic %K
  | 'stochastic_d'     // Stochastic %D
  | 'cci'              // Commodity Channel Index
  | 'roc'              // Rate of Change
  | 'williams_r'       // Williams %R
  | 'mfi'              // Money Flow Index
  // Volatility Indicators
  | 'atr'              // Average True Range
  | 'bb_upper'         // Bollinger Band Upper
  | 'bb_middle'        // Bollinger Band Middle
  | 'bb_lower'         // Bollinger Band Lower
  | 'bb_width'         // Bollinger Band Width
  | 'stddev'           // Standard Deviation
  // Trend Indicators
  | 'adx'              // Average Directional Index
  | 'plus_di'          // Plus Directional Indicator
  | 'minus_di'         // Minus Directional Indicator
  | 'supertrend'       // Supertrend
  | 'parabolic_sar'    // Parabolic SAR
  | 'ichimoku_tenkan'  // Ichimoku Tenkan-sen
  | 'ichimoku_kijun'   // Ichimoku Kijun-sen
  // Volume Indicators
  | 'obv'              // On-Balance Volume
  | 'vwap'             // Volume Weighted Average Price
  | 'vpt'              // Volume Price Trend
  // Functional Filters
  | 'max'              // Maximum over period
  | 'min';             // Minimum over period

/**
 * Operator types for comparisons and operations
 */
export type OperatorType =
  // Comparison Operators
  | '>'                // Greater than
  | '<'                // Less than
  | '>='               // Greater than or equal
  | '<='               // Less than or equal
  | '=='               // Equal to
  | '!='               // Not equal to
  // Crossover Operators
  | 'crosses_above'    // Crosses from below to above
  | 'crosses_below'    // Crosses from above to below
  // Arithmetic Operators
  | '+'                // Addition
  | '-'                // Subtraction
  | '*'                // Multiplication
  | '/';               // Division

/**
 * Conjunction types for combining filters
 */
export type ConjunctionType = 'AND' | 'OR';

/**
 * Measure can be either a stock attribute or an indicator
 */
export type MeasureType = StockAttribute | Indicator;

/**
 * Value type - whether comparing to a number or another measure
 */
export type ValueType = 'number' | 'measure';

/**
 * Indicator with parameters
 */
export interface Indicator {
  type: IndicatorType;
  parameters: (string | number)[];
}

/**
 * Helper type to check if something is an Indicator
 */
export function isIndicator(value: any): value is Indicator {
  return typeof value === 'object' && value !== null && 'type' in value && 'parameters' in value;
}

/**
 * Filter expression - the core logic of a filter
 */
export interface FilterExpression {
  // Left side of comparison
  offset?: OffsetType;
  measure: StockAttribute | Indicator;

  // Operator
  operator: OperatorType;

  // Right side of comparison
  valueType: ValueType;
  compareToOffset?: OffsetType;
  compareToMeasure?: StockAttribute | Indicator;
  compareToNumber?: number;

  // For arithmetic operations before comparison
  arithmeticOperator?: '+' | '-' | '*' | '/';
  arithmeticValue?: number;
}

/**
 * Simple filter (single condition)
 */
export interface Filter {
  id: string;
  type: 'simple';
  expression: FilterExpression;
  enabled: boolean;
}

/**
 * Filter group (multiple filters with AND/OR logic)
 */
export interface FilterGroup {
  id: string;
  type: 'group';
  conjunction: ConjunctionType;
  filters: FilterNode[];
  enabled: boolean;
}

/**
 * Filter node - can be a simple filter or a group
 */
export type FilterNode = Filter | FilterGroup;

/**
 * Segment types for stock selection
 */
export type SegmentType = 
  | 'cash'       // All NSE cash stocks
  | 'futures'    // F&O stocks
  | 'nifty50'    // Nifty 50 stocks
  | 'nifty100'   // Nifty 100 stocks
  | 'nifty500'   // Nifty 500 stocks
  | 'custom';    // Custom watchlist

/**
 * Scan configuration - the complete filter setup
 */
export interface ScanConfig {
  behavior: 'passes' | 'fails';
  conjunction: 'all' | 'any';
  segment: SegmentType;
  filters: FilterNode[];
}

/**
 * Scan result for a single stock
 */
export interface ScanResult {
  symbol: string;
  name: string;
  close: number;
  change: number;
  changePercent: number;
  volume: number;
  // Add more fields as needed
}

/**
 * Complete scan response
 */
export interface ScanResponse {
  success: boolean;
  total: number;
  results: ScanResult[];
  executionTime: number;
  timestamp: string;
}

/**
 * Filter validation error
 */
export interface FilterValidationError {
  filterId: string;
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: FilterValidationError[];
}
```

## Type Usage Examples

### Example 1: Simple Filter
```typescript
const simpleFilter: Filter = {
  id: 'filter-1',
  type: 'simple',
  enabled: true,
  expression: {
    offset: 'latest',
    measure: 'close',
    operator: '>',
    valueType: 'number',
    compareToNumber: 500
  }
};
// Renders as: "Latest Close > number 500"
```

### Example 2: Filter with Indicator
```typescript
const indicatorFilter: Filter = {
  id: 'filter-2',
  type: 'simple',
  enabled: true,
  expression: {
    offset: 'latest',
    measure: {
      type: 'rsi',
      parameters: [14]
    },
    operator: '>',
    valueType: 'number',
    compareToNumber: 70
  }
};
// Renders as: "Latest RSI(14) > number 70"
```

### Example 3: Crossover Filter
```typescript
const crossoverFilter: Filter = {
  id: 'filter-3',
  type: 'simple',
  enabled: true,
  expression: {
    offset: 'latest',
    measure: {
      type: 'sma',
      parameters: ['close', 50]
    },
    operator: 'crosses_above',
    valueType: 'measure',
    compareToMeasure: {
      type: 'sma',
      parameters: ['close', 200]
    }
  }
};
// Renders as: "Latest SMA(close, 50) crosses above SMA(close, 200)"
```

### Example 4: Filter Group
```typescript
const filterGroup: FilterGroup = {
  id: 'group-1',
  type: 'group',
  conjunction: 'AND',
  enabled: true,
  filters: [simpleFilter, indicatorFilter]
};
```

### Example 5: Complete Scan Config
```typescript
const scanConfig: ScanConfig = {
  behavior: 'passes',
  conjunction: 'all',
  segment: 'cash',
  filters: [simpleFilter, indicatorFilter, crossoverFilter]
};
```

## Type Utilities

Add these helper functions in the same file:

```typescript
/**
 * Type guard to check if a FilterNode is a Filter
 */
export function isSimpleFilter(node: FilterNode): node is Filter {
  return node.type === 'simple';
}

/**
 * Type guard to check if a FilterNode is a FilterGroup
 */
export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return node.type === 'group';
}

/**
 * Type guard to check if a measure is a StockAttribute
 */
export function isStockAttribute(measure: any): measure is StockAttribute {
  return typeof measure === 'string' && 
         ['close', 'open', 'high', 'low', 'volume'].includes(measure);
}

/**
 * Get display label for offset
 */
export function getOffsetLabel(offset: OffsetType): string {
  const labels: Record<OffsetType, string> = {
    latest: 'Latest',
    '1d_ago': '1 day ago',
    '2d_ago': '2 days ago',
    '3d_ago': '3 days ago',
    '5d_ago': '5 days ago',
    '10d_ago': '10 days ago',
    '20d_ago': '20 days ago',
    '50d_ago': '50 days ago',
    '100d_ago': '100 days ago',
    '252d_ago': '252 days ago',
    '1w_ago': '1 week ago',
    '1m_ago': '1 month ago',
    '3m_ago': '3 months ago',
    '6m_ago': '6 months ago',
    '1y_ago': '1 year ago'
  };
  return labels[offset];
}

/**
 * Get display label for operator
 */
export function getOperatorLabel(operator: OperatorType): string {
  const labels: Record<OperatorType, string> = {
    '>': 'Greater than',
    '<': 'Less than',
    '>=': 'Greater than equal to',
    '<=': 'Less than equal to',
    '==': 'Equal to',
    '!=': 'Not equal to',
    'crosses_above': 'Crosses above',
    'crosses_below': 'Crosses below',
    '+': 'Add',
    '-': 'Subtract',
    '*': 'Multiply',
    '/': 'Divide'
  };
  return labels[operator];
}
```

## Testing Your Types

Create a test file to ensure types work correctly:

```typescript
// Test file (can be temporary)
import { Filter, ScanConfig, isIndicator, isSimpleFilter } from '@/lib/types/filter.types';

// This should compile without errors
const testFilter: Filter = {
  id: 'test-1',
  type: 'simple',
  enabled: true,
  expression: {
    measure: 'close',
    operator: '>',
    valueType: 'number',
    compareToNumber: 100
  }
};

// Type guard test
if (isIndicator(testFilter.expression.measure)) {
  console.log('Is indicator:', testFilter.expression.measure.type);
} else {
  console.log('Is stock attribute:', testFilter.expression.measure);
}
```

## Verification Checklist

- [ ] File created at `src/lib/types/filter.types.ts`
- [ ] All type definitions compile without errors
- [ ] Type guards work correctly
- [ ] Helper functions are defined
- [ ] IDE provides autocomplete for types
- [ ] No TypeScript errors in terminal

## Common Issues

### Issue: Types not recognized in other files
**Solution**: Ensure the file exports types with `export type` or `export interface`

### Issue: Circular type dependencies
**Solution**: The types are designed to avoid circular dependencies. If you get this error, check your imports.

## Next Steps

With types defined, you can now create constants with full type safety.

👉 **Next**: [03-CONSTANTS-SETUP.md](./03-CONSTANTS-SETUP.md)
