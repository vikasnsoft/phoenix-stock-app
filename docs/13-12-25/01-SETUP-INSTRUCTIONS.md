# 🚀 Step 1: Setup Instructions

## Prerequisites Check

Your `package.json` shows you already have most dependencies! ✅

### Verify Installation

```bash
# Check if all dependencies are installed
npm list zustand @radix-ui/react-select lucide-react react-hook-form zod
```

## Project Setup

### 1. Create Directory Structure

Run this command in your project root:

```bash
# Create all necessary directories
mkdir -p src/components/screener
mkdir -p src/lib/types
mkdir -p src/lib/constants
mkdir -p src/lib/utils
mkdir -p src/lib/store
mkdir -p src/lib/hooks
mkdir -p src/app/screener
```

### 2. Verify TypeScript Configuration

Ensure `tsconfig.json` has path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

### 3. Install Additional Dependencies (if needed)

```bash
# Only install if not present
npm install uuid
npm install -D @types/uuid
```

### 4. Configure Tailwind (if not done)

**tailwind.config.ts**:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Chartink-inspired colors
        'slate-serenity': '#94A3B8',
        'deep-plum': '#AD15AD',
        'powder-blue': '#93C5FD',
        'rustic-flame': '#FF6B4A',
        'dynamic-ocean': '#4A9FF5',
      },
    },
  },
  plugins: [],
}
export default config
```

### 5. Update Global Styles

**src/app/globals.css**:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

/* Custom scrollbar for dark theme */
.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.dark ::-webkit-scrollbar-track {
  background: rgb(31 41 55);
}

.dark ::-webkit-scrollbar-thumb {
  background: rgb(75 85 99);
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: rgb(107 114 128);
}

/* Inline select animations */
.inline-select-enter {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 6. Create UI Component Utilities

If you don't have them already, create:

**src/lib/utils/cn.ts**:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Project Structure After Setup

```
your-project/
├── src/
│   ├── app/
│   │   ├── screener/
│   │   │   └── page.tsx (to be created)
│   │   ├── layout.tsx
│   │   └── globals.css (updated)
│   ├── components/
│   │   ├── screener/ (empty, ready for components)
│   │   └── ui/ (your existing Radix components)
│   └── lib/
│       ├── types/ (empty, ready for types)
│       ├── constants/ (empty, ready for constants)
│       ├── utils/
│       │   └── cn.ts (created)
│       ├── store/ (empty, ready for Zustand)
│       └── hooks/ (empty, ready for custom hooks)
├── package.json (already configured ✅)
├── tsconfig.json (verify paths)
└── tailwind.config.ts (updated)
```

## Verification Checklist

Before proceeding, verify:

- [ ] All directories created
- [ ] TypeScript path aliases configured
- [ ] Tailwind CSS configured with custom colors
- [ ] Global styles updated
- [ ] `cn()` utility created
- [ ] All dependencies installed (run `npm install`)
- [ ] Dev server runs without errors (`npm run dev`)

## Test Your Setup

Create a test page to verify everything works:

**src/app/screener/page.tsx**:

```typescript
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'

export default function ScreenerPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-4">Stock Screener</h1>
      <Button>
        <PlusIcon className="mr-2 h-4 w-4" />
        Add Filter
      </Button>
    </div>
  )
}
```

Visit `http://localhost:3000/screener` to verify:
- Dark mode works
- Lucide icons render
- Radix Button component works
- Tailwind styles apply

## Troubleshooting

### Issue: Module not found '@/...'
**Solution**: Restart TypeScript server in your IDE (VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server")

### Issue: Tailwind classes not applying
**Solution**: 
1. Check `tailwind.config.ts` content paths
2. Restart dev server
3. Clear `.next` folder: `rm -rf .next && npm run dev`

### Issue: Dark mode not working
**Solution**: Ensure `next-themes` is set up in your layout:

```typescript
// app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## Ready? ✅

Once all checks pass, proceed to:

👉 **Next**: [02-TYPE-DEFINITIONS.md](./02-TYPE-DEFINITIONS.md)
