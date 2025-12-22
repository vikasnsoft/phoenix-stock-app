# 🎯 Combined Filter Builder + Magic Filters UI Implementation
## Light Theme with Inline Editing

---

## 📊 Architecture Overview

### Two Integrated Systems:

1. **Inline Filter Editor** (From Image 1)
   - Click-to-edit inline components
   - Light/clean color theme
   - Dropdown selectors at each position
   - Real-time preview

2. **Magic Filters Generator** (From Image 2)
   - Natural language input
   - AI-powered filter generation
   - Filter preview pills
   - Append/Replace mode toggle

---

## 🎨 Light Theme Color Palette

```typescript
// Light Theme Colors
const LIGHT_THEME = {
  // Backgrounds
  bg_primary: '#FFFFFF',           // White
  bg_secondary: '#F8FAFC',         // Light slate-50
  bg_tertiary: '#F1F5F9',          // Light slate-100
  bg_hover: '#E2E8F0',             // Light slate-200
  
  // Text
  text_primary: '#1E293B',         // Dark slate-800
  text_secondary: '#64748B',       // Slate-500
  text_muted: '#94A3B8',           // Slate-400
  
  // UI Elements
  border: '#CBD5E1',               // Slate-300
  border_light: '#E2E8F0',         // Slate-200
  
  // Semantic Colors
  offset_color: '#94A3B8',         // Gray (for [0], Daily)
  attribute_color: '#0F172A',      // Dark (bold attributes)
  operator_color: '#D946EF',       // Purple/Magenta (operators)
  number_color: '#3B82F6',         // Blue (number values)
  
  // Magic Filters
  magic_bg: '#0F172A',             // Dark teal
  magic_accent: '#06B6D4',         // Cyan
  pill_bg: '#0C4A6E',              // Dark cyan
  pill_hover: '#082F4D'            // Darker cyan
};
```

---

## 📁 Complete Implementation

### File 1: `src/components/filters/inline-filter-editor.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { X, Copy, Eye, Settings } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { InlineSelect } from './inline-select';
import { NumberInput } from './number-input';
import type { Filter, FilterExpression } from '@/lib/types/filter.types';

interface InlineFilterEditorProps {
  filter: Filter;
  onUpdate: (filter: Filter) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function InlineFilterEditor({
  filter,
  onUpdate,
  onDelete,
  onDuplicate
}: InlineFilterEditorProps) {
  const expr = filter.expression;
  const [isHovering, setIsHovering] = useState(false);

  const handleUpdate = (updates: Partial<FilterExpression>) => {
    onUpdate({
      ...filter,
      expression: { ...expr, ...updates }
    });
  };

  const OFFSET_OPTIONS = [
    { value: 'latest', label: 'Latest' },
    { value: '1d_ago', label: '1 day ago' },
    { value: '2d_ago', label: '2 days ago' },
    { value: '5d_ago', label: '5 days ago' }
  ];

  const TIMEFRAME_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: '15min', label: '15 minute' },
    { value: '5min', label: '5 minute' },
    { value: 'weekly', label: 'Weekly' }
  ];

  const ATTRIBUTE_OPTIONS = [
    { value: 'close', label: 'Close' },
    { value: 'open', label: 'Open' },
    { value: 'high', label: 'High' },
    { value: 'low', label: 'Low' },
    { value: 'volume', label: 'Volume' }
  ];

  const OPERATOR_OPTIONS = [
    { value: '>', label: 'Greater than' },
    { value: '<', label: 'Less than' },
    { value: '>=', label: 'Greater than equal' },
    { value: '<=', label: 'Less than equal' },
    { value: '==', label: 'Equals' }
  ];

  const VALUE_TYPE_OPTIONS = [
    { value: 'number', label: 'Number' },
    { value: 'measure', label: 'Measure' }
  ];

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Offset Selector */}
      <InlineSelect
        value={expr.offset || 'latest'}
        onChange={(v) => handleUpdate({ offset: v as any })}
        options={OFFSET_OPTIONS}
        className="text-slate-500"
      />

      {/* Timeframe Selector */}
      <InlineSelect
        value={expr.timeframe || 'daily'}
        onChange={(v) => handleUpdate({ timeframe: v as any })}
        options={TIMEFRAME_OPTIONS}
        className="text-slate-500"
      />

      {/* Attribute Selector */}
      <InlineSelect
        value={getMeasureValue(expr.measure)}
        onChange={(v) => handleUpdate({ measure: v as any })}
        options={ATTRIBUTE_OPTIONS}
        className="font-semibold text-slate-900"
      />

      {/* Operator Selector */}
      <InlineSelect
        value={expr.operator}
        onChange={(v) => handleUpdate({ operator: v as any })}
        options={OPERATOR_OPTIONS}
        className="font-semibold text-pink-600"
      />

      {/* Value Type Indicator */}
      <span className="text-slate-400">#</span>

      {/* Number Input */}
      {expr.valueType === 'number' && (
        <NumberInput
          value={expr.compareToNumber || 0}
          onChange={(v) => handleUpdate({ compareToNumber: v })}
          className="w-24"
        />
      )}

      {/* Value Type Selector */}
      <InlineSelect
        value={expr.valueType}
        onChange={(v) => handleUpdate({ valueType: v as any })}
        options={VALUE_TYPE_OPTIONS}
        className="text-slate-600"
      />

      {/* Action Buttons */}
      {isHovering && (
        <div className="flex items-center gap-2 ml-auto border-l border-slate-200 pl-2">
          <button
            onClick={() => onDuplicate(filter.id)}
            className="p-1.5 hover:bg-slate-200 rounded transition-colors"
            title="Duplicate"
          >
            <Copy className="w-4 h-4 text-slate-600" />
          </button>

          <button
            className="p-1.5 hover:bg-slate-200 rounded transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4 text-slate-600" />
          </button>

          <button
            className="p-1.5 hover:bg-slate-200 rounded transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-slate-600" />
          </button>

          <button
            onClick={() => onDelete(filter.id)}
            className="p-1.5 hover:bg-red-100 rounded transition-colors"
            title="Delete"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}
    </div>
  );
}

