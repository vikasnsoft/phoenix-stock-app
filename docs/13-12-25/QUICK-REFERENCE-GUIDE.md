# 🎨 Complete UI Implementation - Quick Reference
## All Components, Styles & Integration

---

## 📦 File Tree Structure

```
src/
├── components/
│   ├── filters/
│   │   ├── inline-filter-editor.tsx          ✅
│   │   ├── inline-select.tsx                 ✅
│   │   ├── number-input.tsx                  ✅
│   │   ├── filter-builder-container.tsx      ✅
│   │   └── action-buttons.tsx                (New)
│   ├── magic-filters/
│   │   ├── magic-filters-panel.tsx           ✅
│   │   ├── filter-pills.tsx                  (New)
│   │   └── example-prompts.tsx               (New)
│   ├── layouts/
│   │   └── filter-builder-layout.tsx         (New)
│   └── ui/
│       ├── textarea.tsx
│       └── button.tsx
├── lib/
│   ├── types/
│   │   └── filter.types.ts
│   ├── constants/
│   │   ├── offsets.ts
│   │   ├── attributes.ts
│   │   ├── operators.ts
│   │   └── timeframes.ts
│   ├── ai/
│   │   ├── filter-generator.ts
│   │   ├── pattern-matcher.ts
│   │   └── llm-client.ts
│   ├── store/
│   │   └── filter-store.ts
│   └── utils/
│       └── cn.ts
├── styles/
│   ├── globals.css
│   ├── light-theme.css
│   └── animations.css
└── app/
    └── screener/
        └── page.tsx
```

---

## 🎯 Quick Component Snippets

### Snippet 1: Action Buttons Component

```typescript
// src/components/filters/action-buttons.tsx
'use client';

import { Copy, Eye, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ActionButtonsProps {
  onCopy?: () => void;
  onPreview?: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ActionButtons({
  onCopy,
  onPreview,
  onRefresh,
  onDelete,
  className = ''
}: ActionButtonsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {onCopy && (
        <button
          onClick={onCopy}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 transition-colors"
          title="Copy filter"
        >
          <Copy className="w-4 h-4" />
        </button>
      )}

      {onPreview && (
        <button
          onClick={onPreview}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 transition-colors"
          title="Preview"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 transition-colors"
          title="Regenerate"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-100 rounded text-red-600 hover:text-red-700 transition-colors"
          title="Delete"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
```

### Snippet 2: Example Prompts Component

```typescript
// src/components/magic-filters/example-prompts.tsx
'use client';

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
}

const EXAMPLES = [
  'consecutive 5 red candles on 5-min',
  'Doji on 15-min',
  'Green candle on 15-min',
  'Gravestone doji',
  'stocks up by 4% and rising volume',
  'RSI oversold',
  'Golden cross',
  'hammer pattern'
];

export function ExamplePrompts({ onSelect }: ExamplePromptsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLES.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
```

### Snippet 3: Filter Pills Display

```typescript
// src/components/magic-filters/filter-display-pills.tsx
'use client';

import { RefreshCw, X } from 'lucide-react';

interface FilterDisplayPillsProps {
  filters: { label: string; id: string }[];
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
}

export function FilterDisplayPills({
  filters,
  onRefresh,
  onRemove
}: FilterDisplayPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <div
          key={filter.id}
          className="group inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <span className="text-sm text-slate-900">{filter.label}</span>

          <button
            onClick={() => onRefresh(filter.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-slate-600"
          >
            <RefreshCw className="w-3 h-3" />
          </button>

          <button
            onClick={() => onRemove(filter.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎨 Complete CSS Styles

### Global Styles

```css
/* src/styles/globals.css */

@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Remove default styles */
* {
  @apply m-0 p-0 box-border;
}

html, body {
  width: 100%;
  height: 100%;
}

body {
  @apply bg-white text-gray-900 font-sans;
}

/* Typography */
h1 { @apply text-3xl font-bold text-gray-900; }
h2 { @apply text-2xl font-bold text-gray-900; }
h3 { @apply text-lg font-semibold text-gray-900; }
h4 { @apply text-base font-semibold text-gray-900; }
h5 { @apply text-sm font-semibold text-gray-900; }
h6 { @apply text-xs font-semibold text-gray-900; }

p { @apply text-gray-700 leading-relaxed; }

/* Links */
a {
  @apply text-blue-600 hover:text-blue-700 transition-colors;
}

/* Forms */
input, textarea, select {
  @apply font-sans;
}

input[type="text"],
input[type="number"],
textarea,
select {
  @apply px-3 py-2 border border-gray-300 rounded-md;
  @apply bg-white text-gray-900;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  @apply transition-all;
}

