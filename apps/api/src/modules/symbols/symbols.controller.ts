import { Controller, Get, Post, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SymbolsService } from './symbols.service';
import { Exchange } from '@prisma/client';
import { SymbolListResponseDto, SymbolDto } from './dto/symbol-list-response.dto';

@ApiTags('Symbols')
@Controller('symbols')
export class SymbolsController {
  constructor(private readonly symbolsService: SymbolsService) { }

  @Get()
  @ApiOperation({ summary: 'List all symbols with optional filtering' })
  @ApiResponse({ status: 200, description: 'List of symbols', type: SymbolListResponseDto })
  @ApiQuery({ name: 'exchange', required: false, description: 'Exchange code (NYSE, NASDAQ) or group (US, all)' })
  @ApiQuery({ name: 'sector', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Query('exchange') exchange?: string,
    @Query('sector') sector?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
  ): Promise<SymbolListResponseDto> {
    return this.symbolsService.findAll({
      exchange,
      sector,
      isActive,
      search,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search symbols by name or ticker' })
  @ApiResponse({ status: 200, description: 'List of matching symbols', type: [SymbolDto] })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<SymbolDto[]> {
    return this.symbolsService.search(query, limit ? Number(limit) : undefined);
  }

  @Get('sectors')
  @ApiOperation({ summary: 'Get list of distinct sectors' })
  @ApiResponse({ status: 200, description: 'List of sectors', type: [String] })
  async getSectors(): Promise<string[]> {
    return this.symbolsService.getSectors();
  }

  @Get('industries')
  @ApiOperation({ summary: 'Get list of distinct industries' })
  @ApiResponse({ status: 200, description: 'List of industries', type: [String] })
  async getIndustries(): Promise<string[]> {
    return this.symbolsService.getIndustries();
  }

  @Get(':ticker')
  @ApiOperation({ summary: 'Get symbol details by ticker' })
  @ApiResponse({ status: 200, description: 'Symbol found', type: SymbolDto })
  @ApiResponse({ status: 404, description: 'Symbol not found' })
  async findOne(@Param('ticker') ticker: string): Promise<SymbolDto> {
    return this.symbolsService.findOne(ticker);
  }

  @Post('sync/:exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync symbols from Finnhub for an exchange' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  async syncFromFinnhub(@Param('exchange') exchange: string) {
    return this.symbolsService.syncFromFinnhub(exchange);
  }

  @Post(':ticker/enrich')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enrich symbol with company profile from Finnhub' })
  @ApiResponse({ status: 200, description: 'Symbol enriched successfully' })
  @ApiResponse({ status: 404, description: 'Symbol not found' })
  async enrichSymbol(@Param('ticker') ticker: string) {
    return this.symbolsService.enrichSymbol(ticker);
  }
}
