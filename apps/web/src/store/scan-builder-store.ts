import { create } from "zustand";

export interface ScanResultSummary {
  readonly matchedStocksCount?: number;
  readonly totalScanned?: number;
}

export interface ScanBuilderState {
  readonly symbols: string[];
  readonly lastResult?: ScanResultSummary;
  setSymbols: (symbols: string[]) => void;
  setLastResult: (result: ScanResultSummary | undefined) => void;
}

/**
 * useScanBuilderStore provides shared state for the scan builder UI.
 */
export const useScanBuilderStore = create<ScanBuilderState>((set) => ({
  symbols: [],
  lastResult: undefined,
  setSymbols: (symbols: string[]): void => set({ symbols }),
  setLastResult: (result: ScanResultSummary | undefined): void => set({ lastResult: result }),
}));
