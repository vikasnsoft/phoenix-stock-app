# 🎯 Dragonfly Doji Pattern - Precise Filter UI Implementation

## From Image Analysis

**Pattern**: Dragonfly Doji 15-minute candlestick
**Display**: `[0] 15 minute Open Equals [0] 15 minute Close`

## 🔑 Key New Feature Required: Timeframe Selector

### Current Structure (Missing)
```
Daily Close > 500
```

### Required Structure (From Image)
```
[0] 15 minute Open Equals [0] 15 minute Close
 ↓      ↓       ↓     ↓      ↓      ↓       ↓
[offset] time   attr  op   [offset] time   attr
```

---

## 📋 Implementation Requirements

### 1. Add Timeframe Support

**File**: `src/lib/types/filter.types.ts`

```typescript
// NEW: Timeframe type
export type TimeframeType = 
  | 'daily' | '15min' | '5min' | '30min' 
  | '1hour' | '1week' | '1month';

// UPDATE: FilterExpression
export interface FilterExpression {
  offset?: OffsetType;
  timeframe?: TimeframeType;  // ← ADD THIS
  measure: StockAttribute | Indicator;
  operator: OperatorType;
  valueType: ValueType;
  compareToOffset?: OffsetType;
  compareToTimeframe?: TimeframeType;  // ← ADD THIS
  compareToMeasure?: StockAttribute | Indicator;
  compareToNumber?: number;
  arithmeticOperator?: '+' | '-' | '*' | '/';  // ← ADD THIS
  arithmeticValue?: number;  // ← ADD THIS
}
```

### 2. Timeframe Constants

**File**: `src/lib/constants/timeframes.ts` (NEW)

```typescript
export const TIMEFRAMES = [
  { value: 'daily', label: 'Daily' },
  { value: '15min', label: '15 minute' },
  { value: '5min', label: '5 minute' },
  { value: '30min', label: '30 minute' },
  { value: '1hour', label: '1 hour' }
];
```

### 3. Filter Row UI Update

**File**: `src/components/screener/filter-row.tsx`

```tsx
<div className="flex items-center gap-2">
  {/* [0] */}
  <span className="text-slate-400">
    [{expr.offset === 'latest' ? '0' : '1'}]
  </span>

  {/* 15 minute */}
  <InlineSelect
    value={expr.timeframe || 'daily'}
    onChange={(v) => updateFilter(id, { timeframe: v })}
    options={TIMEFRAMES}
    className="text-slate-400"
  />

  {/* Open */}
  <InlineSelect
    value={expr.measure}
    onChange={(v) => updateFilter(id, { measure: v })}
    options={ATTRIBUTES}
    className="font-bold text-white"
  />

  {/* Equals */}
  <InlineSelect
    value={expr.operator}
    onChange={(v) => updateFilter(id, { operator: v })}
    options={OPERATORS}
    className="font-bold text-purple-400"
  />

  {/* Right side: [0] 15 minute Close */}
  <span className="text-slate-400">[0]</span>
  <InlineSelect value={expr.compareToTimeframe} ... />
  <InlineSelect value={expr.compareToMeasure} ... />

  {/* Arithmetic: * Number */}
  {expr.arithmeticOperator && (
    <>
      <span className="text-purple-400">{expr.arithmeticOperator}</span>
      <span className="text-gray-400">Number</span>
      <input
        type="number"
        value={expr.arithmeticValue}
        onChange={(e) => updateFilter(id, { 
          arithmeticValue: parseFloat(e.target.value) 
        })}
        className="w-20 px-2 py-1 bg-gray-800 rounded"
      />
    </>
  )}
</div>
```

---

## 🎨 Dragonfly Doji: 3 Filters

```typescript
// Filter 1: Open = Close (body is flat)
{
  timeframe: '15min',
  measure: 'open',
  operator: '==',
  compareToTimeframe: '15min',
  compareToMeasure: 'close'
}

// Filter 2: High = Open (no upper shadow)
{
  timeframe: '15min',
  measure: 'high',
  operator: '==',
  compareToTimeframe: '15min',
  compareToMeasure: 'open'
}

// Filter 3: Low < Open (long lower shadow)
{
  timeframe: '15min',
  measure: 'low',
  operator: '<',
  compareToTimeframe: '15min',
  compareToMeasure: 'open',
  arithmeticOperator: '*',
  arithmeticValue: 0.995  // Allow small tolerance
}
```

---

## 🎨 UI Colors (From Image)

```css
/* Offsets & Timeframes */
[0], 15 minute: #94A3B8 (slate-400)

/* Attributes */
Open, Close, High, Low: #FFFFFF bold

/* Operators */
Equals, Less than: #AD15AD bold (purple)

/* Number label */
Number: #9CA3AF (gray-400)
```

---

## ✅ Implementation Steps

1. **Types** - Add `timeframe` fields
2. **Constants** - Create timeframe options
3. **UI** - Add timeframe selector after offset
4. **Display** - Format as `[0] 15 minute Open`
5. **Arithmetic** - Add `* Number` input
6. **Test** - Create all 3 Dragonfly Doji filters

---

## 🎯 Success Criteria

✅ Display shows: `[0] 15 minute Open`  
✅ Can switch timeframes (daily, 15min, 5min)  
✅ Arithmetic works: `Open * 0.995`  
✅ Three filters create complete Dragonfly Doji  
✅ Colors match image exactly

---

**Implementation Priority**: HIGH - This unlocks all candlestick patterns!
