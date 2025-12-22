# Phoenix Stock Scanner - Web Client

This is the frontend application for the Phoenix Stock Scanner, built with Next.js 14+ (App Router), TypeScript, and Shadcn/UI. It provides a modern, unified interface for building powerful stock scans.

## 🚀 Built Features

- **Modern Tech Stack**: Next.js App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Unified Scan Interface**:
  - **Magic Filters Panel**: "Google-like" search bar for natural language queries (e.g. "RSI above 70").
    - Powered by backend NL Parser.
    - Supports "Append" and "Replace" modes.
  - **Inline Filter Editor**: A structured, sentence-based editor for fine-tuning filters.
    - Components: `InlineSelect`, `NumberInput`, `TimeframeSelector`.
    - Supports complex logic: Indicators, Math Operations (`Close > SMA * 1.02`), Dynamic Params.
- **State Management**:
  - `Zustand`: Global store for filter state (`filter-store.ts`), ensuring efficient updates and persistence.
- **Visuals & Theme**:
  - **Dual Theme Support**: Dark mode default for "Pro" feel, with specific light-theme optimizations (`light-theme.css`).
  - **Premium Aesthetics**: Glassmorphism, linear gradients, and smooth transitions.
  - **Responsive Design**: Mobile-friendly layout (mostly).

## ⏳ Pending / Future Work

- **Real-Time Data**: Integration with WebSockets for live price updates on the results grid.
- **Results Grid**: Enhancement of the results table with more columns, sorting, and inline charts (sparklines).
- **Authentication UI**: Login/Signup pages and protected routes (once API auth is ready).
- **Charting**: Integration of a full-featured charting library (e.g. TradingView Lightweight Charts) for visualizing scan hits.

## 🛠 Usage

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Dev Server**:
    ```bash
    npm run dev
    ```
    The app runs on `http://localhost:3000`.

## 📝 Configuration

- `NEXT_PUBLIC_API_URL`: URL for the backend API proxy or direct (default checks `next.config.ts`, usually proxies to `localhost:4001`).
