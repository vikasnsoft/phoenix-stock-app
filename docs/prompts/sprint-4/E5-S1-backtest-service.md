# E5-S1: Backtest Service & Controller

**Epic**: Backtesting  
**Sprint**: 4  
**Status**: Pending  
**Priority**: P1 (High)

## Goal

Implement basic EOD backtesting: run a scan definition over historical date range and return entry/exit signals and basic performance metrics.

## Context

- `Backtest` model exists in Prisma schema
- Scan engine can evaluate filters against OHLCV data
- Need to iterate over historical dates and simulate scan execution

## Technical Requirements

### 1. Create Backtest Service

**File**: `apps/api/src/modules/backtests/backtests.service.ts` (new)

```typescript
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { ScansService } from "../scans/scans.service";
import { BacktestStatus, Timeframe } from "@prisma/client";
import { CreateBacktestDto } from "./dto/create-backtest.dto";

@Injectable()
export class BacktestsService {
  private readonly logger = new Logger(BacktestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scansService: ScansService
  ) {}

  async create(dto: CreateBacktestDto, userId: string) {
    // Create pending backtest record
    const backtest = await this.prisma.backtest.create({
      data: {
        userId,
        savedScanId: dto.savedScanId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        timeframe: dto.timeframe || Timeframe.DAY_1,
        definition: dto.definition,
        status: BacktestStatus.PENDING,
      },
    });

    // Execute backtest async (or queue it)
    this.executeBacktest(backtest.id).catch((err) => {
      this.logger.error(`Backtest ${backtest.id} failed:`, err);
    });

    return { id: backtest.id, status: BacktestStatus.PENDING };
  }

  private async executeBacktest(backtestId: string) {
    this.logger.log(`Starting backtest ${backtestId}`);

    await this.prisma.backtest.update({
      where: { id: backtestId },
      data: { status: BacktestStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const backtest = await this.prisma.backtest.findUnique({
        where: { id: backtestId },
      });

      if (!backtest) {
        throw new Error("Backtest not found");
      }

      const definition = backtest.definition as any;
      const symbols = definition.symbols || ["AAPL"]; // Default for testing

      const signals: any[] = [];
      let currentDate = new Date(backtest.startDate);
      const endDate = new Date(backtest.endDate);

      // Simple daily iteration (MVP: no intraday)
      while (currentDate <= endDate) {
        // Run scan for this date
        // Note: In reality, you'd need historical OHLC at each date
        // For MVP, we can simulate by running current scan and marking date

        const result = await this.scansService.runCustomScan({
          symbols,
          filters: definition.filters,
          filterLogic: definition.filterLogic || "AND",
        });

        const matched = (result as any).matched_stocks || [];

        for (const stock of matched) {
          signals.push({
            date: currentDate.toISOString().split("T")[0],
            symbol: stock.symbol,
            type: "BUY", // Simple: assume buy signal when scan passes
            price: stock.close,
          });
        }

        // Advance by 1 day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate simple metrics
      const totalMatches = signals.length;
      const uniqueSymbols = new Set(signals.map((s) => s.symbol)).size;

      const results = {
        signals,
        summary: {
          totalSignals: totalMatches,
          uniqueSymbols,
          dateRange: {
            start: backtest.startDate.toISOString().split("T")[0],
            end: backtest.endDate.toISOString().split("T")[0],
          },
        },
      };

      // Update backtest with results
      await this.prisma.backtest.update({
        where: { id: backtestId },
        data: {
          status: BacktestStatus.COMPLETED,
          results,
          totalMatches,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Backtest ${backtestId} completed: ${totalMatches} signals`
      );
    } catch (error) {
      this.logger.error(`Backtest ${backtestId} failed:`, error);

      await this.prisma.backtest.update({
        where: { id: backtestId },
        data: {
          status: BacktestStatus.FAILED,
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
    }
  }

  async findAll(userId: string) {
    const backtests = await this.prisma.backtest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        totalMatches: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return { backtests };
  }

  async findOne(id: string, userId: string) {
    const backtest = await this.prisma.backtest.findFirst({
      where: { id, userId },
    });

    if (!backtest) {
      throw new NotFoundException(`Backtest ${id} not found`);
    }

    return backtest;
  }
}
```

### 2. Create DTOs

**File**: `apps/api/src/modules/backtests/dto/create-backtest.dto.ts` (new)

```typescript
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsDateString,
  IsOptional,
  IsObject,
  IsEnum,
} from "class-validator";
import { Timeframe } from "@prisma/client";

