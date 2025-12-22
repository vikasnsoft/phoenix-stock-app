import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('alert-evaluation') private readonly alertQueue: Queue
  ) { }

  private async getDefaultUser() {
    const user = await this.prisma.user.findFirst();
    if (!user) throw new NotFoundException('No user found');
    return user;
  }

  async create(createDto: CreateAlertDto) {
    const user = await this.getDefaultUser();

    // Explicitly cast the condition to InputJsonValue
    const data: any = {
      ...createDto,
      userId: user.id,
      condition: createDto.condition,
      status: 'ACTIVE'
    };

    const alert = await this.prisma.alert.create({
      data
    });

    return alert;
  }

  async findAll() {
    return this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException(`Alert ${id} not found`);
    return alert;
  }

  async update(id: string, updateDto: UpdateAlertDto) {
    await this.findOne(id);
    const data: any = {
      ...updateDto,
      condition: updateDto.condition
    };
    return this.prisma.alert.update({
      where: { id },
      data
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.alert.delete({ where: { id } });
  }

  async triggerEvaluation() {
    // Manually trigger evaluation job
    await this.alertQueue.add('evaluate-all', {});
    return { message: 'Alert evaluation triggered' };
  }
}

