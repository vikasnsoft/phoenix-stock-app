import { FilterConditionDto, FilterType } from './dto/filter-config.dto';
import { mapFilters } from './filter-mapper';

describe('filter-mapper', () => {
  it('should map basic price filter fields to MCP payload', () => {
    const filter: FilterConditionDto = {
      type: FilterType.PRICE,
      field: 'close',
      operator: 'gt',
      value: 100
    };

    const result = mapFilters([filter]);

    expect(result).toEqual([
      {
        type: 'price',
        field: 'close',
        operator: 'gt',
        value: 100
      }
    ]);
  });

  it('should include pattern and timeframe for pattern filters', () => {
    const filter: FilterConditionDto = {
      type: FilterType.PATTERN,
      operator: 'eq',
      pattern: 'hammer',
      timeframe: 'daily'
    };

    const result = mapFilters([filter]);

    expect(result).toEqual([
      {
        type: 'pattern',
        operator: 'eq',
        pattern: 'hammer',
        timeframe: 'daily'
      }
    ]);
  });

  it('should map nested filters recursively', () => {
    const childFilter: FilterConditionDto = {
      type: FilterType.PRICE,
      field: 'close',
      operator: 'gt',
      value: 0
    };

    const parentFilter: FilterConditionDto = {
      type: FilterType.PRICE,
      field: 'close',
      operator: 'gt',
      value: 0,
      filters: [childFilter]
    };

    const result = mapFilters([parentFilter]);

    expect(result).toEqual([
      {
        type: 'price',
        field: 'close',
        operator: 'gt',
        value: 0,
        filters: [
          {
            type: 'price',
            field: 'close',
            operator: 'gt',
            value: 0
          }
        ]
      }
    ]);
  });
});
