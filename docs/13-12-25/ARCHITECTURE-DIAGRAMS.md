# 🎯 Visual Flow & Architecture Diagram

---

## 📊 Complete Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    USER INTERACTIONS                         │
└──────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┬─────────┐
                    ↓         ↓         ↓
          ┌──────────────┐  ┌────────────────┐  ┌──────────┐
          │ Magic Filters│  │ Inline Editor  │  │  Store   │
          │   Panel      │  │   Buttons      │  │  Actions │
          └──────────────┘  └────────────────┘  └──────────┘
                    ↓                   ↓              ↓
          ┌──────────────┐  ┌────────────────┐  ┌──────────┐
          │   Natural    │  │  Filter Edit   │  │ Zustand  │
          │  Language    │  │   Components   │  │  Store   │
          │  Processing  │  │                │  │          │
          └──────────────┘  └────────────────┘  └──────────┘
                    ↓              ↓                   ↓
          ┌──────────────┐  ┌────────────────┐  ┌──────────┐
          │  Pattern     │  │  Expression    │  │  Config  │
          │  Matcher/    │  │   Builder      │  │  State   │
          │  LLM API     │  │                │  │          │
          └──────────────┘  └────────────────┘  └──────────┘
                    ↓              ↓                   ↓
          ┌──────────────────────────────────────────────────┐
          │          Filter Expression Objects              │
          │  { offset, timeframe, measure, operator,... }   │
          └──────────────────────────────────────────────────┘
                            ↓
          ┌──────────────────────────────────────────────────┐
          │     Render to Inline Editor (Light Theme)       │
          │  [Latest] [Daily] [Close] [>] [#] [40] [×]      │
          └──────────────────────────────────────────────────┘
```

---

## 🔄 Magic Filters Flow

```
User Types Query
    ↓
"stocks up by 4% and rising volume"
    ↓
┌─────────────────────────┐
│  Natural Language       │
│  Pattern Matching       │ ← 15+ pattern rules
│  ├─ "stocks up by X%"   │   (Rule-based MVP)
│  ├─ "rising volume"     │
│  ├─ "RSI oversold"      │
│  └─ "hammer pattern"    │
└─────────────────────────┘
    ↓
  NO MATCH? (Optional)
    ↓
┌─────────────────────────┐
│  LLM Fallback           │
│  (OpenAI/Claude)        │
│  (Skip if patterns work)│
└─────────────────────────┘
    ↓
Generate Filter Objects:
  Filter 1: { measure: 'close', operator: '>', compareToNumber: 1.04 }
  Filter 2: { measure: 'volume', operator: '>', compareToMeasure: 'SMA(20)' }
    ↓
Display as Pills:
  [stocks up by 4% 🔄] [rising volume 🔄]
    ↓
User Selects Mode:
  ├─ Append: Add to existing filters
  └─ Replace: Clear and use only these
    ↓
Apply & Render in Inline Editor
```

---

## 🎨 Component Hierarchy

```
FilterBuilderLayout
├── Header
│   └── "Stock Screener"
│
├── MagicFiltersPanel (Dark theme)
│   ├── Header: "✨ MAGIC FILTERS"
│   ├── Mode Toggle: [Append] [Replace]
│   ├── TextArea: Natural language input
│   ├── Generate Button: [Sparkles] Generate
│   ├── ExamplePrompts
│   │   ├── "consecutive 5 red candles on 5-min"
│   │   ├── "Doji on 15-min"
│   │   ├── "Green candle on 15-min"
│   │   └── "Gravestone doji"
│   └── FilterDisplayPills (if filters generated)
│       ├── Pill 1 [filter label 🔄]
│       ├── Pill 2 [filter label 🔄]
│       └── Apply Button [green]
│
├── Filter Builder (Light theme)
│   ├── Header: "Stock passes [all/any] of below filters"
│   ├── Add Filter Button: [+] Add Filter
│   │
│   └── InlineFilterEditor (for each filter)
│       ├── InlineSelect: Offset
│       │   └── Dropdown: Latest, 1d_ago, 2d_ago, 5d_ago
│       ├── InlineSelect: Timeframe
│       │   └── Dropdown: Daily, 15min, 5min, Weekly
│       ├── InlineSelect: Attribute (bold)
│       │   └── Dropdown: Close, Open, High, Low, Volume
│       ├── InlineSelect: Operator (purple)
│       │   └── Dropdown: >, <, >=, <=, ==
│       ├── Separator: "#"
│       ├── NumberInput: 40
│       ├── Separator: "×"
│       ├── InlineSelect: Value Type
│       │   └── Dropdown: Number, Measure
│       ├── NumberInput: 1
│       │
│       └── ActionButtons (on hover)
│           ├── Copy [📋]
│           ├── Preview [👁️]
│           ├── Refresh [🔄]
│           └── Delete [❌]
│
└── Footer
    └── Action Buttons: [Run Scan] [Save] [Export]
```

---

## 🎯 State Management (Zustand)

```typescript
interface FilterStore {
  // State
  scanConfig: {
    filters: Filter[];
    segment: string;
    conjunction: 'all' | 'any';
  };
  
  // Actions
  addFilter: () => void;
  updateFilter: (id: string, expression: FilterExpression) => void;
  deleteFilter: (id: string) => void;
  duplicateFilter: (id: string) => void;
  clearAllFilters: () => void;
  
  // Magic Filters Actions
  addMagicFilters: (filters: Filter[], mode: 'append' | 'replace') => void;
  setSegment: (segment: string) => void;
  setConjunction: (conjunction: 'all' | 'any') => void;
}

// Usage in components:
const { scanConfig, addFilter, updateFilter } = useFilterStore();
```

---

## 📐 Responsive Breakpoints

```css
/* Mobile First Approach */

/* Base (Mobile): < 640px */
.filter-container {
  @apply space-y-3 px-4;
}

/* Tablet: ≥ 640px */
@media (min-width: 640px) {
  .filter-container {
    @apply max-w-2xl mx-auto;
  }
}

/* Desktop: ≥ 1024px */
@media (min-width: 1024px) {
  .filter-container {
    @apply max-w-6xl mx-auto;
  }
}

/* Large Desktop: ≥ 1280px */
@media (min-width: 1280px) {
  .magic-filters {
    @apply grid grid-cols-2 gap-6;
  }
}
```

---

## 🧪 Key Implementation Decisions

### Decision 1: Light Theme ✅

**Chosen**: Light theme (white/gray palette)
**Rationale**: 
- Professional, clean appearance
- Better readability
- Matches Chartink's existing design
- Easier for stock data visualization

```css
Primary Colors:
- Background: #FFFFFF (white)
- Text: #1F2937 (dark gray)
- Accents: #3B82F6 (blue), #EC4899 (pink)
- Borders: #E5E7EB (light gray)
```

### Decision 2: Pattern Matching First ✅

**Chosen**: Rule-based pattern matching as default, LLM as fallback
**Rationale**:
- MVP can work offline
- No API costs
- Predictable results
- Fast (< 100ms)
- Can handle 15+ common patterns

```typescript
// Patterns to implement:
[✅] Price movements: "up by X%", "down by X%"
[✅] Volume: "rising volume", "high volume"
[✅] RSI: "oversold", "overbought"
[✅] Moving Averages: "golden cross"
[✅] Candlestick: "hammer", "doji"
[✅] Ranges: "close between X and Y"
[✅] Fundamentals: "EPS greater than X"
```

### Decision 3: Inline Editing ✅

**Chosen**: Click-to-edit inline components
**Rationale**:
- Fast to interact with
- No modal dialogs (non-intrusive)
- Real-time visual feedback
- Matches your target design

---

## 🚀 Deployment Checklist

### Phase 1: Core Components (Days 1-2)
- [ ] Create all 5 component files
- [ ] Setup Tailwind CSS
- [ ] Add light theme colors
- [ ] Create Zustand store

### Phase 2: Magic Filters (Days 3-4)
- [ ] Implement pattern matcher
- [ ] Create filter generator
- [ ] Add 15+ patterns
- [ ] Test pattern generation

### Phase 3: Integration (Days 5-6)
- [ ] Connect to store
- [ ] Test append/replace
- [ ] Test responsive design
- [ ] Add animations

### Phase 4: Polish (Days 7-8)
- [ ] Add keyboard shortcuts
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Browser testing
- [ ] Mobile testing

### Phase 5: LLM Enhancement (Optional, Days 9-10)
- [ ] Setup OpenAI API
- [ ] Create LLM fallback
- [ ] Add error handling
- [ ] Test edge cases

---

## 📝 Example Filter Transformations

### Example 1: Simple Price Filter
```
Input Query: "stocks up by 5%"

Pattern Match: /stocks?\s+up\s+by\s+(\d+)%/
Generated Filter: {
  offset: 'latest',
  timeframe: 'daily',
  measure: 'close',
  operator: '>',
  valueType: 'measure',
  compareToMeasure: 'close',
  compareToOffset: '1d_ago',
  arithmeticOperator: '*',
  arithmeticValue: 1.05
}

Rendered as:
[Latest] [Daily] [Close] [>] [#] [1.05] [×] [1]
```

### Example 2: Candlestick Pattern
```
Input Query: "hammer"

Pattern Match: /hammer\s+(?:pattern|candle)/i
Generated Filters (3):
  1. { measure: 'close', operator: '>', compareToMeasure: 'open' }
  2. { measure: 'low', operator: '<', compareToMeasure: 'open' }
  3. { measure: 'high', operator: '>', compareToMeasure: 'open' }

Rendered as:
Filter Row 1: [Latest] [15min] [Close] [>] [#] [Open] [×] [1]
Filter Row 2: [Latest] [15min] [Low] [<] [#] [Open] [×] [0.98]
Filter Row 3: [Latest] [15min] [High] [>] [#] [Open] [×] [1.02]
```

---

## 🎨 Color Reference Chart

```
LIGHT THEME PALETTE:

Offset/Timeframe:
  Hex: #9CA3AF
  RGB: (156, 163, 175)
  Name: Gray-400
  
Attributes (Bold):
  Hex: #1F2937
  RGB: (31, 41, 55)
  Name: Gray-800
  
Operators (Colored):
  Hex: #EC4899
  RGB: (236, 72, 153)
  Name: Pink-500
  
Numbers (Input):
  Hex: #3B82F6
  RGB: (59, 130, 246)
  Name: Blue-500
  
Separators:
  Hex: #D1D5DB
  RGB: (209, 213, 219)
  Name: Gray-300
  
Borders:
  Hex: #E5E7EB
  RGB: (229, 231, 235)
  Name: Gray-200
  
Backgrounds:
  Hex: #F9FAFB
  RGB: (249, 250, 251)
  Name: Gray-50
  
Hover:
  Hex: #FFFFFF
  RGB: (255, 255, 255)
  Name: White
```

---

## ✨ Key Features Summary

✅ **Light Theme** - Professional, clean design
✅ **Inline Editing** - Click-to-edit dropdowns
✅ **Magic Filters** - AI-powered natural language
✅ **Pattern Matching** - 15+ built-in patterns
✅ **Real-time Preview** - Instant visual feedback
✅ **Mobile Responsive** - Works on all devices
✅ **Type Safe** - Full TypeScript support
✅ **Accessible** - Keyboard navigation
✅ **Animations** - Smooth transitions
✅ **Append/Replace** - Two modes for filters

---

**Everything you need is documented. Ready to build!** 🚀
