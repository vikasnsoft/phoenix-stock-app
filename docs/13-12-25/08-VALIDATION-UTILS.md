# ✅ Step 8: Validation & Utilities

Create validation logic for filters.

## File Location

Create: `src/lib/utils/filter-validator.ts`

## Validation Rules

1. Must have comparison operator
2. Only one comparison per filter  
3. Stock attributes need offset
4. Indicators need parameters
5. Value type must match

## Helper Functions

```typescript
export function validateFilter(filter: Filter): string[]
export function validateScan(config: ScanConfig): ValidationResult
export function filterToString(filter: Filter): string
export function filterToQuery(filter: Filter): object
```

👉 **Next**: [09-TESTING-GUIDE.md](./09-TESTING-GUIDE.md)
