
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Fetch first 100 sorted by ticker (default)
  const symbols = await prisma.symbol.findMany({
    take: 100,
    orderBy: { ticker: 'asc' }
  });

  const ids = symbols.map(s => s.id);
  const candleCounts = await prisma.candle.groupBy({
    by: ['symbolId'],
    where: { symbolId: { in: ids } },
    _count: true
  });

  console.log(`First 100 symbols fetched.`);
  console.log(`Symbols with candles: ${candleCounts.length}`);

  if (candleCounts.length < 5) {
    console.log('Sample symbols:', symbols.slice(0, 5).map(s => s.ticker));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
