import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { FmpBatchQuoteItem } from './models/fmp-batch-quote-item.type';

type UnknownRecord = Record<string, unknown>;

@Injectable()
export class FmpService {
  private readonly logger = new Logger(FmpService.name);
  private readonly apiKey: string;
  private readonly httpClient: AxiosInstance;

  constructor() {
    this.apiKey = process.env.FMP_API_KEY ?? '';
    const baseUrl: string = process.env.FMP_BASE_URL ?? 'https://financialmodelingprep.com';
    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
    if (!this.apiKey) {
      this.logger.warn('FMP_API_KEY not set. FmpService will not work.');
    }
  }

  public async getBatchQuotes(params: { readonly symbols: readonly string[] }): Promise<readonly FmpBatchQuoteItem[]> {
    if (!this.apiKey) {
      throw new Error('FMP_API_KEY not set');
    }
    const symbols: readonly string[] = params.symbols
      .map((s: string) => s.trim().toUpperCase())
      .filter((s: string) => s.length > 0);
    if (symbols.length === 0) {
      return [];
    }
    const response = await this.httpClient.get('/stable/batch-quote', {
      params: {
        symbols: symbols.join(','),
        apikey: this.apiKey,
      },
    });
    const data: unknown = response.data;
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((item: unknown) => this.mapBatchQuoteItem(item))
      .filter((item: FmpBatchQuoteItem | null) => item !== null);
  }

  private mapBatchQuoteItem(value: unknown): FmpBatchQuoteItem | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const symbol: unknown = value.symbol;
    if (typeof symbol !== 'string' || symbol.trim().length === 0) {
      return null;
    }
    const normalizedSymbol: string = symbol.trim().toUpperCase();
    return {
      symbol: normalizedSymbol,
      price: this.toNumber(value.price),
      marketCap: this.toNumber(value.marketCap),
      pe: this.toNumber(value.pe),
      eps: this.toNumber(value.eps),
      beta: this.toNumber(value.beta),
      lastDiv: this.toNumber(value.lastDiv),
      dividendYield: this.toNumber(value.dividendYield),
    };
  }

  private isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null;
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed: number = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }
}
