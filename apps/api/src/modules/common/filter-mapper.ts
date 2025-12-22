import { FilterConditionDto, FilterType } from './dto/filter-config.dto';
import { ExpressionNodeDto } from './dto/expression.dto';

const snakeCaseMappings: Record<string, keyof FilterConditionDto> = {
  field: 'field',
  operator: 'operator',
  value: 'value',
  time_period: 'timePeriod',
  offset: 'offset',
  avg_period: 'avgPeriod',
  multiplier: 'multiplier',
  lookback: 'lookback',
  lookback_days: 'lookbackDays',
  metric: 'metric',
  pattern: 'pattern',
  timeframe: 'timeframe'
};

const financialFields = [
  'pe', 'pb', 'eps', 'dividend_yield', 'roe', 'roce',
  'total_assets', 'total_liabilities', 'debt_to_equity', 'current_ratio',
  'operating_cash_flow', 'free_cash_flow'
];

const buildFilterPayload = (filter: FilterConditionDto): Record<string, unknown> => {
  let type = filter.type;

  // Override type for financial metrics
  if (filter.field && financialFields.includes(filter.field.toLowerCase())) {
    type = FilterType.FINANCIAL;
  }

  const payload: Record<string, unknown> = { type };

  Object.entries(snakeCaseMappings).forEach(([targetKey, sourceKey]) => {
    const value = filter[sourceKey];
    if (value !== undefined) {
      payload[targetKey] = value;
    }
  });

  if (filter.expression) {
    payload.expression = mapExpressionToSnakeCase(filter.expression);
  }

  if (filter.filters?.length) {
    payload.filters = mapFilters(filter.filters);
  }

  return payload;
};

function mapExpressionToSnakeCase(node: ExpressionNodeDto): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: node.type,
  };

  if (node.field !== undefined) {
    result.field = node.field;
  }
  if (node.time_period !== undefined) {
    result.time_period = node.time_period;
  }
  if (node.offset !== undefined) {
    result.offset = node.offset;
  }
  if (node.timeframe !== undefined) {
    result.timeframe = node.timeframe;
  }
  if (node.value !== undefined) {
    result.value = node.value;
  }
  if (node.operator !== undefined) {
    result.operator = node.operator;
  }
  if (node.name !== undefined) {
    result.name = node.name;
  }
  if (node.left) {
    result.left = mapExpressionToSnakeCase(node.left);
  }
  if (node.right) {
    result.right = mapExpressionToSnakeCase(node.right);
  }
  if (node.args) {
    result.args = node.args.map((child) => mapExpressionToSnakeCase(child));
  }

  return result;
}

export const mapFilters = (filters: FilterConditionDto[]): Record<string, unknown>[] => {
  return filters.map((filter) => buildFilterPayload(filter));
};
