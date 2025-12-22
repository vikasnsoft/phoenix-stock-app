#!/usr/bin/env ts-node
/**
 * Run All Migrations
 * 
 * Executes all migration scripts in order:
 * 1. Symbols
 * 2. Watchlists
 * 3. Saved Scans
 */

import { execSync } from 'child_process';
import * as path from 'path';

const scripts = [
  'migrate-symbols.ts',
  'migrate-watchlists.ts',
  'migrate-scans.ts',
];

async function runAllMigrations() {
  console.log('🚀 Running all migration scripts...\n');
  console.log('='.repeat(60));

  for (const script of scripts) {
    console.log(`\n📝 Running ${script}...\n`);

    try {
      const scriptPath = path.join(__dirname, script);
      execSync(`ts-node ${scriptPath}`, { stdio: 'inherit' });
      console.log(`\n✅ ${script} completed successfully`);
    } catch (error) {
      console.error(`\n❌ ${script} failed:`, error);
      process.exit(1);
    }

    console.log('='.repeat(60));
  }

  console.log('\n🎉 All migrations completed successfully!');
}

runAllMigrations().catch((error) => {
  console.error('❌ Migration process failed:', error);
  process.exit(1);
});
