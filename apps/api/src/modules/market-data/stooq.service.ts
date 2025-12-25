import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { FinnhubCandle } from './finnhub.service';

interface StooqDailyRecord {
  readonly date: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

/**
 * StooqService provides free daily OHLCV candles via stooq.com CSV endpoints.
 */
@Injectable()
export class StooqService {
  private readonly logger = new Logger(StooqService.name);

  /**
   * Fetch daily candles in the requested unix time range.
   */
  public async getDailyCandles(symbol: string, from: number, to: number): Promise<FinnhubCandle> {
    const stooqSymbol = this.buildStooqSymbol(symbol);
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
    try {
      const response = await axios.get<string>(url, { responseType: 'text', timeout: 30000 });
      const records = this.parseCsv(response.data);
      const filtered = this.filterByRange(records, from, to);
      if (filtered.length === 0) {
        return { c: [], h: [], l: [], o: [], v: [], t: [], s: 'no_data' };
      }
      return this.toFinnhubCandle(filtered);
    } catch (err) {
      this.logger.warn(`Stooq fetch failed for symbol=${symbol}: ${String(err)}`);
      return { c: [], h: [], l: [], o: [], v: [], t: [], s: 'error' };
    }
  }

  private buildStooqSymbol(symbol: string): string {
    const normalized = symbol.trim().toLowerCase();
    if (normalized.includes('.')) {
      return normalized;
    }
    return `${normalized}.us`;
  }

  private parseCsv(csvText: string): StooqDailyRecord[] {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      return [];
    }
    const rows = lines.slice(1);
    const records: StooqDailyRecord[] = [];
    for (const row of rows) {
      const parts = row.split(',');
      if (parts.length < 6) {
        continue;
      }
      const date = parts[0]?.trim();
      const open = Number(parts[1]);
      const high = Number(parts[2]);
      const low = Number(parts[3]);
      const close = Number(parts[4]);
      const volume = Number(parts[5]);

      const isValid = Boolean(date)
        && !Number.isNaN(open)
        && !Number.isNaN(high)
        && !Number.isNaN(low)
        && !Number.isNaN(close)
        && !Number.isNaN(volume);

      if (!isValid) {
        continue;
      }
      records.push({ date, open, high, low, close, volume });
    }
    return records;
  }

  private filterByRange(records: StooqDailyRecord[], from: number, to: number): StooqDailyRecord[] {
    return records.filter((record) => {
      const ts = this.toUnixSeconds(record.date);
      return ts >= from && ts <= to;
    });
  }

  private toFinnhubCandle(records: StooqDailyRecord[]): FinnhubCandle {
    const sorted = [...records].sort((a, b) => this.toUnixSeconds(a.date) - this.toUnixSeconds(b.date));
    return {
      c: sorted.map((r) => r.close),
      h: sorted.map((r) => r.high),
      l: sorted.map((r) => r.low),
      o: sorted.map((r) => r.open),
      v: sorted.map((r) => r.volume),
      t: sorted.map((r) => this.toUnixSeconds(r.date)),
      s: 'ok',
    };
  }

  private toUnixSeconds(date: string): number {
    const time = Date.parse(`${date}T00:00:00Z`);
    return Math.floor(time / 1000);
  }
}
