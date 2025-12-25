export interface MetricsRefreshJob {
  readonly skip?: number;
  readonly take?: number;
  readonly batchSize?: number;
  readonly delayMs?: number;
}
