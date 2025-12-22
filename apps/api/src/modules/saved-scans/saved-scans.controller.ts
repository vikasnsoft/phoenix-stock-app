import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponse as ApiResponseModel, createSuccessResponse } from '../../shared/api-response';
import { IdentifierParamDto } from '../common/dto/identifier-param.dto';
import { CreateSavedScanDto } from './dto/create-saved-scan.dto';
import { SavedScansService } from './saved-scans.service';
import { UpdateSavedScanDto } from './dto/update-saved-scan.dto';

@ApiTags('Saved Scans')
@Controller('saved-scans')
export class SavedScansController {
  constructor(private readonly savedScansService: SavedScansService) { }

  @Post()
  @ApiOperation({ summary: 'Create a saved scan definition' })
  @ApiResponse({ status: 200, description: 'Created saved scan' })
  public async createSavedScan(@Body() dto: CreateSavedScanDto): Promise<ApiResponseModel<any>> {
    const data = await this.savedScansService.create(dto);
    return createSuccessResponse(data);
  }

  @Get()
  @ApiOperation({ summary: 'List saved scans' })
  @ApiResponse({ status: 200, description: 'List of saved scans' })
  public async listSavedScans(): Promise<ApiResponseModel<any>> {
    const data = await this.savedScansService.findAll();
    return createSuccessResponse(data);
  }

  @Post(':identifier/run')
  @ApiOperation({ summary: 'Execute a saved scan by identifier' })
  @ApiResponse({ status: 200, description: 'Execution results for the saved scan' })
  public async runSavedScan(@Param() params: IdentifierParamDto): Promise<ApiResponseModel<any>> {
    const data = await this.savedScansService.runSavedScan(params.identifier);
    return createSuccessResponse(data);
  }

  @Delete(':identifier')
  @ApiOperation({ summary: 'Delete a saved scan' })
  @ApiResponse({ status: 200, description: 'Deletion confirmation' })
  public async deleteSavedScan(@Param() params: IdentifierParamDto): Promise<ApiResponseModel<any>> {
    const data = await this.savedScansService.deleteSavedScan(params.identifier);
    return createSuccessResponse(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a saved scan (creates new version)' })
  @ApiResponse({ status: 200, description: 'Updated scan with new version' })
  public async updateSavedScan(
    @Param('id') id: string,
    @Body() dto: UpdateSavedScanDto
  ): Promise<ApiResponseModel<any>> {
    const data = await this.savedScansService.update(id, dto);
    return createSuccessResponse(data);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history for a saved scan' })
  @ApiResponse({ status: 200, description: 'List of versions' })
  public async getVersions(@Param('id') id: string): Promise<ApiResponseModel<any>> {
    const data = await this.savedScansService.getVersions(id);
    return createSuccessResponse(data);
  }
}
