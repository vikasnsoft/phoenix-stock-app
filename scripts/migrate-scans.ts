#!/usr/bin/env ts-node
/**
 * Migration Script: JSON Saved Scans Cache → PostgreSQL
 * 
 * Migrates saved scan definitions from apps/mcp-server/saved_scans_cache.json 
 * to the PostgreSQL saved_scans table.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SavedScanCacheData {
  scans: Record<string, {
    id: string;
    name: string;
    description?: string;
    filters: any[];
    filter_logic: string;
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

async function migrateSavedScans() {
  console.log('🚀 Starting saved scans migration from JSON to PostgreSQL...\n');

  // Load JSON cache
  const jsonPath = path.join(__dirname, '../apps/mcp-server/saved_scans_cache.json');

  if (!fs.existsSync(jsonPath)) {
    console.warn(`⚠️  Warning: saved_scans_cache.json not found at ${jsonPath}`);
    console.log('   No saved scans to migrate. Exiting.');
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const cacheData: SavedScanCacheData = JSON.parse(rawData);

  console.log(`📊 Found ${cacheData.total_count} saved scans in JSON cache`);
  console.log(`📅 Last updated: ${cacheData.last_updated}\n`);

  // Get or create default user
  const user = await getOrCreateDefaultUser();

  const scans = Object.values(cacheData.scans);
  let successCount = 0;
  let errorCount = 0;

  console.log('⏳ Migrating saved scans...\n');

  for (const scan of scans) {
    try {
      // Convert old format to new definition format
      const definition = {
        filters: scan.filters,
        logic: scan.filter_logic,
      };

      await prisma.savedScan.create({
        data: {
          userId: user.id,
          name: scan.name,
          description: scan.description,
          definition,
          symbolUniverse: scan.symbols,
          isPublic: false,
          createdAt: new Date(scan.created_at),
          updatedAt: new Date(scan.updated_at),
        },
      });

      successCount++;
      console.log(`   ✓ Migrated scan: "${scan.name}" (${scan.symbols.length} symbols, ${scan.filters.length} filters)`);
    } catch (error) {
      errorCount++;
      console.error(`   ✗ Failed to migrate "${scan.name}":`, error);
    }
  }

  console.log('\n📈 Migration Summary:');
  console.log(`   ✓ Successfully migrated: ${successCount}`);
  console.log(`   ✗ Errors: ${errorCount}`);
  console.log(`   📊 Total in database: ${await prisma.savedScan.count()}`);

  await prisma.$disconnect();
  console.log('\n✅ Migration complete!');
}

migrateSavedScans().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
