#!/usr/bin/env ts-node
/**
 * Migration Script: JSON Watchlists Cache → PostgreSQL
 * 
 * Migrates watchlist data from apps/mcp-server/watchlists_cache.json 
 * to the PostgreSQL watchlists and watchlist_symbols tables.
 * 
 * Note: Creates a default user if none exists.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface WatchlistCacheData {
  watchlists: Record<string, {
    id: string;
    name: string;
    description?: string;
    symbols: string[];
    created_at: string;
    updated_at: string;
  }>;
  order: string[];
  last_updated: string;
  total_count: number;
}

async function getOrCreateDefaultUser() {
  const email = 'default@stockscanner.local';

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log('📝 Creating default user...');
    user = await prisma.user.create({
      data: {
        email,
        name: 'Default User',
        role: 'FREE',
        status: 'ACTIVE',
      },
    });
    console.log(`   ✓ Created user: ${user.email} (${user.id})\n`);
  }

  return user;
}

async function migrateWatchlists() {
  console.log('🚀 Starting watchlist migration from JSON to PostgreSQL...\n');

  // Load JSON cache
  const jsonPath = path.join(__dirname, '../apps/mcp-server/watchlists_cache.json');

  if (!fs.existsSync(jsonPath)) {
    console.warn(`⚠️  Warning: watchlists_cache.json not found at ${jsonPath}`);
    console.log('   No watchlists to migrate. Exiting.');
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const cacheData: WatchlistCacheData = JSON.parse(rawData);

  console.log(`📊 Found ${cacheData.total_count} watchlists in JSON cache`);
  console.log(`📅 Last updated: ${cacheData.last_updated}\n`);

  // Get or create default user
  const user = await getOrCreateDefaultUser();

  const watchlists = Object.values(cacheData.watchlists);
  let successCount = 0;
  let errorCount = 0;

  console.log('⏳ Migrating watchlists...\n');

  for (const watchlist of watchlists) {
    try {
      // Get symbol IDs from database
      const symbolRecords = await prisma.symbol.findMany({
        where: {
          ticker: { in: watchlist.symbols },
        },
        select: { id: true, ticker: true },
      });

      const symbolMap = new Map(symbolRecords.map(s => [s.ticker, s.id]));
      const missingSymbols = watchlist.symbols.filter(s => !symbolMap.has(s));

      if (missingSymbols.length > 0) {
        console.warn(`   ⚠️  Watchlist "${watchlist.name}" references unknown symbols: ${missingSymbols.join(', ')}`);
      }

      // Create watchlist with symbols
      await prisma.watchlist.create({
        data: {
          userId: user.id,
          name: watchlist.name,
          description: watchlist.description,
          isPublic: false,
          sortOrder: 0,
          createdAt: new Date(watchlist.created_at),
          updatedAt: new Date(watchlist.updated_at),
          symbols: {
            create: symbolRecords.map(s => ({
              symbolId: s.id,
              addedAt: new Date(watchlist.created_at),
            })),
          },
        },
      });

      successCount++;
      console.log(`   ✓ Migrated watchlist: "${watchlist.name}" (${symbolRecords.length} symbols)`);
    } catch (error) {
      errorCount++;
      console.error(`   ✗ Failed to migrate "${watchlist.name}":`, error);
    }
  }

  console.log('\n📈 Migration Summary:');
  console.log(`   ✓ Successfully migrated: ${successCount}`);
  console.log(`   ✗ Errors: ${errorCount}`);
  console.log(`   📊 Total in database: ${await prisma.watchlist.count()}`);

  await prisma.$disconnect();
  console.log('\n✅ Migration complete!');
}

migrateWatchlists().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
