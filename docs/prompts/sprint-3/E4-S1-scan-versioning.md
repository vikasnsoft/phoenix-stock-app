# E4-S1: SavedScanVersion Model & Versioning Logic

**Epic**: Save/Load Scans + Versioning  
**Sprint**: 3  
**Status**: Pending  
**Priority**: P1 (High)

## Goal

Add immutable versioning to saved scans so every edit creates a new version, enabling history tracking and rollback.

## Context

- `SavedScan` model exists in Prisma schema
- Current behavior: updates overwrite `definition` field
- Need: append-only version history per scan

## Technical Requirements

### 1. Add Prisma Model

**File**: `apps/api/prisma/schema.prisma`

Add new model after `SavedScan`:

```prisma
model SavedScanVersion {
  id            String   @id @default(uuid())
  savedScanId   String
  savedScan     SavedScan @relation(fields: [savedScanId], references: [id], onDelete: Cascade)

  versionNumber Int
  definition    Json        // Snapshot of filters + expression + metadata
  createdAt     DateTime    @default(now())
  createdById   String?     // Optional: track who made the change
  comment       String?     // Optional: "what changed"

  @@unique([savedScanId, versionNumber])
  @@index([savedScanId])
  @@map("saved_scan_versions")
}
```

Update `SavedScan` to add relation:

```prisma
model SavedScan {
  // ... existing fields ...
  versions      SavedScanVersion[]
}
```

Run migration:

```bash
cd apps/api
npx prisma migrate dev --name add_saved_scan_versions
```

### 2. Update SavedScansService

**File**: `apps/api/src/modules/saved-scans/saved-scans.service.ts`

#### On Create:

```typescript
async create(dto: CreateSavedScanDto): Promise<WhateverReturnType> {
  const user = await this.getDefaultUser();

  const savedScan = await this.prisma.savedScan.create({
    data: {
      name: dto.name,
      description: dto.description,
      definition: { filters: dto.filters, filterLogic: dto.filterLogic },
      symbolUniverse: dto.symbols || [],
      userId: user.id,
      versions: {
        create: {
          versionNumber: 1,
          definition: { filters: dto.filters, filterLogic: dto.filterLogic },
          comment: 'Initial version',
        },
      },
    },
    include: {
      versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
    },
  });

  return this.mapSavedScan(savedScan);
}
```

#### On Update (new method):

```typescript
async update(id: string, dto: UpdateSavedScanDto): Promise<WhateverReturnType> {
  const existing = await this.prisma.savedScan.findUnique({
    where: { id },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
  });

  if (!existing) {
    throw new NotFoundException(`SavedScan ${id} not found`);
  }

  const latestVersion = existing.versions[0];
  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  const updated = await this.prisma.savedScan.update({
    where: { id },
    data: {
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description,
      definition: { filters: dto.filters, filterLogic: dto.filterLogic },
      symbolUniverse: dto.symbols ?? existing.symbolUniverse,
      versions: {
        create: {
          versionNumber: nextVersionNumber,
          definition: { filters: dto.filters, filterLogic: dto.filterLogic },
          comment: dto.comment ?? `Version ${nextVersionNumber}`,
        },
      },
    },
    include: {
      versions: { orderBy: { versionNumber: 'desc' }, take: 5 },
    },
  });

  return this.mapSavedScan(updated);
}
```

#### Add method to get versions:

```typescript
async getVersions(scanId: string): Promise<SavedScanVersion[]> {
  const versions = await this.prisma.savedScanVersion.findMany({
    where: { savedScanId: scanId },
    orderBy: { versionNumber: 'desc' },
  });

  return versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    createdAt: v.createdAt,
    comment: v.comment,
  }));
}
```

### 3. Create DTO

**File**: `apps/api/src/modules/saved-scans/dto/update-saved-scan.dto.ts` (new)

```typescript
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import {
  FilterConditionDto,
  FilterLogic,
} from "../../common/dto/filter-config.dto";

export class UpdateSavedScanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: () => [FilterConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  filters?: FilterConditionDto[];

  @ApiPropertyOptional({ enum: FilterLogic })
  @IsOptional()
  filterLogic?: FilterLogic;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  symbols?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
```

### 4. Add Controller Endpoints

**File**: `apps/api/src/modules/saved-scans/saved-scans.controller.ts`

```typescript
@Put(':id')
@ApiOperation({ summary: 'Update a saved scan (creates new version)' })
@ApiResponse({ status: 200, description: 'Updated scan with new version' })
async updateSavedScan(
  @Param('id') id: string,
  @Body() dto: UpdateSavedScanDto,
): Promise<ApiResponseModel<any>> {
  const data = await this.savedScansService.update(id, dto);
  return createSuccessResponse(data);
}

@Get(':id/versions')
@ApiOperation({ summary: 'Get version history for a saved scan' })
@ApiResponse({ status: 200, description: 'List of versions' })
async getVersions(@Param('id') id: string): Promise<ApiResponseModel<any>> {
  const data = await this.savedScansService.getVersions(id);
  return createSuccessResponse(data);
}
```

## Files to Create/Modify

- **Modify**: `apps/api/prisma/schema.prisma` (add `SavedScanVersion` model)
- **Create**: Migration file (auto-generated)
- **Modify**: `apps/api/src/modules/saved-scans/saved-scans.service.ts`
- **Create**: `apps/api/src/modules/saved-scans/dto/update-saved-scan.dto.ts`
- **Modify**: `apps/api/src/modules/saved-scans/saved-scans.controller.ts`

## Acceptance Criteria

- [ ] Prisma migration runs successfully
- [ ] Creating a scan creates version 1
- [ ] Updating a scan creates incremental versions
- [ ] GET /saved-scans/:id/versions returns version list
- [ ] Each version has immutable snapshot of definition
- [ ] SavedScan.definition always reflects latest version

## Testing Steps

1. **Run migration**:

   ```bash
   cd apps/api
   npx prisma migrate dev --name add_saved_scan_versions
   npx prisma generate
   ```

2. **Test create**:

   ```bash
   curl -X POST http://localhost:4001/api/saved-scans \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Scan",
       "filters": [{"type": "price", "field": "close", "operator": "gt", "value": 100}],
       "filterLogic": "AND"
     }'
   ```

3. **Test update**:

   ```bash
   curl -X PUT http://localhost:4001/api/saved-scans/{id} \
     -H "Content-Type: application/json" \
     -d '{
       "filters": [{"type": "price", "field": "close", "operator": "gt", "value": 150}],
       "comment": "Increased threshold"
     }'
   ```

4. **Get versions**:
   ```bash
   curl http://localhost:4001/api/saved-scans/{id}/versions
   ```

Expected: Array of versions with incrementing `versionNumber`.

## Dependencies

- Existing SavedScan model and service

## Next Steps

- E4-S2: GET /saved-scans/:id (return full definition + versions)
- E4-S3: Edit in Builder (load scan into UI)