/* Buttons */
button {
  @apply font-sans font-medium cursor-pointer;
  @apply transition-all duration-200;
}

/* Focus visible for accessibility */
*:focus-visible {
  @apply outline-2 outline-offset-2 outline-blue-500;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded hover:bg-gray-600;
}
```

### Light Theme Utilities

```css
/* src/styles/light-theme.css */

/* Color Variables */
:root {
  --color-offset: #9CA3AF;
  --color-timeframe: #9CA3AF;
  --color-attribute: #1F2937;
  --color-operator: #EC4899;
  --color-number: #3B82F6;
  --color-separator: #D1D5DB;
  --color-border: #E5E7EB;
  --color-border-light: #F3F4F6;
  --color-hover: #F9FAFB;
}

/* Offset & Timeframe */
.text-offset,
.text-timeframe {
  color: var(--color-offset);
  font-weight: 500;
}

/* Attribute (bold) */
.text-attribute {
  color: var(--color-attribute);
  font-weight: 600;
}

/* Operator (colored) */
.text-operator {
  color: var(--color-operator);
  font-weight: 600;
}

/* Separator */
.text-separator {
  color: var(--color-separator);
}

/* Filter Row Container */
.filter-row {
  @apply rounded-lg border bg-white transition-all;
  border-color: var(--color-border);
}

.filter-row:hover {
  @apply bg-gray-50;
  border-color: var(--color-separator);
}

/* Filter Row Group */
.filter-row-group {
  @apply space-y-3;
}

/* Magic Filters */
.magic-filters {
  @apply rounded-lg p-6 border;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-color: #334155;
}

.magic-filters .input {
  @apply bg-slate-800 text-white border-slate-700 placeholder:text-slate-500;
}

.magic-pill {
  @apply inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors;
  @apply bg-slate-700 hover:bg-slate-600;
}

/* Action Buttons Container */
.action-buttons {
  @apply flex items-center gap-1 opacity-0 transition-opacity;
}

.filter-row:hover .action-buttons {
  @apply opacity-100;
}

/* Empty State */
.empty-state {
  @apply text-center py-12 border-2 border-dashed rounded-lg bg-gray-50;
  border-color: var(--color-border);
}

.empty-state p {
  @apply text-gray-500;
}
```

### Animations

```css
/* src/styles/animations.css */

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-slide-down {
  animation: slideDown 0.2s ease-out;
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

.animate-pulse-slow {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Smooth transitions */
.transition-smooth {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover lift effect */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

---

## 🔌 Integration Example

```typescript
// src/app/screener/page.tsx

'use client';

import { useState } from 'react';
import { FilterBuilderLayout } from '@/components/layouts/filter-builder-layout';
import { MagicFiltersPanel } from '@/components/magic-filters/magic-filters-panel';
import { InlineFilterEditor } from '@/components/filters/inline-filter-editor';
import { useFilterStore } from '@/lib/store/filter-store';
import { Plus } from 'lucide-react';

export default function ScreenerPage() {
  const {
    scanConfig,
    addFilter,
    updateFilter,
    deleteFilter,
    duplicateFilter
  } = useFilterStore();

  return (
    <FilterBuilderLayout>
      {/* Magic Filters Section */}
      <MagicFiltersPanel />

      {/* Filter Builder Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Stock passes <span className="text-blue-600">{scanConfig.conjunction}</span> of the below filters in{' '}
            <span className="text-blue-600">{scanConfig.segment}</span> segment:
          </h2>
          <button
            onClick={() => addFilter()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Filter
          </button>
        </div>

        {/* Filters List */}
        <div className="filter-row-group">
          {scanConfig.filters.length > 0 ? (
            scanConfig.filters.map((filter) => (
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
            ))
          ) : (
            <div className="empty-state">
              <p>No filters yet. Use Magic Filters or add one manually.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mt-8">
        <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
          Run Scan
        </button>
        <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors">
          Save Scan
        </button>
        <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors">
          Export
        </button>
      </div>
    </FilterBuilderLayout>
  );
}
```

---

## 📱 Tailwind Config

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light theme colors
        'slate-serenity': '#94A3B8',
        'deep-plum': '#EC4899',
        'powder-blue': '#3B82F6',
      },
      animation: {
        'slide-down': 'slideDown 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
export default config
```

---

## ✅ Final Checklist

- [ ] Copy all component files
- [ ] Update globals.css
- [ ] Add light-theme.css
- [ ] Add animations.css
- [ ] Update tailwind.config.ts
- [ ] Create page.tsx
- [ ] Test all interactions
- [ ] Test mobile responsiveness
- [ ] Test keyboard navigation
- [ ] Add loading states
- [ ] Add error handling
- [ ] Deploy 🚀

---

**You now have everything needed to build this UI!** 🎉
