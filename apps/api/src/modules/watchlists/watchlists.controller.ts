import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponse as ApiResponseModel, createSuccessResponse } from '../../shared/api-response';
import { IdentifierParamDto } from '../common/dto/identifier-param.dto';
import { mapFilters } from '../common/filter-mapper';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { RunWatchlistScanDto } from './dto/run-watchlist-scan.dto';
import { UpdateWatchlistSymbolsDto } from './dto/update-watchlist-symbols.dto';
import { WatchlistsService } from './watchlists.service';

@ApiTags('Watchlists')
@Controller('watchlists')
export class WatchlistsController {
  constructor(private readonly watchlistsService: WatchlistsService) { }

  @Post()
  @ApiOperation({ summary: 'Create or update a watchlist' })
  @ApiResponse({ status: 200, description: 'Created watchlist' })
  public async createWatchlist(@Body() dto: CreateWatchlistDto): Promise<ApiResponseModel<any>> {
    const data = await this.watchlistsService.create(dto);
    return createSuccessResponse(data);
  }

  @Get()
  @ApiOperation({ summary: 'List all watchlists' })
  @ApiResponse({ status: 200, description: 'Current watchlists' })
  public async listWatchlists(): Promise<ApiResponseModel<any>> {
    const data = await this.watchlistsService.findAll();
    return createSuccessResponse(data);
  }

  @Put(':identifier/symbols')
  @ApiOperation({ summary: 'Replace symbols in a watchlist' })
  @ApiResponse({ status: 200, description: 'Updated watchlist' })
  public async updateWatchlistSymbols(
    @Param() params: IdentifierParamDto,
    @Body() dto: UpdateWatchlistSymbolsDto
  ): Promise<ApiResponseModel<any>> {
    const data = await this.watchlistsService.updateSymbols(params.identifier, dto.symbols);
    return createSuccessResponse(data);
  }

  @Delete(':identifier')
  @ApiOperation({ summary: 'Delete a watchlist' })
  @ApiResponse({ status: 200, description: 'Deletion confirmation' })
  public async deleteWatchlist(@Param() params: IdentifierParamDto): Promise<ApiResponseModel<any>> {
    const data = await this.watchlistsService.remove(params.identifier);
    return createSuccessResponse(data);
  }

  @Post(':identifier/scan')
  @ApiOperation({ summary: 'Run a scan against a watchlist using filters' })
  @ApiResponse({ status: 200, description: 'Scan results for the watchlist' })
  public async runWatchlistScan(
    @Param() params: IdentifierParamDto,
    @Body() dto: RunWatchlistScanDto
  ): Promise<ApiResponseModel<any>> {
    const data = await this.watchlistsService.runWatchlistScan(params.identifier, dto);
    return createSuccessResponse(data);
  }
}
