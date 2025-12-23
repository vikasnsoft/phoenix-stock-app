export interface FmpBatchQuoteItem {
  readonly symbol: string;
  readonly price?: number;
  readonly marketCap?: number;
  readonly pe?: number;
  readonly eps?: number;
  readonly beta?: number;
  readonly lastDiv?: number;
  readonly dividendYield?: number;
}
