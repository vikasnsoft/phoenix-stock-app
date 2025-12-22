# 📋 Chartink-Style Filter Builder - Project Overview

## Project Description

Build a professional, inline-style stock screener filter builder UI similar to Chartink's scanner. The interface displays filters as readable sentences with interactive components, allowing users to create complex technical and fundamental stock filters.

## Key Features

### ✨ Core Functionality
- **Inline Sentence-Style Display**: Filters read like natural language
- **Click-to-Edit Components**: All elements are inline-editable
- **Multiple Filter Support**: Combine filters with AND/OR logic
- **Grouped Filters**: Create nested filter logic
- **Parameter Editing**: Edit indicator parameters inline
- **Drag & Drop**: Reorder filters easily
- **Real-time Validation**: Instant feedback on filter validity

### 🎨 UI/UX Features
- **Dark Mode Interface**: Professional dark theme
- **Color-Coded Elements**: Visual hierarchy with distinct colors
- **Action Icons**: Copy, Duplicate, Toggle, Delete per filter
- **Responsive Design**: Works on desktop and mobile
- **Keyboard Navigation**: Full keyboard support

### 🔧 Technical Features
- **Type Safety**: Full TypeScript support
- **State Management**: Zustand for efficient state
- **Form Validation**: Zod schemas
- **Reusable Components**: Radix UI primitives
- **Performance Optimized**: React 19 features

## Tech Stack (From Your package.json)

### Frontend Framework
- **Next.js 16.0.3** - React framework with App Router
- **React 19.2.0** - Latest React with compiler
- **TypeScript 5** - Type safety

### State & Data Management
- **Zustand 5.0.8** ✅ Already installed
- **TanStack Query 5.90.10** ✅ Already installed
- **React Hook Form 7.66.0** ✅ Already installed
- **Zod 4.1.12** ✅ Already installed

### UI Components & Styling
- **Radix UI** ✅ Already installed (Dialog, Dropdown, Select, Popover, Switch, Tabs, Toast, Tooltip)
- **Tailwind CSS 4** ✅ Already installed
- **Lucide React 0.553.0** ✅ Already installed
- **CVA & clsx** ✅ Already installed

## Project Structure

```
src/
├── app/
│   └── screener/
│       └── page.tsx              # Screener page
├── components/
│   ├── screener/
│   │   ├── filter-builder.tsx
│   │   ├── filter-header.tsx
│   │   ├── filter-row.tsx
│   │   ├── filter-group.tsx
│   │   ├── inline-select.tsx
│   │   ├── parameter-input.tsx
│   │   └── action-buttons.tsx
│   └── ui/                        # Already exists (Radix)
├── lib/
│   ├── types/
│   │   └── filter.types.ts
│   ├── constants/
│   │   ├── attributes.ts
│   │   ├── indicators.ts
│   │   ├── operators.ts
│   │   └── offsets.ts
│   ├── utils/
│   │   ├── filter-validator.ts
│   │   └── filter-builder.ts
│   └── store/
│       └── filter-store.ts
```

## Implementation Steps

| Step | File | Estimated Time | Complexity |
|------|------|----------------|------------|
| 1 | Setup & Verification | 30 min | ⭐ Easy |
| 2 | Type Definitions | 1 hour | ⭐⭐ Medium |
| 3 | Constants Setup | 1 hour | ⭐⭐ Medium |
| 4 | State Management | 2 hours | ⭐⭐⭐ Advanced |
| 5 | Reusable Components | 3 hours | ⭐⭐⭐ Advanced |
| 6 | Filter Components | 4 hours | ⭐⭐⭐⭐ Expert |
| 7 | Main Builder | 2 hours | ⭐⭐⭐ Advanced |
| 8 | Validation & Utils | 1 hour | ⭐⭐ Medium |
| 9 | Testing | 2 hours | ⭐⭐ Medium |
| 10 | Deployment | 1 hour | ⭐ Easy |

**Total**: 17-19 hours

## Visual Design Reference

### Filter Row Example
```
Daily Close Greater than Daily SMA(close, 100)
  ↓      ↓        ↓          ↓      ↓
Offset  Attr   Operator   Offset  Indicator(params)
```

### Color Scheme
- **Offsets**: `#94A3B8` (Slate gray)
- **Operators**: `#AD15AD` (Deep purple)
- **Measures**: `#FFFFFF` (White, bold)
- **Parameters**: `#93C5FD` (Blue)
- **Backgrounds**: `rgba(80, 184, 241, 0.1)` (Light blue tint)

## Getting Started

👉 **Next**: [01-SETUP-INSTRUCTIONS.md](./01-SETUP-INSTRUCTIONS.md)

Follow the steps sequentially for best results.
