import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new alert' })
  @ApiResponse({ status: 201, description: 'Alert created' })
  create(@CurrentUser() user: User, @Body() createAlertDto: CreateAlertDto) {
    return this.alertsService.create({ userId: user.id, dto: createAlertDto });
  }

  @Get()
  @ApiOperation({ summary: 'List alerts for current user' })
  findAll(@CurrentUser() user: User) {
    return this.alertsService.findAll({ userId: user.id });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an alert by ID (current user only)' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.alertsService.findOne({ userId: user.id, id });
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get alert history for an alert' })
  getHistory(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.alertsService.getHistory({
      userId: user.id,
      alertId: id,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an alert (current user only)' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() updateAlertDto: UpdateAlertDto) {
    return this.alertsService.update({ userId: user.id, id, dto: updateAlertDto });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an alert (current user only)' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.alertsService.remove({ userId: user.id, id });
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Manually trigger alert evaluation' })
  triggerEvaluation(@CurrentUser() user: User) {
    return this.alertsService.triggerEvaluation({ userId: user.id });
  }
}

