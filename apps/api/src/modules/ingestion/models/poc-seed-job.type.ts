export interface PocSeedJob {
  readonly yearsBack?: number;
  readonly exchange?: string;
  readonly skip?: number;
  readonly take?: number;
  readonly symbols?: readonly string[];
  readonly seedCandles?: boolean;
  readonly seedMetrics?: boolean;
  readonly candleConcurrency?: number;
  readonly metricBatchSize?: number;
  readonly metricDelayMs?: number;
}
