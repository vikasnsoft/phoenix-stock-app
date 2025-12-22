# 📦 Step 3: Constants Setup

## Overview

Define all constants for offsets, attributes, indicators, and operators. These provide the dropdown options for the filter builder.

## Files to Create

1. `src/lib/constants/offsets.ts`
2. `src/lib/constants/attributes.ts`
3. `src/lib/constants/indicators.ts`
4. `src/lib/constants/operators.ts`

---

## File 1: Offsets

**Create: `src/lib/constants/offsets.ts`**

```typescript
import type { OffsetType } from '@/lib/types/filter.types';

export interface OffsetOption {
  value: OffsetType;
  label: string;
  description: string;
  days: number;
}

export const OFFSET_OPTIONS: OffsetOption[] = [
  { 
    value: 'latest', 
    label: 'Latest', 
    description: 'Current candle (today)', 
    days: 0 
  },
  { 
    value: '1d_ago', 
    label: '1 day ago', 
    description: 'Previous trading day', 
    days: 1 
  },
  { 
    value: '2d_ago', 
    label: '2 days ago', 
    description: '2 trading days ago', 
    days: 2 
  },
  { 
    value: '3d_ago', 
    label: '3 days ago', 
    description: '3 trading days ago', 
    days: 3 
  },
  { 
    value: '5d_ago', 
    label: '5 days ago', 
    description: '1 trading week', 
    days: 5 
  },
  { 
    value: '10d_ago', 
    label: '10 days ago', 
    description: '2 trading weeks', 
    days: 10 
  },
  { 
    value: '20d_ago', 
    label: '20 days ago', 
    description: '1 trading month', 
    days: 20 
  },
  { 
    value: '50d_ago', 
    label: '50 days ago', 
    description: '~2.5 months', 
    days: 50 
  },
  { 
    value: '100d_ago', 
    label: '100 days ago', 
    description: '~5 months', 
    days: 100 
  },
  { 
    value: '252d_ago', 
    label: '252 days ago', 
    description: '1 trading year', 
    days: 252 
  },
  { 
    value: '1w_ago', 
    label: '1 week ago', 
    description: 'Previous weekly candle', 
    days: 5 
  },
  { 
    value: '1m_ago', 
    label: '1 month ago', 
    description: 'Previous monthly candle', 
    days: 20 
  },
  { 
    value: '3m_ago', 
    label: '3 months ago', 
    description: 'Quarterly lookback', 
    days: 60 
  },
  { 
    value: '6m_ago', 
    label: '6 months ago', 
    description: 'Half-yearly lookback', 
    days: 126 
  },
  { 
    value: '1y_ago', 
    label: '1 year ago', 
    description: 'Previous yearly candle', 
    days: 252 
  },
];

// Helper to get offset by value
export function getOffset(value: OffsetType): OffsetOption | undefined {
  return OFFSET_OPTIONS.find(opt => opt.value === value);
}
```

---

## File 2: Stock Attributes

**Create: `src/lib/constants/attributes.ts`**

```typescript
import type { StockAttribute } from '@/lib/types/filter.types';

export interface AttributeOption {
  value: StockAttribute;
  label: string;
  description: string;
}

export interface AttributeCategory {
  label: string;
  icon: string;
  options: AttributeOption[];
}

export const STOCK_ATTRIBUTES: Record<string, AttributeCategory> = {
  basic: {
    label: 'Price & Volume',
    icon: '📊',
    options: [
      { 
        value: 'close', 
        label: 'Close', 
        description: 'Closing price of the candle' 
      },
      { 
        value: 'open', 
        label: 'Open', 
        description: 'Opening price of the candle' 
      },
      { 
        value: 'high', 
        label: 'High', 
        description: 'Highest price of the candle' 
      },
      { 
        value: 'low', 
        label: 'Low', 
        description: 'Lowest price of the candle' 
      },
      { 
        value: 'volume', 
        label: 'Volume', 
        description: 'Trading volume' 
      },
    ]
  }
};

// Flatten all attributes for easier dropdown usage
export const ALL_ATTRIBUTES: AttributeOption[] = Object.values(STOCK_ATTRIBUTES)
  .flatMap(cat => cat.options);
```

---

## File 3: Indicators (Most Important)

**Create: `src/lib/constants/indicators.ts`**

