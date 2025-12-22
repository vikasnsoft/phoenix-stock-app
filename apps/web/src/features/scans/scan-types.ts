/**
 * @deprecated Use @/lib/types/filter.types.ts instead
 */
import { z } from "zod";

export const filterTypeEnumValues = [
  "price",
  "indicator",
  "financial",
  "volume",
  "price_change",
  "volume_change",
  "price_52week",
  "gap",
  "pattern",
  "function",
] as const;

export type FilterType = (typeof filterTypeEnumValues)[number];

// Extended for Phase 2: Arithmetic
export type ArithmeticOperator = '*' | '/' | '+' | '-';

// Schema for a single condition (Leaf Node)
export const filterConditionSchema = z.object({
  id: z.string(),
  type: z.literal("filter"),
  filterType: z.enum(filterTypeEnumValues).default('price'),
  field: z.string().optional(),
  operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq', 'ne', 'crossed_above', 'crossed_below']).optional(),
  value: z.union([z.string(), z.number(), z.record(z.string(), z.any())]).optional(),

  // Additional params
  pattern: z.string().optional(),
  timeframe: z.string().default("daily"),
  offset: z.number().default(0),
  time_period: z.number().optional(), // For LHS indicator params

  // UI helper interaction state
  valueType: z.enum(['number', 'indicator']).default('number'),

  // New: Arithmetic Modifier (e.g. * 1.03)
  arithmetic: z.object({
    operator: z.enum(['*', '/', '+', '-']),
    value: z.number()
  }).optional(),
});

export type FilterCondition = z.infer<typeof filterConditionSchema>;

// Schema for a group (Branch Node)
// Recursive schema definition in Zod is tricky, so we use type interface for recursion
export interface FilterGroup {
  id: string;
  type: "group";
  logic: "AND" | "OR";
  children: (FilterGroup | FilterCondition)[];
}

// Union Type
export type FilterNode = FilterGroup | FilterCondition;

export const defaultCondition: FilterCondition = {
  id: "temp-id", // Should be UUID in real app
  type: "filter",
  filterType: "price",
  field: "close",
  operator: "gt",
  value: 0,
  timeframe: "daily",
  offset: 0,
  valueType: "number",
};
