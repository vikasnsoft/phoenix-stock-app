import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FinnhubService } from '../market-data/finnhub.service';
import { Symbol, Exchange } from '@prisma/client';

@Injectable()
export class SymbolsService {
  private readonly logger = new Logger(SymbolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhub: FinnhubService,
  ) { }

  /**
   * Get all symbols with optional filtering
   */
  async findAll(params: {
    exchange?: string | Exchange;
    sector?: string;
    isActive?: boolean;
    search?: string;
    skip?: number;
    take?: number;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<{ symbols: Symbol[]; total: number }> {
    const { exchange, sector, isActive, search, skip = 0, take = 100, minPrice, maxPrice } = params;

    const where: any = {};

    if (exchange) {
      // Cast to string to safely compare with non-enum values
      const exStr = exchange.toString().toUpperCase();
      if (exStr === 'US') {
        where.exchange = { in: ['NYSE', 'NASDAQ', 'AMEX', 'OTC'] };
      } else if (exStr !== 'ALL') {
        where.exchange = exchange;
      }
    }
    if (sector) where.sector = sector;
    if (isActive !== undefined) where.isActive = isActive;

    if (search) {
      where.OR = [
        { ticker: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Price filtering using latest candles
    if (minPrice !== undefined || maxPrice !== undefined) {
      // Look for candles within the last 7 days (to ensure we catch recent data)
      // This is an approximation. Ideally we have a 'lastPrice' on Symbol table.
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);

      where.candles = {
        some: {
          timestamp: { gte: recentDate },
          close: {
            gte: minPrice,
            lte: maxPrice
          }
        }
      };
    }

    const [symbols, total] = await Promise.all([
      this.prisma.symbol.findMany({
        where,
        skip,
        take,
        orderBy: { ticker: 'asc' },
      }),
      this.prisma.symbol.count({ where }),
    ]);

    // Enrich with real-time data if result set is small enough
    if (symbols.length <= 50) {
      const enrichedSymbols = await this.enrichSymbolsWithQuotes(symbols);
      return { symbols: enrichedSymbols, total };
    }

    return {
      symbols: symbols.map(s => this.serializeSymbol(s)),
      total
    };
  }

  /**
   * Enrich a list of symbols with real-time quote data
   */
  private async enrichSymbolsWithQuotes(symbols: Symbol[]): Promise<any[]> {
    const results = await Promise.all(
      symbols.map(async (sym) => {
        try {
          // Parallel fetch: Quote + (Optional) Profile if missing
          const promises: Promise<any>[] = [this.finnhub.getQuote(sym.ticker)];

          let profileUpdated = false;
          if (!sym.sector || !sym.industry) {
            // Lazy load profile if missing
            promises.push(
              this.finnhub.getCompanyProfile(sym.ticker)
                .then(async (profile) => {
                  // Update DB asynchronously properly
                  if (profile && (profile.finnhubIndustry || profile.name)) {
                    await this.prisma.symbol.update({
                      where: { id: sym.id },
                      data: {
                        sector: profile.finnhubIndustry,
                        industry: profile.finnhubIndustry, // Finnhub 'industry' field
                        description: profile.name,
                        marketCap: profile.marketCapitalization ? BigInt(Math.floor(profile.marketCapitalization * 1000000)) : null,
                        lastSyncedAt: new Date(),
                      }
                    });
                    // Update local object for return
                    sym.sector = profile.finnhubIndustry;
                    sym.industry = profile.finnhubIndustry;
                    profileUpdated = true;
                  }
                })
                .catch(err => this.logger.warn(`Lazy profile fetch failed for ${sym.ticker}: ${err.message}`))
            );
          }

          const [quote] = await Promise.all(promises);

          return {
            ...this.serializeSymbol(sym),
            lastPrice: quote.c,
            changePercent: quote.dp,
            volume: this.formatVolume(quote.v),
            // Ensure updated fields are reflected if modification happened on 'sym' reference
            sector: sym.sector,
            industry: sym.industry
          };
        } catch (e) {
          // Return symbol (serialized) without quote if failed
          return this.serializeSymbol(sym);
        }
      })
    );
    return results;
  }

  private formatVolume(v: number): number {
    // Basic validation/conversion
    return v || 0;
  }

  /**
   * Helper to safe-serialize a Symbol (handle BigInt)
   */
  private serializeSymbol(sym: Symbol): any {
    return {
      ...sym,
      marketCap: sym.marketCap ? sym.marketCap.toString() : null,
    };
  }

  /**
   * Get a single symbol by ticker
   */
  /**
   * Get a single symbol by ticker
   */
  async findOne(ticker: string): Promise<Symbol> {
    const symbol = await this.prisma.symbol.findUnique({
      where: { ticker: ticker.toUpperCase() },
    });

    if (!symbol) {
      throw new NotFoundException(`Symbol ${ticker} not found`);
    }

    return {
      ...symbol,
      marketCap: symbol.marketCap ? symbol.marketCap.toString() : null,
    } as any;
  }

  /**
   * Search symbols by name or ticker
   */
  async search(query: string, limit = 10): Promise<Symbol[]> {
    const symbols = await this.prisma.symbol.findMany({
      where: {
        OR: [
          { ticker: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: limit,
      orderBy: { ticker: 'asc' },
    });

    return symbols.map(s => ({
      ...s,
      marketCap: s.marketCap ? s.marketCap.toString() : null,
    })) as any[];
  }

  /**
   * Sync symbols from Finnhub for a specific exchange
   */
  async syncFromFinnhub(exchangeCode: string): Promise<{ synced: number; errors: number }> {
    this.logger.log(`Starting symbol sync for exchange: ${exchangeCode}`);

    try {
      const finnhubSymbols = await this.finnhub.getSymbols(exchangeCode);
      this.logger.log(`Fetched ${finnhubSymbols.length} symbols from Finnhub`);

      let synced = 0;
      let errors = 0;

      for (const fSymbol of finnhubSymbols) {
        try {
          // Map exchange code to our enum
          const exchange = this.mapExchange(exchangeCode);

          await this.prisma.symbol.upsert({
            where: { ticker: fSymbol.symbol },
            update: {
              name: fSymbol.description,
              exchange,
              currency: fSymbol.currency || 'USD',
              isActive: true,
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
            create: {
              ticker: fSymbol.symbol,
              name: fSymbol.description,
              exchange,
              currency: fSymbol.currency || 'USD',
              isActive: true,
              lastSyncedAt: new Date(),
            },
          });

          synced++;

          if (synced % 100 === 0) {
            this.logger.log(`Synced ${synced}/${finnhubSymbols.length} symbols...`);
          }
        } catch (error) {
          errors++;
          this.logger.error(`Failed to sync symbol ${fSymbol.symbol}:`, error);
        }
      }

      this.logger.log(`Symbol sync complete: ${synced} synced, ${errors} errors`);
      return { synced, errors };
    } catch (error) {
      this.logger.error(`Symbol sync failed for ${exchangeCode}:`, error);
      throw error;
    }
  }

  /**
   * Enrich symbol with company profile from Finnhub
   */
  async enrichSymbol(ticker: string): Promise<Symbol> {
    const symbol = await this.findOne(ticker);

    try {
      const profile = await this.finnhub.getCompanyProfile(ticker);

      return this.prisma.symbol.update({
        where: { id: symbol.id },
        data: {
          sector: profile.finnhubIndustry,
          marketCap: profile.marketCapitalization ? BigInt(Math.floor(profile.marketCapitalization * 1000000)) : null,
          description: profile.name,
          website: profile.weburl,
          ipo: profile.ipo ? new Date(profile.ipo) : null,
          lastSyncedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to enrich symbol ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Map Finnhub exchange code to our Exchange enum
   */
  private mapExchange(code: string): Exchange {
    const mapping: Record<string, Exchange> = {
      'US': Exchange.NYSE,
      'NASDAQ': Exchange.NASDAQ,
      'AMEX': Exchange.AMEX,
      'OTC': Exchange.OTC,
      'TO': Exchange.TSX,
      'L': Exchange.LSE,
    };

    return mapping[code] || Exchange.OTHER;
  }

  /**
   * Get distinct sectors
   */
  async getSectors(): Promise<string[]> {
    const result = await this.prisma.symbol.findMany({
      where: { sector: { not: null } },
      select: { sector: true },
      distinct: ['sector'],
      orderBy: { sector: 'asc' },
    });

    return result.map(r => r.sector).filter(Boolean) as string[];
  }

  /**
   * Get distinct industries
   */
  async getIndustries(): Promise<string[]> {
    const result = await this.prisma.symbol.findMany({
      where: { industry: { not: null } },
      select: { industry: true },
      distinct: ['industry'],
      orderBy: { industry: 'asc' },
    });

    return result.map(r => r.industry).filter(Boolean) as string[];
  }
}
