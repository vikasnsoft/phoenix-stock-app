import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

interface CreateAlertParams {
  readonly userId: string;
  readonly dto: CreateAlertDto;
}

interface FindAllAlertsParams {
  readonly userId: string;
}

interface FindOneAlertParams {
  readonly userId: string;
  readonly id: string;
}

interface UpdateAlertParams {
  readonly userId: string;
  readonly id: string;
  readonly dto: UpdateAlertDto;
}

interface RemoveAlertParams {
  readonly userId: string;
  readonly id: string;
}

interface GetAlertHistoryParams {
  readonly userId: string;
  readonly alertId: string;
  readonly skip: number;
  readonly take: number;
}

interface TriggerEvaluationParams {
  readonly userId: string;
}

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('alert-evaluation') private readonly alertQueue: Queue
  ) { }

  public async create(params: CreateAlertParams) {
    const alert = await this.prisma.alert.create({
      data: {
        ...params.dto,
        userId: params.userId,
        condition: params.dto.condition as Prisma.InputJsonValue,
        status: 'ACTIVE',
      },
    });
    return alert;
  }

  public async findAll(params: FindAllAlertsParams) {
    return this.prisma.alert.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findOne(params: FindOneAlertParams) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: params.id, userId: params.userId },
    });
    if (!alert) {
      throw new NotFoundException(`Alert ${params.id} not found`);
    }
    return alert;
  }

  public async getHistory(params: GetAlertHistoryParams) {
    await this.findOne({ userId: params.userId, id: params.alertId });
    const history = await this.prisma.alertHistory.findMany({
      where: { alertId: params.alertId },
      orderBy: { triggeredAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
    const total = await this.prisma.alertHistory.count({
      where: { alertId: params.alertId },
    });
    return {
      history,
      total,
      skip: params.skip,
      take: params.take,
    };
  }

  public async update(params: UpdateAlertParams) {
    await this.findOne({ userId: params.userId, id: params.id });
    return this.prisma.alert.update({
      where: { id: params.id },
      data: {
        ...params.dto,
        condition: params.dto.condition
          ? (params.dto.condition as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  public async remove(params: RemoveAlertParams) {
    await this.findOne({ userId: params.userId, id: params.id });
    return this.prisma.alert.delete({ where: { id: params.id } });
  }

  public async triggerEvaluation(_params: TriggerEvaluationParams) {
    await this.alertQueue.add('evaluate-all', {});
    return { message: 'Alert evaluation triggered' };
  }
}