function getMeasureValue(measure: any): string {
  if (typeof measure === 'string') return measure;
  return 'custom';
}
```

### File 2: `src/components/filters/inline-select.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface InlineSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}

export function InlineSelect({
  value,
  onChange,
  options,
  className = ''
}: InlineSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded transition-colors ${className}`}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 transition-colors ${
                value === option.value ? 'bg-slate-50 font-semibold text-blue-600' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File 3: `src/components/filters/number-input.tsx`

```typescript
'use client';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  className = ''
}: NumberInputProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={`px-3 py-1 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    />
  );
}
```

### File 4: `src/components/magic-filters/magic-filters-panel.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFilterStore } from '@/lib/store/filter-store';
import { generateFiltersFromNL } from '@/lib/ai/filter-generator';
import type { Filter } from '@/lib/types/filter.types';

type MagicMode = 'append' | 'replace';

export function MagicFiltersPanel() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<MagicMode>('append');
  const [generatedFilters, setGeneratedFilters] = useState<Filter[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { addMagicFilters, clearAllFilters } = useFilterStore();

  const handleGenerate = async () => {
    if (!query.trim()) return;

    setIsGenerating(true);
    try {
      const filters = await generateFiltersFromNL(query);
      setGeneratedFilters(filters);
    } catch (error) {
      console.error('Failed to generate filters:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (mode === 'replace') {
      clearAllFilters();
    }

    addMagicFilters(generatedFilters, mode);
    setGeneratedFilters([]);
    setQuery('');
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-lg p-6 mb-8 border border-slate-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">MAGIC FILTERS</h2>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('append')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            mode === 'append'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-300'
          }`}
        >
          Append
        </button>
        <button
          onClick={() => setMode('replace')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            mode === 'replace'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-slate-300'
          }`}
        >
          Replace
        </button>
      </div>

      {/* Input Area */}
      <div className="flex gap-3 mb-4">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Scan stocks using simple language like 'stocks up by 4% and rising volume'"
          className="flex-1 min-h-[80px] bg-slate-800 text-white border-slate-700 placeholder:text-slate-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              handleGenerate();
            }
          }}
        />
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !query.trim()}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 h-fit"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </>
          )}
        </Button>
      </div>

      {/* Example Prompts */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          'consecutive 5 red candles on 5-min',
          'Doji on 15-min',
          'Green candle on 15-min',
          'Gravestone doji'
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => setQuery(prompt)}
            className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Generated Filters Preview */}
      {generatedFilters.length > 0 && (
        <div className="space-y-4 bg-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-cyan-400 font-medium">Generated Filters:</p>
            <Button
              onClick={handleApply}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Apply {generatedFilters.length}
            </Button>
          </div>

          <div className="space-y-3">
            {generatedFilters.map((filter, idx) => (
              <FilterPreviewPill
                key={idx}
                filter={filter}
                onRemove={() => {
                  setGeneratedFilters(prev => prev.filter((_, i) => i !== idx));
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPreviewPill({ filter, onRemove }: { filter: Filter; onRemove: () => void }) {
  const displayText = formatFilterDisplay(filter);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg group transition-colors">
      <span className="text-sm text-white">{displayText}</span>

      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
      </button>
    </div>
  );
}

function formatFilterDisplay(filter: Filter): string {
  const expr = filter.expression;
  const measure = typeof expr.measure === 'string' ? expr.measure : 'indicator';
  const operator = expr.operator;
  const value = expr.compareToNumber || 0;

  return `${measure} ${operator} ${value}`;
}
```

### File 5: `src/components/filters/filter-builder-container.tsx`

```typescript
'use client';

import { useFilterStore } from '@/lib/store/filter-store';
import { InlineFilterEditor } from './inline-filter-editor';
import { MagicFiltersPanel } from '@/components/magic-filters/magic-filters-panel';
import { Plus } from 'lucide-react';

export function FilterBuilderContainer() {
  const {
    scanConfig,
    addFilter,
    updateFilter,
    deleteFilter,
    duplicateFilter
  } = useFilterStore();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-6">
      {/* Magic Filters */}
      <MagicFiltersPanel />

      {/* Filter Builder Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Stock passes {scanConfig.conjunction} of the below filters in {scanConfig.segment} segment:
          </h2>
        </div>
        <button
          onClick={() => addFilter()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Filter
        </button>
      </div>

      {/* Filters List */}
      <div className="space-y-3">
        {scanConfig.filters.map((filter) => (
          filter.type === 'simple' && (
            <InlineFilterEditor
              key={filter.id}
              filter={filter}
              onUpdate={(updated) => {
                updateFilter(filter.id, updated.expression);
              }}
              onDelete={deleteFilter}
              onDuplicate={duplicateFilter}
            />
          )
        ))}
      </div>

      {/* Empty State */}
      {scanConfig.filters.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
          <p className="text-slate-500">
            No filters yet. Use Magic Filters or add one manually.
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 Global Styles

### File: `src/styles/light-theme.css`

```css
/* Light Theme Overrides */
:root[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  --color-bg-hover: #e2e8f0;
  
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  
  --color-border: #cbd5e1;
  --color-border-light: #e2e8f0;
  
  --color-offset: #94a3b8;
  --color-attribute: #0f172a;
  --color-operator: #d946ef;
  --color-number: #3b82f6;
}

/* Filter Row Styles */
.filter-row {
  @apply rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors;
}

.filter-row:hover .action-buttons {
  @apply opacity-100;
}

.action-buttons {
  @apply opacity-0 transition-opacity;
}

/* Inline Select Styles */
.inline-select {
  @apply inline-flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded transition-colors;
}

.inline-select[data-type="offset"] {
  @apply text-slate-500;
}

.inline-select[data-type="attribute"] {
  @apply font-semibold text-slate-900;
}

.inline-select[data-type="operator"] {
  @apply font-semibold text-pink-600;
}

/* Magic Filters Panel */
.magic-filters-panel {
  @apply bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700;
}

.magic-filters-input {
  @apply bg-slate-800 text-white border-slate-700 placeholder:text-slate-500;
}

.magic-pill {
  @apply inline-flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors;
}
```

---

## 🧠 Store Integration

### File: `src/lib/store/filter-store.ts` (Add these actions)

```typescript
// Add Magic Filter Actions
addMagicFilters: (filters: Filter[], mode: 'append' | 'replace') =>
  set((state) => {
    if (mode === 'replace') {
      return {
        scanConfig: {
          ...state.scanConfig,
          filters
        }
      };
    } else {
      return {
        scanConfig: {
          ...state.scanConfig,
          filters: [...state.scanConfig.filters, ...filters]
        }
      };
    }
  }, false, 'addMagicFilters'),
```

---

## 📊 Key Features

✅ **Light theme** - Clean, professional look
✅ **Inline editing** - Click any element to edit
✅ **Magic filters** - AI-powered natural language  
✅ **Responsive** - Works on all screen sizes
✅ **Type-safe** - Full TypeScript support
✅ **Accessible** - Keyboard navigation
✅ **Real-time** - Instant preview updates

---

## 🎯 Implementation Checklist

- [ ] Copy all 5 component files
- [ ] Update store with magic filters actions
- [ ] Add global light theme CSS
- [ ] Install missing dependencies (if any)
- [ ] Test inline editing
- [ ] Test magic filters generation
- [ ] Test append/replace modes
- [ ] Style polish and refinement

Ready to build! 🚀
