# 📚 Chartink-Style Filter Builder - Implementation Guide

## Overview

Complete step-by-step documentation for building a professional stock screener filter builder UI similar to Chartink, using Next.js 16, React 19, TypeScript, and Zustand.

## 🎯 What You'll Build

An inline, sentence-style filter builder that displays as:

```
Stock passes all of the below filters in cash segment:

Daily Close Greater than number 500
Daily RSI(14) Greater than number 70  
Daily SMA(close, 50) crosses above Daily SMA(close, 200)
```

## 📋 Documentation Files

Follow these files in order:

| Step | File | Description | Time |
|------|------|-------------|------|
| 0 | [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md) | Project introduction & tech stack | 15 min |
| 1 | [01-SETUP-INSTRUCTIONS.md](./01-SETUP-INSTRUCTIONS.md) | Project setup & verification | 30 min |
| 2 | [02-TYPE-DEFINITIONS.md](./02-TYPE-DEFINITIONS.md) | TypeScript types & interfaces | 1 hour |
| 3 | [03-CONSTANTS-SETUP.md](./03-CONSTANTS-SETUP.md) | Constants for dropdowns | 1 hour |
| 4 | [04-STATE-MANAGEMENT.md](./04-STATE-MANAGEMENT.md) | Zustand store setup | 2 hours |
| 5 | [05-REUSABLE-COMPONENTS.md](./05-REUSABLE-COMPONENTS.md) | Reusable UI components | 3 hours |
| 6 | [06-FILTER-COMPONENTS.md](./06-FILTER-COMPONENTS.md) | Filter-specific components | 4 hours |
| 7 | [07-MAIN-BUILDER.md](./07-MAIN-BUILDER.md) | Main builder assembly | 2 hours |
| 8 | [08-VALIDATION-UTILS.md](./08-VALIDATION-UTILS.md) | Validation logic | 1 hour |
| 9 | [09-TESTING-GUIDE.md](./09-TESTING-GUIDE.md) | Testing checklist | 2 hours |
| 10 | [10-DEPLOYMENT.md](./10-DEPLOYMENT.md) | Production deployment | 1 hour |

**Total Estimated Time**: 17-19 hours

## 🚀 Quick Start

```bash
# 1. Read project overview
cat docs/00-PROJECT-OVERVIEW.md

# 2. Start with setup
cat docs/01-SETUP-INSTRUCTIONS.md

# 3. Follow steps 2-10 sequentially
```

## 📦 Your Existing Dependencies (Already Installed!)

Based on your `package.json`:

✅ Next.js 16.0.3  
✅ React 19.2.0  
✅ TypeScript 5  
✅ Zustand 5.0.8  
✅ Radix UI (all components)  
✅ Tailwind CSS 4  
✅ Lucide React  
✅ React Hook Form  
✅ Zod  
✅ TanStack Query

**Additional needed**: `uuid` and `@types/uuid`

## 🎨 Key Features

- ✨ Inline sentence-style display
- 🎯 Click-to-edit components
- 🔄 Drag & drop reordering
- 👥 Grouped filters (AND/OR logic)
- 🎨 Dark mode UI
- ⚡ Real-time validation
- 📱 Responsive design
- ⌨️ Keyboard navigation
- 🔒 Full TypeScript support

## 📂 Project Structure

```
src/
├── app/
│   └── screener/
│       └── page.tsx
├── components/
│   ├── screener/
│   │   ├── filter-builder.tsx
│   │   ├── filter-header.tsx
│   │   ├── filter-row.tsx
│   │   ├── inline-select.tsx
│   │   └── parameter-input.tsx
│   └── ui/ (your existing Radix components)
├── lib/
│   ├── types/
│   │   └── filter.types.ts
│   ├── constants/
│   │   ├── offsets.ts
│   │   ├── attributes.ts
│   │   ├── indicators.ts
│   │   └── operators.ts
│   ├── store/
│   │   └── filter-store.ts
│   └── utils/
│       └── filter-validator.ts
```

## 🎯 Implementation Strategy

### Phase 1: Foundation (Steps 0-3)
- Set up project structure
- Define types and constants
- **Outcome**: Type-safe foundation

### Phase 2: State (Step 4)
- Implement Zustand store
- **Outcome**: Working state management

### Phase 3: UI (Steps 5-7)
- Build reusable components
- Create filter components
- Assemble main builder
- **Outcome**: Complete UI

### Phase 4: Polish (Steps 8-10)
- Add validation
- Test thoroughly
- Deploy to production
- **Outcome**: Production-ready app

## 🔍 Example Filter Patterns

### Simple Comparison
```
Daily Close > 500
```

### Indicator-Based
```
Daily RSI(14) > 70
```

### Crossover
```
Daily SMA(close, 50) crosses above Daily SMA(close, 200)
```

### Gap Up
```
Latest Open > 1 day ago Close * 1.03
```

### Complex Multi-Filter
```
Stock passes all of the below filters:
  Daily Close > Daily SMA(close, 100)
  Daily Close > Daily SMA(close, 20)
  Daily RSI(14) > 50
  Latest Volume > Daily SMA(volume, 20) * 1.5
```

## 🎨 Design System

### Colors (from Chartink)
- **Offsets**: `#94A3B8` (Slate gray)
- **Operators**: `#AD15AD` (Deep purple)
- **Measures**: `#FFFFFF` (White, bold)
- **Parameters**: `#93C5FD` (Blue)
- **Backgrounds**: `rgba(80, 184, 241, 0.1)` (Light blue)

### Typography
- **Offsets**: Medium weight, gray
- **Measures**: Bold, white
- **Operators**: Bold, purple
- **Parameters**: Small, blue

## ✅ Success Criteria

- [ ] Filters display as readable sentences
- [ ] All components inline-editable
- [ ] Parameters editable in brackets
- [ ] Add/duplicate/toggle/delete works
- [ ] Multiple filters with AND/OR
- [ ] Drag and drop functional
- [ ] Real-time validation
- [ ] Responsive on mobile
- [ ] Keyboard navigation
- [ ] Type-safe throughout

## 🐛 Troubleshooting

### Module not found '@/...'
Restart TypeScript server in your IDE

### Tailwind not working
1. Check config content paths
2. Restart dev server
3. Clear `.next` folder

### Dark mode issues
Ensure `next-themes` provider in layout

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [Radix UI Docs](https://www.radix-ui.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Chartink Original](https://chartink.com/screener)

## 🤝 Contributing

Feel free to:
- Add more indicators
- Improve UX
- Optimize performance
- Fix bugs
- Add tests

## 📄 License

MIT License - feel free to use in your projects!

## 🎉 Let's Build!

Start with Step 0: [00-PROJECT-OVERVIEW.md](./00-PROJECT-OVERVIEW.md)

---

**Built for Windsurf IDE** | **Next.js 16** | **React 19** | **TypeScript** | **Zustand**
