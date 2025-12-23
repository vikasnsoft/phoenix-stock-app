import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponse as ApiResponseModel, createSuccessResponse } from '../../shared/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IdentifierParamDto } from '../common/dto/identifier-param.dto';
import { ClonePublicScanDto } from './dto/clone-public-scan.dto';
import { ListPublicScansQueryDto } from './dto/list-public-scans-query.dto';
import { RatePublicScanDto } from './dto/rate-public-scan.dto';
import { DiscoveryService } from './discovery.service';

@ApiTags('Discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) { }

  /**
   * List public saved scans for discovery.
   */
  @Get('scans')
  @ApiOperation({ summary: 'List public scans' })
  @ApiResponse({ status: 200, description: 'Public scans list' })
  public async listPublicScans(@Query() query: ListPublicScansQueryDto): Promise<ApiResponseModel<any>> {
    const data = await this.discoveryService.listPublicScans({ query });
    return createSuccessResponse(data);
  }

  /**
   * Get a single public scan.
   */
  @Get('scans/:identifier')
  @ApiOperation({ summary: 'Get public scan details' })
  @ApiResponse({ status: 200, description: 'Public scan details' })
  public async getPublicScan(@Param() params: IdentifierParamDto): Promise<ApiResponseModel<any>> {
    const data = await this.discoveryService.getPublicScan({ id: params.identifier });
    return createSuccessResponse(data);
  }

  /**
   * Clone a public scan into the current user's saved scans.
   */
  @Post('scans/:identifier/clone')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clone a public scan to current user' })
  @ApiResponse({ status: 200, description: 'Cloned scan' })
  public async clonePublicScan(
    @Param() params: IdentifierParamDto,
    @Body() dto: ClonePublicScanDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseModel<any>> {
    const data = await this.discoveryService.clonePublicScan({ sourceId: params.identifier, userId, dto });
    return createSuccessResponse(data);
  }

  /**
   * Rate a public scan.
   */
  @Post('scans/:identifier/rate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rate a public scan' })
  @ApiResponse({ status: 200, description: 'Rating saved' })
  public async ratePublicScan(
    @Param() params: IdentifierParamDto,
    @Body() dto: RatePublicScanDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponseModel<any>> {
    const data = await this.discoveryService.ratePublicScan({ savedScanId: params.identifier, userId, dto });
    return createSuccessResponse(data);
  }
}
