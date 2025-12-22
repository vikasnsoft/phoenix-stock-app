import {
  FilterNode,
  FilterExpression,
  isSimpleFilter,
  isFilterGroup,
  isIndicator,
  OffsetType,
  Indicator
} from '@/lib/types/filter.types';
import { OFFSET_OPTIONS } from '@/lib/constants/offsets';
import { getIndicatorConfig } from '@/lib/constants/indicators';

/**
 * Convert OffsetType (e.g. '1d_ago') to numeric offset (e.g. 1)
 */
function getOffsetDays(offset: OffsetType | undefined): number {
  if (!offset) return 0;
  const option = OFFSET_OPTIONS.find(o => o.value === offset);
  return option ? option.days : 0;
}

/**
 * Build AST for a single measure (LHS or RHS)
 */
function buildMeasureAst(
  measure: string | Indicator,
  offset: OffsetType | undefined,
  timeframe: string | undefined,
  expression: FilterExpression // Pass full expression for context (arithmetic) -> actually arithmetic is usually on LHS or RHS? 
  // In `FilterExpression` type: arithmeticOperator is top level, usually applies to LHS before comparison? 
  // "Close * 1.05 > Open" -> Binary(Op, Binary(*, Close, 1.05), Open)
  // Let's assume arithmetic applies to the LEFT side for now given the interface structure has "arithmeticOperator" at root alongside "measure".
  // Or typically arithmetic modifies the RIGHT side value? "Close > Open * 1.05".
  // The interface I defined in filter.types.ts has:
  // arithmeticOperator?: '+' | '-' | '*' | '/';
  // arithmeticValue?: number;

  // Usually in scanners: "Close > SMA(20) * 1.02" ( SMA + 2% )
  // Or "Close > 100 * 1.05"
  // So likely it modifies the Right Hand Side if the filter is "LHS > RHS (+ mod)".
  // BUT the UI shows `expression.measure` (LHS) and `expression.compareTo...` (RHS).
  // If `arithmeticOperator` is on `FilterExpression`, where does it apply?
  // Previous usage: "Close > High * 0.98".
  // Only applied to RHS in old `scan-builder`.

  // So I will apply arithmetic to the RHS result.
) {
  if (isIndicator(measure)) {
    // It's an indicator
    const config = getIndicatorConfig(measure.type);

    const astNode: any = {
      type: 'indicator',
      field: measure.type.toUpperCase(),
      time_period: 14, // Default fallback
      offset: getOffsetDays(offset),
      timeframe: timeframe || 'daily'
    };

    // Map array params to named params based on config
    if (config && config.hasParameters && config.parameters) {
      measure.parameters.forEach((val, idx) => {
        if (config.parameters && config.parameters[idx]) {
          const paramName = config.parameters[idx].name;
          astNode[paramName] = val;

          // Map standard 'period' to 'time_period' for backend compatibility
          if (paramName === 'period' || paramName === 'time_period') {
            astNode.time_period = Number(val);
          }
        }
      });
    } else if (measure.parameters && measure.parameters.length > 0) {
      // Fallback: assume first param is time_period if no config found
      astNode.time_period = Number(measure.parameters[0]);
    }

    return astNode;
  } else {
    // It's an attribute
    return {
      type: 'attribute',
      field: measure, // 'close', 'open'
      offset: getOffsetDays(offset),
      timeframe: timeframe || 'daily'
    };
  }
}

/**
 * Main AST Builder
 */
export function buildAst(node: FilterNode): any {
  if (isSimpleFilter(node)) {
    const { expression } = node;

    // 1. Build Left Side
    const leftNode = buildMeasureAst(expression.measure, expression.offset, expression.timeframe, expression);

    // 2. Build Right Side
    let rightNode: any;

    if (expression.valueType === 'number') {
      rightNode = {
        type: 'constant',
        value: expression.compareToNumber ?? 0
      };
    } else {
      // Compare to measure
      const rhsMeasure = expression.compareToMeasure || 'close'; // fallback
      const rhsOffset = expression.compareToOffset || expression.offset; // fallback to LHS offset
      const rhsTimeframe = expression.compareToTimeframe || expression.timeframe; // fallback to LHS timeframe
      rightNode = buildMeasureAst(rhsMeasure, rhsOffset, rhsTimeframe, expression);
    }

    // 3. Apply Arithmetic to Right Side (if exists)
    // "Close > Open * 1.05"
    if (expression.arithmeticOperator && expression.arithmeticValue !== undefined) {
      rightNode = {
        type: 'binary',
        operator: expression.arithmeticOperator,
        left: rightNode,
        right: { type: 'constant', value: expression.arithmeticValue }
      };
    }

    // 4. Return Binary Expression
    return {
      type: 'binary',
      operator: expression.operator === '==' ? 'eq' : (expression.operator === '!=' ? 'ne' : expression.operator),
      left: leftNode,
      right: rightNode
    };

  } else if (isFilterGroup(node)) {
    // Group Logic
    if (node.filters.length === 0) return { type: 'constant', value: 1 };

    const op = node.conjunction === 'AND' ? 'AND' : 'OR';
    // [A, B, C] -> A AND B AND C

    const childAsts = node.filters.map(buildAst);

    // Reduce array to single nested AST
    return childAsts.reduce((acc, curr) => ({
      type: 'binary',
      operator: op,
      left: acc,
      right: curr
    }));
  }

  return { type: 'constant', value: 1 };
}
