# 🏗️ Step 7: Main Filter Builder

Assemble all components into the main builder.

## File Location

Create: `src/components/screener/filter-builder.tsx`

## Key Features

- Renders all filters
- Add filter buttons
- Run scan action
- Save/load scans
- Clear all

## Page Integration

Create: `src/app/screener/page.tsx`

```typescript
import { FilterBuilder } from '@/components/screener/filter-builder';

export default function ScreenerPage() {
  return (
    <div className="min-h-screen bg-background">
      <FilterBuilder />
    </div>
  );
}
```

Visit: `http://localhost:3000/screener`

👉 **Next**: [08-VALIDATION-UTILS.md](./08-VALIDATION-UTILS.md)
