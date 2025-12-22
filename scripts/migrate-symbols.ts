#!/usr/bin/env ts-node
/**
 * Migration Script: JSON Symbols Cache → PostgreSQL
 * 
 * Migrates symbol data from apps/mcp-server/symbols_cache.json 
 * to the PostgreSQL symbols table.
 */

import { PrismaClient, Exchange } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SymbolCacheData {
  symbols: Record<string, {
    symbol: string;
    name: string;
    exchange?: string;
    currency?: string;
    sector?: string;
    industry?: string;
    market_cap?: string;
  }>;
  last_updated: string;
  total_count: number;
}

const exchangeMapping: Record<string, Exchange> = {
  'NYSE': Exchange.NYSE,
  'NASDAQ': Exchange.NASDAQ,
  'AMEX': Exchange.AMEX,
  'OTC': Exchange.OTC,
  'LSE': Exchange.LSE,
  'TSX': Exchange.TSX,
};

async function migrateSymbols() {
  console.log('🚀 Starting symbol migration from JSON to PostgreSQL...\n');

  // Load JSON cache
  const jsonPath = path.join(__dirname, '../apps/mcp-server/symbols_cache.json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Error: symbols_cache.json not found at ${jsonPath}`);
    console.log('   Run the MCP server to generate this file first.');
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const cacheData: SymbolCacheData = JSON.parse(rawData);

  console.log(`📊 Found ${cacheData.total_count} symbols in JSON cache`);
  console.log(`📅 Last updated: ${cacheData.last_updated}\n`);

  // Convert to array
  const symbols = Object.values(cacheData.symbols);
  let successCount = 0;
  let errorCount = 0;

  console.log('⏳ Migrating symbols...\n');

  for (const symbol of symbols) {
    try {
      const exchange = exchangeMapping[symbol.exchange?.toUpperCase() || ''] || Exchange.OTHER;

      // Parse market cap if available
      let marketCap: bigint | undefined;
      if (symbol.market_cap) {
        const capStr = symbol.market_cap.replace(/[^\d.]/g, '');
        const capNum = parseFloat(capStr);
        if (!isNaN(capNum)) {
          marketCap = BigInt(Math.floor(capNum));
        }
      }

      await prisma.symbol.upsert({
        where: { ticker: symbol.symbol },
        update: {
          name: symbol.name,
          exchange,
          currency: symbol.currency || 'USD',
          sector: symbol.sector,
          industry: symbol.industry,
          marketCap,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          ticker: symbol.symbol,
          name: symbol.name,
          exchange,
          currency: symbol.currency || 'USD',
          sector: symbol.sector,
          industry: symbol.industry,
          marketCap,
          isActive: true,
          lastSyncedAt: new Date(),
        },
      });

      successCount++;

      if (successCount % 100 === 0) {
        console.log(`   ✓ Migrated ${successCount}/${symbols.length} symbols...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`   ✗ Failed to migrate ${symbol.symbol}:`, error);
    }
  }

  console.log('\n📈 Migration Summary:');
  console.log(`   ✓ Successfully migrated: ${successCount}`);
  console.log(`   ✗ Errors: ${errorCount}`);
  console.log(`   📊 Total in database: ${await prisma.symbol.count()}`);

  await prisma.$disconnect();
  console.log('\n✅ Migration complete!');
}

migrateSymbols().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
