# E1-S1: Wire ExpressionNodeDto End-to-End

**Epic**: Expression/Filter Engine & Builder 2.0  
**Sprint**: 2  
**Status**: Pending  
**Priority**: P0 (Must for MVP)

## Goal

Ensure `ExpressionNodeDto` can be sent from frontend → Nest → MCP without data loss, enabling AST-based filter expressions.

## Context

- `ExpressionNodeDto` already defined in `apps/api/src/modules/common/dto/expression.dto.ts`
- `FilterConditionDto.expression` field exists and imports it correctly
- Need to ensure the full path works: UI → DTO → `mapFilters` → MCP tool → Python

## Technical Requirements

### 1. Verify DTO Shape

**File**: `apps/api/src/modules/common/dto/expression.dto.ts`

Current structure:

```typescript
export enum NodeType {
  ATTRIBUTE = "attribute",
  INDICATOR = "indicator",
  CONSTANT = "constant",
  BINARY = "binary",
  FUNCTION = "function",
}

export class ExpressionNodeDto {
  type!: NodeType;
  field?: string; // for ATTRIBUTE/INDICATOR
  time_period?: number; // for INDICATOR
  offset?: number; // for ATTRIBUTE/INDICATOR
  value?: number; // for CONSTANT
  operator?: string; // for BINARY
  left?: ExpressionNodeDto; // for BINARY
  right?: ExpressionNodeDto; // for BINARY
  name?: string; // for FUNCTION
  args?: ExpressionNodeDto[]; // for FUNCTION
}
```

**Validation**: Already correct, no changes needed.

### 2. Update `mapFilters` to Include Expression

**File**: `apps/api/src/modules/common/filter-mapper.ts`

**Current behavior**: Does NOT map `expression` field.

**Required change**:

```typescript
const buildFilterPayload = (
  filter: FilterConditionDto
): Record<string, unknown> => {
  const payload: Record<string, unknown> = { type: filter.type };

  Object.entries(snakeCaseMappings).forEach(([targetKey, sourceKey]) => {
    const value = filter[sourceKey];
    if (value !== undefined) {
      payload[targetKey] = value;
    }
  });

  // NEW: Map expression if present
  if (filter.expression) {
    payload.expression = mapExpressionToSnakeCase(filter.expression);
  }

  if (filter.filters?.length) {
    payload.filters = mapFilters(filter.filters);
  }

  return payload;
};

// NEW: Recursively convert ExpressionNodeDto to snake_case
function mapExpressionToSnakeCase(
  node: ExpressionNodeDto
): Record<string, any> {
  const result: Record<string, any> = { type: node.type };

  if (node.field) result.field = node.field;
  if (node.time_period !== undefined) result.time_period = node.time_period;
  if (node.offset !== undefined) result.offset = node.offset;
  if (node.value !== undefined) result.value = node.value;
  if (node.operator) result.operator = node.operator;
  if (node.name) result.name = node.name;

  if (node.left) result.left = mapExpressionToSnakeCase(node.left);
  if (node.right) result.right = mapExpressionToSnakeCase(node.right);
  if (node.args) result.args = node.args.map(mapExpressionToSnakeCase);

  return result;
}
```

### 3. Verify MCP Can Receive Expression

**File**: `apps/mcp-server/server.py`

**Current**: `scan_stocks` receives `filters: List[Dict[str, Any]]`

**Check**: Each filter dict can contain an `expression` key with nested dict structure.

**Action**: Add debug logging temporarily:

```python
def _scan_stocks_core(
    symbols: List[str],
    filters: List[Dict[str, Any]],
    filter_logic: str = "AND"
) -> Dict[str, Any]:
    logger.info(f"Starting scan with {len(filters)} filters")

    # TEMP: Log if any filter has expression
    for i, f in enumerate(filters):
        if 'expression' in f:
            logger.info(f"Filter {i} has expression: {f['expression']}")

    # ... rest of function
```

### 4. Add Simple Test

**File**: `apps/api/src/modules/scans/scans.service.spec.ts`

Add test case:

```typescript
it("should pass expression field through to MCP", async () => {
  const dto: RunScanDto = {
    symbols: ["AAPL"],
    filters: [
      {
        type: FilterType.EXPRESSION,
        operator: "gt",
        expression: {
          type: NodeType.BINARY,
          operator: ">",
          left: { type: NodeType.ATTRIBUTE, field: "close", offset: 0 },
          right: { type: NodeType.CONSTANT, value: 150 },
        },
      },
    ],
    filterLogic: FilterLogic.AND,
  };

  const result = await service.runCustomScan(dto);

  // Verify MCP was called with expression in payload
  expect(mcpService.executeTool).toHaveBeenCalledWith(
    expect.objectContaining({
      payload: expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({ expression: expect.any(Object) }),
        ]),
      }),
    })
  );
});
```

## Files to Create/Modify

- **Modify**: `apps/api/src/modules/common/filter-mapper.ts` (add `mapExpressionToSnakeCase`)
- **Modify**: `apps/mcp-server/server.py` (temp debug logging)
- **Modify**: `apps/api/src/modules/scans/scans.service.spec.ts` (add test)

## Acceptance Criteria

- [ ] `FilterConditionDto` with `expression` field passes validation
- [ ] `mapFilters` converts `expression` to snake_case recursively
- [ ] MCP `scan_stocks` receives `expression` dict in filter payload
- [ ] Unit test verifies expression pass-through
- [ ] No errors in Nest logs when expression is sent

## Testing Steps

1. **Unit test**:

   ```bash
   cd apps/api
   npm test -- scans.service.spec
   ```

2. **Manual API test**:

   ```bash
   curl -X POST http://localhost:4001/api/scans/run \
     -H "Content-Type: application/json" \
     -d '{
       "symbols": ["AAPL"],
       "filters": [{
         "type": "expression",
         "operator": "gt",
         "expression": {
           "type": "binary",
           "operator": ">",
           "left": {"type": "attribute", "field": "close", "offset": 0},
           "right": {"type": "constant", "value": 150}
         }
       }],
       "filterLogic": "AND"
     }'
   ```

3. **Check MCP logs**:
   - Look for "Filter 0 has expression: {...}" in MCP server output
   - Verify structure is correct snake_case

## Dependencies

- None (foundation story)

## Next Steps

After this story:

- E1-S2: Implement AST evaluation in MCP (actually compute the expression)
- E1-S3: Add grouped filters support