export class CreateBacktestDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  savedScanId?: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ enum: Timeframe })
  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;

  @ApiProperty({ description: "Scan definition (filters + filterLogic)" })
  @IsObject()
  definition!: Record<string, any>;
}
```

### 3. Create Controller

**File**: `apps/api/src/modules/backtests/backtests.controller.ts` (new)

```typescript
import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BacktestsService } from "./backtests.service";
import { CreateBacktestDto } from "./dto/create-backtest.dto";
import { createSuccessResponse } from "../../shared/api-response";

@ApiTags("Backtests")
@Controller("backtests")
export class BacktestsController {
  constructor(private readonly backtestsService: BacktestsService) {}

  @Post()
  @ApiOperation({ summary: "Create and run a backtest" })
  @ApiResponse({ status: 201, description: "Backtest created" })
  async create(@Body() dto: CreateBacktestDto) {
    // TODO: Get real userId from auth
    const userId = "default-user-id";
    const data = await this.backtestsService.create(dto, userId);
    return createSuccessResponse(data);
  }

  @Get()
  @ApiOperation({ summary: "List user backtests" })
  async findAll() {
    const userId = "default-user-id";
    const data = await this.backtestsService.findAll(userId);
    return createSuccessResponse(data);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get backtest results" })
  async findOne(@Param("id") id: string) {
    const userId = "default-user-id";
    const data = await this.backtestsService.findOne(id, userId);
    return createSuccessResponse(data);
  }
}
```

### 4. Create Module

**File**: `apps/api/src/modules/backtests/backtests.module.ts` (new)

```typescript
import { Module } from "@nestjs/common";
import { BacktestsController } from "./backtests.controller";
import { BacktestsService } from "./backtests.service";
import { ScansModule } from "../scans/scans.module";

@Module({
  imports: [ScansModule],
  controllers: [BacktestsController],
  providers: [BacktestsService],
  exports: [BacktestsService],
})
export class BacktestsModule {}
```

### 5. Register in App Module

**File**: `apps/api/src/app.module.ts`

```typescript
import { BacktestsModule } from "./modules/backtests/backtests.module";

@Module({
  imports: [
    // ... existing modules
    BacktestsModule,
  ],
  // ...
})
export class AppModule {}
```

## Files to Create/Modify

- **Create**: `apps/api/src/modules/backtests/backtests.service.ts`
- **Create**: `apps/api/src/modules/backtests/backtests.controller.ts`
- **Create**: `apps/api/src/modules/backtests/backtests.module.ts`
- **Create**: `apps/api/src/modules/backtests/dto/create-backtest.dto.ts`
- **Modify**: `apps/api/src/app.module.ts`

## Acceptance Criteria

- [ ] POST /backtests creates backtest and returns ID
- [ ] Backtest executes asynchronously
- [ ] GET /backtests returns list with status
- [ ] GET /backtests/:id returns full results
- [ ] Results include signals array and summary metrics
- [ ] Status progresses: PENDING → RUNNING → COMPLETED/FAILED
- [ ] Completes within 3 seconds for single symbol, 30-day range

## Testing Steps

1. **Create backtest**:

   ```bash
   curl -X POST http://localhost:4001/api/backtests \
     -H "Content-Type: application/json" \
     -d '{
       "name": "RSI Backtest",
       "startDate": "2024-01-01",
       "endDate": "2024-01-31",
       "definition": {
         "symbols": ["AAPL"],
         "filters": [{"type": "indicator", "field": "RSI", "operator": "gt", "value": 70, "timePeriod": 14}],
         "filterLogic": "AND"
       }
     }'
   ```

2. **Check status**:

   ```bash
   curl http://localhost:4001/api/backtests/{id}
   ```

3. **List backtests**:
   ```bash
   curl http://localhost:4001/api/backtests
   ```

## Dependencies

- ScansService must be functional
- Finnhub provider working (E2-S3)

## Next Steps

- E5-S2: Wire "Backtest Results" button in ScanBuilder UI
- Advanced metrics: win rate, profit/loss, drawdown
