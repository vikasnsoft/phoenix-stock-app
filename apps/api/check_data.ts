
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const symbolCount = await prisma.symbol.count();
  const candleCount = await prisma.candle.count();
  const validMarketCap = await prisma.symbol.count({ where: { marketCap: { gt: 0 } } });

  console.log(`Symbols: ${symbolCount}`);
  console.log(`Candles: ${candleCount}`);
  console.log(`With Market Cap: ${validMarketCap}`);

  // Check meaningful data
  const sampleCandles = await prisma.candle.findMany({ take: 5 });
  console.log('Sample Candles:', sampleCandles);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
