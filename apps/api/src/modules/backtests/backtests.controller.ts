import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponse as ApiResponseModel, createSuccessResponse } from '../../shared/api-response';
import { BacktestsService } from './backtests.service';
import { CreateBacktestDto } from './dto/create-backtest.dto';

@ApiTags('Backtests')
@Controller('backtests')
export class BacktestsController {
  constructor(private readonly backtestsService: BacktestsService) { }

  @Post()
  @ApiOperation({ summary: 'Create and run a backtest' })
  @ApiResponse({ status: 201, description: 'Backtest created' })
  async create(@Body() dto: CreateBacktestDto): Promise<ApiResponseModel<any>> {
    const userId = 'default-user-id';
    const data = await this.backtestsService.create(dto, userId);
    return createSuccessResponse(data);
  }

  @Get()
  @ApiOperation({ summary: 'List user backtests' })
  async findAll(): Promise<ApiResponseModel<any>> {
    const userId = 'default-user-id';
    const data = await this.backtestsService.findAll(userId);
    return createSuccessResponse(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get backtest results' })
  async findOne(@Param('id') id: string): Promise<ApiResponseModel<any>> {
    const userId = 'default-user-id';
    const data = await this.backtestsService.findOne(id, userId);
    return createSuccessResponse(data);
  }
}