```typescript
import type { IndicatorType } from '@/lib/types/filter.types';

export interface IndicatorParameter {
  name: string;
  type: 'measure' | 'number';
  default: any;
  placeholder?: string;
}

export interface IndicatorConfig {
  value: IndicatorType;
  label: string;
  description: string;
  hasParameters: boolean;
  parameters: IndicatorParameter[];
}

export interface IndicatorCategory {
  label: string;
  icon: string;
  options: IndicatorConfig[];
}

export const INDICATORS: Record<string, IndicatorCategory> = {
  movingAverages: {
    label: 'Moving Averages',
    icon: '📈',
    options: [
      {
        value: 'sma',
        label: 'SMA',
        description: 'Simple Moving Average',
        hasParameters: true,
        parameters: [
          { name: 'measure', type: 'measure', default: 'close', placeholder: 'close/open/high/low' },
          { name: 'period', type: 'number', default: 20, placeholder: '20' }
        ]
      },
      {
        value: 'ema',
        label: 'EMA',
        description: 'Exponential Moving Average',
        hasParameters: true,
        parameters: [
          { name: 'measure', type: 'measure', default: 'close' },
          { name: 'period', type: 'number', default: 20 }
        ]
      },
      {
        value: 'wma',
        label: 'WMA',
        description: 'Weighted Moving Average',
        hasParameters: true,
        parameters: [
          { name: 'measure', type: 'measure', default: 'close' },
          { name: 'period', type: 'number', default: 20 }
        ]
      },
    ]
  },

  momentum: {
    label: 'Momentum Indicators',
    icon: '⚡',
    options: [
      {
        value: 'rsi',
        label: 'RSI',
        description: 'Relative Strength Index (0-100)',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 14, placeholder: '14' }
        ]
      },
      {
        value: 'macd',
        label: 'MACD',
        description: 'MACD Line',
        hasParameters: true,
        parameters: [
          { name: 'fast', type: 'number', default: 12 },
          { name: 'slow', type: 'number', default: 26 },
          { name: 'signal', type: 'number', default: 9 }
        ]
      },
      {
        value: 'macd_signal',
        label: 'MACD Signal',
        description: 'MACD Signal Line',
        hasParameters: true,
        parameters: [
          { name: 'fast', type: 'number', default: 12 },
          { name: 'slow', type: 'number', default: 26 },
          { name: 'signal', type: 'number', default: 9 }
        ]
      },
      {
        value: 'stochastic_k',
        label: 'Stochastic %K',
        description: 'Stochastic %K Line',
        hasParameters: true,
        parameters: [
          { name: 'k_period', type: 'number', default: 14 },
          { name: 'd_period', type: 'number', default: 3 }
        ]
      },
      {
        value: 'cci',
        label: 'CCI',
        description: 'Commodity Channel Index',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 20 }
        ]
      },
      {
        value: 'mfi',
        label: 'MFI',
        description: 'Money Flow Index',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 14 }
        ]
      },
    ]
  },

  volatility: {
    label: 'Volatility Indicators',
    icon: '📉',
    options: [
      {
        value: 'atr',
        label: 'ATR',
        description: 'Average True Range',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 14 }
        ]
      },
      {
        value: 'bb_upper',
        label: 'BB Upper',
        description: 'Bollinger Band Upper',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 20 },
          { name: 'std_dev', type: 'number', default: 2 }
        ]
      },
      {
        value: 'bb_middle',
        label: 'BB Middle',
        description: 'Bollinger Band Middle (SMA)',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 20 },
          { name: 'std_dev', type: 'number', default: 2 }
        ]
      },
      {
        value: 'bb_lower',
        label: 'BB Lower',
        description: 'Bollinger Band Lower',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 20 },
          { name: 'std_dev', type: 'number', default: 2 }
        ]
      },
    ]
  },

  trend: {
    label: 'Trend Indicators',
    icon: '↗️',
    options: [
      {
        value: 'adx',
        label: 'ADX',
        description: 'Average Directional Index',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 14 }
        ]
      },
      {
        value: 'supertrend',
        label: 'Supertrend',
        description: 'Supertrend Indicator',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 10 },
          { name: 'multiplier', type: 'number', default: 3 }
        ]
      },
    ]
  },

  volume: {
    label: 'Volume Indicators',
    icon: '📊',
    options: [
      {
        value: 'obv',
        label: 'OBV',
        description: 'On-Balance Volume',
        hasParameters: false,
        parameters: []
      },
      {
        value: 'vwap',
        label: 'VWAP',
        description: 'Volume Weighted Average Price',
        hasParameters: false,
        parameters: []
      },
    ]
  },

  functional: {
    label: 'Functional Filters',
    icon: '🧮',
    options: [
      {
        value: 'max',
        label: 'Max',
        description: 'Maximum value over period',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 252, placeholder: '252 for 52-week' },
          { name: 'measure', type: 'measure', default: 'high' }
        ]
      },
      {
        value: 'min',
        label: 'Min',
        description: 'Minimum value over period',
        hasParameters: true,
        parameters: [
          { name: 'period', type: 'number', default: 252 },
          { name: 'measure', type: 'measure', default: 'low' }
        ]
      },
    ]
  }
};

// Flatten all indicators
export const ALL_INDICATORS: IndicatorConfig[] = Object.values(INDICATORS)
  .flatMap(cat => cat.options);

// Helper to get indicator config by type
export function getIndicatorConfig(type: IndicatorType): IndicatorConfig | undefined {
  return ALL_INDICATORS.find(ind => ind.value === type);
}
```

