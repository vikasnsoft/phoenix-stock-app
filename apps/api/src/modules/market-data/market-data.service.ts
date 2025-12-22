
import { Injectable, Logger } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { PrismaService } from '../database/prisma.service';
import { FinnhubService, FinnhubCandle, FinnhubSymbol } from './finnhub.service';
import { Timeframe, Symbol, Exchange } from '@prisma/client';
import { RedisCacheService } from './redis-cache.service';
import { StooqService } from './stooq.service';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly intradayCacheTtlSeconds = Number(process.env.MARKET_DATA_INTRADAY_CACHE_TTL_SECONDS ?? 300);
  private readonly dailyCacheTtlSeconds = Number(process.env.MARKET_DATA_DAILY_CACHE_TTL_SECONDS ?? 3600);

  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhub: FinnhubService,
    private readonly redisCacheService: RedisCacheService,
    private readonly stooqService: StooqService,
  ) { }

  public async getLocalCandles(symbol: string, resolution: string, from: number, to: number): Promise<FinnhubCandle> {
    const cacheKey = this.buildCandleCacheKey({
      symbol,
      resolution,
      from,
      to,
      scope: 'local',
    });
    const cached = await this.redisCacheService.getJson<FinnhubCandle>(cacheKey);
    if (cached) {
      return cached;
    }
    const timeframe = this.mapResolutionToTimeframe(resolution);
    const fromDate = new Date(from * 1000);
    const toDate = new Date(to * 1000);
    const dbCandles = await this.prisma.candle.findMany({
      where: {
        symbol: { ticker: symbol },
        timeframe,
        timestamp: { gte: fromDate, lte: toDate },
      },
      orderBy: { timestamp: 'asc' },
    });
    const result = dbCandles.length > 0
      ? this.mapCandlesToFinnhub(dbCandles)
      : { c: [], h: [], l: [], o: [], v: [], t: [], s: 'no_data' };
    if (result.s !== 'ok' && resolution === 'D') {
      const stooqCandles = await this.stooqService.getDailyCandles(symbol, from, to);
      if (stooqCandles.s === 'ok' && stooqCandles.c.length > 0) {
        await this.storeCandles(symbol, resolution, stooqCandles);
        await this.redisCacheService.setJson(cacheKey, stooqCandles, {
          ttlSeconds: this.getCandleCacheTtlSeconds(resolution),
        });
        return stooqCandles;
      }
    }
    await this.redisCacheService.setJson(cacheKey, result, {
      ttlSeconds: this.getCandleCacheTtlSeconds(resolution),
    });
    return result;
  }

  /**
   * Get basic financials
   */
  async getBasicFinancials(symbol: string): Promise<any> {
    // Strict DB read as per "Offline Scanning" model
    // 1. Check DB for data < 24h old
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cached = await this.prisma.financialMetric.findFirst({
      where: {
        symbol: { ticker: symbol },
        fetchedAt: { gte: cutoff }
      },
      orderBy: { fetchedAt: 'desc' }
    });

    if (cached) {
      return cached.metric;
    }

    // If not found, return null (do not fetch live to avoid rate limits during scan)
    this.logger.warn(`Financials for ${symbol} missing in DB (Offline Mode)`);
    return null;
  }

  /**
   * Get candles with read-through caching:
   * 1. Check DB for data coverage (simple check: any data? or gap filling?)
   *    For MVP: If no data in range, fetch all from API and store.
   * 2. Return data.
   */
  async getCandles(symbol: string, resolution: string, from: number, to: number): Promise<FinnhubCandle> {
    const cacheKey = this.buildCandleCacheKey({
      symbol,
      resolution,
      from,
      to,
      scope: 'live',
    });
    const cached = await this.redisCacheService.getJson<FinnhubCandle>(cacheKey);
    if (cached) {
      return cached;
    }
    const timeframe = this.mapResolutionToTimeframe(resolution);
    const fromDate = new Date(from * 1000);
    const toDate = new Date(to * 1000);

    // 1. Check DB coverage
    // Ideally we check if we have enough candles.
    // Heuristic: valid market days vs count.
    // Simple verification: Try to get from DB first.
    const dbCandles = await this.prisma.candle.findMany({
      where: {
        symbol: { ticker: symbol },
        timeframe,
        timestamp: { gte: fromDate, lte: toDate }
      },
      orderBy: { timestamp: 'asc' }
    });

    // If we have "enough" data, return it.
    // What is enough? If request is for 1 year, and we have 0, we fetch.
    // If request covers weekends, we have fewer candles.
    // Use a timestamp check?
    // User requirement: "check data is available... if not available then first fetch"

    // Strict approach: If count is 0, fetch.
    if (dbCandles.length > 0) {
      const result = this.mapCandlesToFinnhub(dbCandles);
      await this.redisCacheService.setJson(cacheKey, result, {
        ttlSeconds: this.getCandleCacheTtlSeconds(resolution),
      });
      return result;
    }
    if (resolution === 'D') {
      const stooqCandles = await this.stooqService.getDailyCandles(symbol, from, to);
      if (stooqCandles.s === 'ok' && stooqCandles.c.length > 0) {
        await this.storeCandles(symbol, resolution, stooqCandles);
        await this.redisCacheService.setJson(cacheKey, stooqCandles, {
          ttlSeconds: this.getCandleCacheTtlSeconds(resolution),
        });
        return stooqCandles;
      }
    }
    this.logger.log(`Data missing for ${symbol} in DB. Fetching from Finnhub...`);
    // 2. Fetch from Finnhub (fallback)
    const apiData = await this.finnhub.getCandles(symbol, resolution, from, to);

    if (apiData.s === 'ok' && apiData.c && apiData.c.length > 0) {
      // 3. Store in DB
      await this.storeCandles(symbol, resolution, apiData);
      await this.redisCacheService.setJson(cacheKey, apiData, {
        ttlSeconds: this.getCandleCacheTtlSeconds(resolution),
      });
      return apiData;
    }
    return apiData;
  }

  private buildCandleCacheKey(params: {
    symbol: string;
    resolution: string;
    from: number;
    to: number;
    scope: 'local' | 'live';
  }): string {
    return `candles:${params.scope}:${params.symbol.toUpperCase()}:${params.resolution}:${params.from}:${params.to}`;
  }

  private getCandleCacheTtlSeconds(resolution: string): number {
    return resolution === 'D' || resolution === 'W' || resolution === 'M'
      ? this.dailyCacheTtlSeconds
      : this.intradayCacheTtlSeconds;
  }

  private mapCandlesToFinnhub(candles: any[]): FinnhubCandle {
    if (candles.length === 0) {
      return { c: [], h: [], l: [], o: [], v: [], t: [], s: 'no_data' };
    }
    return {
      c: candles.map(c => Number(c.close)),
      h: candles.map(c => Number(c.high)),
      l: candles.map(c => Number(c.low)),
      o: candles.map(c => Number(c.open)),
      v: candles.map(c => Number(c.volume)),
      t: candles.map(c => Math.floor(c.timestamp.getTime() / 1000)),
      s: 'ok'
    };
  }

  private async storeCandles(ticker: string, resolution: string, data: FinnhubCandle) {
    // Ensure Symbol exists
    const symbolId = await this.ensureSymbol(ticker);
    if (!symbolId) {
      this.logger.error(`Could not ensure symbol ${ticker}`);
      return;
    }

    const timeframe = this.mapResolutionToTimeframe(resolution);

    // Batch upserts? Prisma upsert is 1-by-1. createMany is faster but no upsert conflict handling on all DBs (Postgres supports it).
    // Prisma createMany skipDuplicates is available.

    const records = data.t.map((t, i) => ({
      symbolId,
      timeframe,
      timestamp: new Date(t * 1000),
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: BigInt(data.v[i]),
      createdAt: new Date(),
    }));

    // Use createMany with skipDuplicates for performance
    try {
      await this.prisma.candle.createMany({
        data: records,
        skipDuplicates: true
      });
      this.logger.log(`Stored ${records.length} candles for ${ticker}`);
    } catch (e) {
      this.logger.error(`Failed to store candles: ${e}`);
    }
  }

  private async ensureSymbol(ticker: string): Promise<string | null> {
    const existing = await this.prisma.symbol.findUnique({ where: { ticker } });
    if (existing) return existing.id;

    // Fetch profile to get exchange? Or just default.
    try {
      const profile = await this.finnhub.getCompanyProfile(ticker);
      const saved = await this.prisma.symbol.create({
        data: {
          ticker,
          name: profile.name || ticker,
          exchange: this.mapExchange(profile.exchange || 'OTHER'),
          currency: profile.currency || 'USD',
          isActive: true
        }
      });
      return saved.id;
    } catch (e) {
      // Fallback create
      try {
        const saved = await this.prisma.symbol.create({
          data: {
            ticker,
            name: ticker,
            exchange: Exchange.OTHER,
            isActive: true
          }
        });
        return saved.id;
      } catch (e2) {
        this.logger.error(`Failed to create symbol ${ticker}: ${e2}`);
        return null;
      }
    }
  }

  private mapResolutionToTimeframe(resolution: string): Timeframe {
    if (resolution === 'D') return Timeframe.DAY_1;
    if (resolution === '60') return Timeframe.HOUR_1;
    if (resolution === '30') return Timeframe.MIN_30;
    if (resolution === '15') return Timeframe.MIN_15;
    if (resolution === '5') return Timeframe.MIN_5;
    if (resolution === '1') return Timeframe.MIN_1;
    if (resolution === 'W') return Timeframe.WEEK_1;
    if (resolution === 'M') return Timeframe.MONTH_1;
    return Timeframe.DAY_1;
  }

  private mapExchange(code: string): Exchange {
    // Simple mapping, can be expanded
    if (code.includes('NASDAQ')) return Exchange.NASDAQ;
    if (code.includes('NYSE')) return Exchange.NYSE;
    return Exchange.OTHER;
  }

  // ===========================================================================
  // SYNC & SYSTEM STATUS
  // ===========================================================================

  async getSyncStatus() {
    return this.prisma.systemStatus.findUnique({
      where: { key: 'market_data_sync' }
    });
  }

  async syncAllMarketData() {
    const key = 'market_data_sync';

    // Check if already running
    const existing = await this.prisma.systemStatus.findUnique({ where: { key } });
    if (existing && existing.status === 'RUNNING') {
      const isStale = Date.now() - existing.updatedAt.getTime() > 10 * 60 * 1000; // 10 min timeout
      if (!isStale) {
        throw new Error('Sync already in progress');
      }
    }

    // Update status to RUNNING
    await this.prisma.systemStatus.upsert({
      where: { key },
      update: { status: 'RUNNING', lastRun: new Date(), message: 'Starting sync...' },
      create: { key, status: 'RUNNING', lastRun: new Date(), message: 'Starting sync...' }
    });

    // Start background process (don't await strictly if we want to return generic OK, but better to await for MVP simplicity or use BullMQ)
    // For now, we'll run it async detached, but we need to handle errors.
    this.runSyncProcess(key).catch(err => {
      this.logger.error(`Sync failed: ${err}`);
      this.prisma.systemStatus.update({
        where: { key },
        data: { status: 'FAILED', message: String(err) }
      }).catch(e => this.logger.error(e));
    });

    return { status: 'started' };
  }

  private async runSyncProcess(key: string) {
    try {
      // 1. Get all active symbols
      const symbols = await this.prisma.symbol.findMany({
        where: { isActive: true }
      });
      this.logger.log(`Starting sync for ${symbols.length} symbols...`);

      let processed = 0;
      let errors = 0;

      // 2. Iterate (Batching to avoid rate limits)
      // Finnhub Free: 60 API calls / minute.
      // We have CANDLES + FINANCIALS = 2 calls per stock.
      // Max 30 stocks / minute.
      // Valid delay = 2000ms per stock (conservative).

      for (const sym of symbols) {
        try {
          await this.syncSymbol(sym.ticker);
          processed++;

          if (processed % 5 === 0) {
            await this.prisma.systemStatus.update({
              where: { key },
              data: { message: `Processing ${processed}/${symbols.length}...` }
            });
          }

          // Delay
          await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
          this.logger.error(`Failed to sync ${sym.ticker}: ${e}`);
          errors++;
        }
      }

      // 3. Complete
      await this.prisma.systemStatus.update({
        where: { key },
        data: {
          status: 'SUCCESS',
          lastRun: new Date(), // Completion time
          message: `Completed. Processed: ${processed}, Errors: ${errors}`
        }
      });
      this.logger.log('Market data sync completed.');

    } catch (e) {
      throw e;
    }
  }

  private async syncSymbol(ticker: string) {
    // 1. Fetch & Store Financials
    try {
      const metric = await this.finnhub.getBasicFinancials(ticker);
      if (metric && metric.metric) {
        // Get symbol ID
        const symbolId = await this.ensureSymbol(ticker);
        if (symbolId) {
          await this.prisma.financialMetric.create({
            data: {
              symbolId,
              metric: metric.metric,
              fetchedAt: new Date()
            }
          });
        }
      }
    } catch (e) {
      if (this.axiosIsRateLimit(e)) {
        this.logger.warn(`Rate limit hit for ${ticker} financials`);
        await new Promise(r => setTimeout(r, 60000)); // Backoff
      }
      // Re-throw or ignore? Ignore to proceed to next
    }

    // 2. Fetch & Store Candles (Daily)
    // Handled by getCandles if we force fetch?
    // Let's call finnhub directly and store.
    try {
      const now = Math.floor(Date.now() / 1000);
      const from = now - (365 * 24 * 60 * 60); // 1 year history
      const candles = await this.finnhub.getCandles(ticker, 'D', from, now);
      if (candles && candles.s === 'ok') {
        await this.storeCandles(ticker, 'D', candles);
      }
    } catch (e) {
      // Handle error
    }
  }

  private axiosIsRateLimit(e: any): boolean {
    return isAxiosError(e) && e.response?.status === 429;
  }
}
