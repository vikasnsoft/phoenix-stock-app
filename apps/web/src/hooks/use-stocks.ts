import {
  useSymbolsControllerFindAll,
  useSymbolsControllerSearch,
  useSymbolsControllerGetSectors,
  useSymbolsControllerGetIndustries,
  useSymbolsControllerFindOne
} from "@/lib/api/generated/symbols/symbols";
import { SymbolsControllerFindAllParams } from "@/lib/api/generated/index.schemas";

export function useSymbols(params: SymbolsControllerFindAllParams) {
  return useSymbolsControllerFindAll(params);
}

export function useSymbolSearch(query: string) {
  return useSymbolsControllerSearch(
    { q: query },
    { query: { enabled: query.length > 0 } }
  );
}

export function useSectors() {
  return useSymbolsControllerGetSectors();
}

export function useIndustries() {
  return useSymbolsControllerGetIndustries();
}

export function useSymbolDetails(ticker: string) {
  return useSymbolsControllerFindOne(ticker, { query: { enabled: !!ticker } });
}