---

## File 4: Operators

**Create: `src/lib/constants/operators.ts`**

```typescript
import type { OperatorType } from '@/lib/types/filter.types';

export interface OperatorOption {
  value: OperatorType;
  label: string;
  symbol: string;
  description: string;
}

export interface OperatorCategory {
  label: string;
  options: OperatorOption[];
}

export const OPERATORS: Record<string, OperatorCategory> = {
  comparison: {
    label: 'Comparison',
    options: [
      { 
        value: '>', 
        label: 'Greater than', 
        symbol: '>', 
        description: 'Value A > Value B' 
      },
      { 
        value: '<', 
        label: 'Less than', 
        symbol: '<', 
        description: 'Value A < Value B' 
      },
      { 
        value: '>=', 
        label: 'Greater than equal to', 
        symbol: '≥', 
        description: 'Value A ≥ Value B' 
      },
      { 
        value: '<=', 
        label: 'Less than equal to', 
        symbol: '≤', 
        description: 'Value A ≤ Value B' 
      },
      { 
        value: '==', 
        label: 'Equal to', 
        symbol: '=', 
        description: 'Value A = Value B' 
      },
      { 
        value: '!=', 
        label: 'Not equal to', 
        symbol: '≠', 
        description: 'Value A ≠ Value B' 
      },
    ]
  },

  crossover: {
    label: 'Crossover',
    options: [
      { 
        value: 'crosses_above', 
        label: 'Crosses above', 
        symbol: '↗', 
        description: 'Value crosses from below to above' 
      },
      { 
        value: 'crosses_below', 
        label: 'Crosses below', 
        symbol: '↘', 
        description: 'Value crosses from above to below' 
      },
    ]
  },

  arithmetic: {
    label: 'Arithmetic',
    options: [
      { 
        value: '+', 
        label: 'Add', 
        symbol: '+', 
        description: 'Addition' 
      },
      { 
        value: '-', 
        label: 'Subtract', 
        symbol: '-', 
        description: 'Subtraction' 
      },
      { 
        value: '*', 
        label: 'Multiply', 
        symbol: '×', 
        description: 'Multiplication' 
      },
      { 
        value: '/', 
        label: 'Divide', 
        symbol: '÷', 
        description: 'Division' 
      },
    ]
  }
};

// Flatten all operators
export const ALL_OPERATORS: OperatorOption[] = Object.values(OPERATORS)
  .flatMap(cat => cat.options);

// Helper to get operator by value
export function getOperator(value: OperatorType): OperatorOption | undefined {
  return ALL_OPERATORS.find(op => op.value === value);
}

// Check if operator is comparison
export function isComparisonOperator(op: OperatorType): boolean {
  return ['>', '<', '>=', '<=', '==', '!='].includes(op);
}

// Check if operator is crossover
export function isCrossoverOperator(op: OperatorType): boolean {
  return ['crosses_above', 'crosses_below'].includes(op);
}

// Check if operator is arithmetic
export function isArithmeticOperator(op: OperatorType): boolean {
  return ['+', '-', '*', '/'].includes(op);
}
```

---

## Verification

Test that all constants work:

```typescript
// Test file (temporary)
import { OFFSET_OPTIONS, getOffset } from '@/lib/constants/offsets';
import { STOCK_ATTRIBUTES } from '@/lib/constants/attributes';
import { INDICATORS, getIndicatorConfig } from '@/lib/constants/indicators';
import { OPERATORS, getOperator } from '@/lib/constants/operators';

// Should log 15 offsets
console.log('Offsets:', OFFSET_OPTIONS.length);

// Should log stock attributes
console.log('Attributes:', STOCK_ATTRIBUTES.basic.options);

// Should log indicator config
console.log('RSI Config:', getIndicatorConfig('rsi'));

// Should log operator
console.log('Greater than:', getOperator('>'));
```

## Checklist

- [ ] All 4 constant files created
- [ ] Types import correctly from filter.types.ts
- [ ] Helper functions work
- [ ] No TypeScript errors

👉 **Next**: [04-STATE-MANAGEMENT.md](./04-STATE-MANAGEMENT.md)
