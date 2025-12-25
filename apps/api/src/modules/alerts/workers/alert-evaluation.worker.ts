import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { AlertType } from '@prisma/client';
import { MarketDataService } from '../../market-data/market-data.service';
import { PrismaService } from '../../database/prisma.service';
import { SavedScansService } from '../../saved-scans/saved-scans.service';
import { NotificationsService } from '../../notifications/notifications.service';

interface PriceCrossCondition {
  readonly threshold: number;
  readonly direction: 'above' | 'below';
}

interface PercentChangeCondition {
  readonly percentChange: number;
  readonly direction: 'above' | 'below';
}

interface ScanMatchCondition {
  readonly savedScanId: string;
}

interface EvaluationResult {
  readonly isTriggered: boolean;
  readonly triggerValue?: number;
  readonly triggerPrice?: number;
  readonly matchedSymbols?: string[];
  readonly metadata?: Record<string, unknown>;
}

@Processor('alert-evaluation')
export class AlertEvaluationWorker extends WorkerHost {
  private readonly logger = new Logger(AlertEvaluationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
    private readonly savedScansService: SavedScansService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  public async process(job: Job<any, any, string>): Promise<Record<string, unknown>> {
    this.logger.log(`Evaluating alerts: ${job.id}`);
    const now = new Date();
    const activeAlerts = await this.prisma.alert.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    let triggeredCount = 0;
    for (const alert of activeAlerts) {
      const result = await this.evaluateAlert(alert);
      if (!result.isTriggered) {
        continue;
      }
      triggeredCount += 1;
      const emailSent = await this.sendAlertEmail({
        userEmail: alert.user.email,
        alertName: alert.name,
        details: {
          alertType: alert.alertType,
          ticker: alert.ticker,
          triggerValue: result.triggerValue,
          triggerPrice: result.triggerPrice,
          matchedSymbols: result.matchedSymbols,
          metadata: result.metadata,
        },
        shouldSend: alert.emailNotify,
      });
      await this.prisma.$transaction([
        this.prisma.alert.update({
          where: { id: alert.id },
          data: { status: 'TRIGGERED', triggeredAt: new Date() },
        }),
        this.prisma.alertHistory.create({
          data: {
            alertId: alert.id,
            triggerValue: result.triggerValue,
            triggerPrice: result.triggerPrice,
            matchedSymbols: result.matchedSymbols ?? [],
            emailSent,
            pushSent: false,
            metadata: result.metadata
              ? (result.metadata as Prisma.InputJsonValue)
              : undefined,
          },
        }),
      ]);
    }
    return {
      status: 'completed',
      evaluated: activeAlerts.length,
      triggered: triggeredCount,
    };
  }

  private async evaluateAlert(alert: {
    readonly id: string;
    readonly alertType: AlertType;
    readonly condition: unknown;
    readonly ticker: string | null;
  }): Promise<EvaluationResult> {
    if (alert.alertType === AlertType.PRICE_CROSS) {
      return this.evaluatePriceCross({ ticker: alert.ticker, condition: alert.condition });
    }
    if (alert.alertType === AlertType.PERCENT_CHANGE) {
      return this.evaluatePercentChange({ ticker: alert.ticker, condition: alert.condition });
    }
    if (alert.alertType === AlertType.SCAN_MATCH) {
      return this.evaluateScanMatch({ condition: alert.condition });
    }
    return { isTriggered: false, metadata: { reason: 'Unsupported alertType' } };
  }

  private async evaluatePriceCross(params: {
    readonly ticker: string | null;
    readonly condition: unknown;
  }): Promise<EvaluationResult> {
    if (!params.ticker) {
      return { isTriggered: false, metadata: { reason: 'Missing ticker' } };
    }
    const condition = params.condition as Partial<PriceCrossCondition>;
    const threshold = Number(condition.threshold);
    const direction = condition.direction;
    if (!Number.isFinite(threshold) || (direction !== 'above' && direction !== 'below')) {
      return { isTriggered: false, metadata: { reason: 'Invalid condition' } };
    }
    const { currentClose, previousClose } = await this.getLatestTwoCloses(params.ticker);
    if (currentClose === null || previousClose === null) {
      return { isTriggered: false, metadata: { reason: 'Not enough candle data' } };
    }
    const isTriggered = direction === 'above'
      ? previousClose < threshold && currentClose >= threshold
      : previousClose > threshold && currentClose <= threshold;
    return {
      isTriggered,
      triggerPrice: currentClose,
      triggerValue: threshold,
      metadata: { previousClose, currentClose, threshold, direction },
    };
  }

  private async evaluatePercentChange(params: {
    readonly ticker: string | null;
    readonly condition: unknown;
  }): Promise<EvaluationResult> {
    if (!params.ticker) {
      return { isTriggered: false, metadata: { reason: 'Missing ticker' } };
    }
    const condition = params.condition as Partial<PercentChangeCondition>;
    const percentChange = Number(condition.percentChange);
    const direction = condition.direction;
    if (!Number.isFinite(percentChange) || (direction !== 'above' && direction !== 'below')) {
      return { isTriggered: false, metadata: { reason: 'Invalid condition' } };
    }
    const { currentClose, previousClose } = await this.getLatestTwoCloses(params.ticker);
    if (currentClose === null || previousClose === null || previousClose === 0) {
      return { isTriggered: false, metadata: { reason: 'Not enough candle data' } };
    }
    const actualPercent = ((currentClose - previousClose) / previousClose) * 100;
    const isTriggered = direction === 'above' ? actualPercent >= percentChange : actualPercent <= -percentChange;
    return {
      isTriggered,
      triggerPrice: currentClose,
      triggerValue: actualPercent,
      metadata: { previousClose, currentClose, percentChange, direction, actualPercent },
    };
  }

  private async evaluateScanMatch(params: { readonly condition: unknown }): Promise<EvaluationResult> {
    const condition = params.condition as Partial<ScanMatchCondition>;
    const savedScanId = condition.savedScanId;
    if (!savedScanId) {
      return { isTriggered: false, metadata: { reason: 'Missing savedScanId' } };
    }
    try {
      const result = await this.savedScansService.runSavedScan(savedScanId);
      const matchedStocks = (result as any)?.matched_stocks as Array<{ symbol?: string }> | undefined;
      const matchedSymbols = Array.isArray(matchedStocks)
        ? matchedStocks.map((s) => s.symbol).filter((s): s is string => Boolean(s))
        : [];
      return {
        isTriggered: matchedSymbols.length > 0,
        triggerValue: matchedSymbols.length,
        matchedSymbols,
        metadata: { matchedCount: matchedSymbols.length },
      };
    } catch (err: unknown) {
      this.logger.error('Failed to evaluate scan match alert', err);
      return { isTriggered: false, metadata: { reason: 'Scan execution failed' } };
    }
  }

  private async getLatestTwoCloses(ticker: string): Promise<{ currentClose: number | null; previousClose: number | null }> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const fromSeconds = nowSeconds - 60 * 60 * 24 * 10;
    const candles = await this.marketDataService.getCandles(ticker, 'D', fromSeconds, nowSeconds);
    if (!candles || candles.s !== 'ok' || !Array.isArray(candles.c) || candles.c.length < 2) {
      return { currentClose: null, previousClose: null };
    }
    const currentClose = Number(candles.c[candles.c.length - 1]);
    const previousClose = Number(candles.c[candles.c.length - 2]);
    if (!Number.isFinite(currentClose) || !Number.isFinite(previousClose)) {
      return { currentClose: null, previousClose: null };
    }
    return { currentClose, previousClose };
  }

  private async sendAlertEmail(params: {
    readonly userEmail: string;
    readonly alertName: string;
    readonly details: Record<string, unknown>;
    readonly shouldSend: boolean;
  }): Promise<boolean> {
    if (!params.shouldSend) {
      return false;
    }
    if (!params.userEmail) {
      return false;
    }
    return this.notificationsService.sendAlertTriggeredEmail({
      to: params.userEmail,
      alertName: params.alertName,
      details: params.details,
    });
  }
}
