import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ScansService } from './scans.service';
import { RunScanDto } from './dto/run-scan.dto';
import { RunPresetScanDto } from './dto/run-preset-scan.dto';
import { ParseNaturalLanguageQueryDto } from './dto/parse-nl.dto';
import { ApiResponse as ApiResponseModel, createSuccessResponse } from '../../shared/api-response';

@ApiTags('Scans')
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) { }

  @Post('run')
  @ApiOperation({ summary: 'Run a custom scan using ad-hoc filters' })
  @ApiResponse({ status: 200, description: 'Scan results payload' })
  public async runCustomScan(@Body() dto: RunScanDto): Promise<ApiResponseModel<Record<string, unknown>>> {
    const data = await this.scansService.runCustomScan(dto);
    return createSuccessResponse(data);
  }

  @Post('preset')
  @ApiOperation({ summary: 'Execute a preset scan across the provided symbols' })
  @ApiResponse({ status: 200, description: 'Preset scan results' })
  public async runPresetScan(@Body() dto: RunPresetScanDto): Promise<ApiResponseModel<Record<string, unknown>>> {
    const data = await this.scansService.runPresetScan(dto);
    return createSuccessResponse(data);
  }

  @Post('parse-nl')
  @ApiOperation({ summary: 'Parse natural language query into filters' })
  @ApiResponse({ status: 200, description: 'List of parsed filters' })
  public async parseNaturalLanguageQuery(@Body() dto: ParseNaturalLanguageQueryDto): Promise<ApiResponseModel<Record<string, unknown>>> {
    const data = await this.scansService.parseNaturalLanguageQuery(dto.query);
    return createSuccessResponse(data);
  }
}
