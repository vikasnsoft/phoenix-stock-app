import {
  FilterNode,
  Filter,
  FilterGroup,
  isSimpleFilter,
  isFilterGroup,
  isIndicator,
  ValidationResult,
  FilterValidationError
} from '@/lib/types/filter.types';

/**
 * Validate a single filter node (simple or group)
 */
export function validateFilterNode(node: FilterNode): ValidationResult {
  if (isSimpleFilter(node)) {
    return validateSimpleFilter(node);
  } else if (isFilterGroup(node)) {
    return validateFilterGroup(node);
  }
  return { valid: false, errors: [{ filterId: 'unknown', field: 'type', message: 'Unknown filter type' }] };
}

/**
 * Validate a simple filter
 */
function validateSimpleFilter(filter: Filter): ValidationResult {
  const errors: FilterValidationError[] = [];
  const { expression } = filter;

  // 1. Validate Left Side Measure
  if (!expression.measure) {
    errors.push({ filterId: filter.id, field: 'measure', message: 'Measure is required' });
  } else if (isIndicator(expression.measure)) {
    // Validate recursive parameters if needed, but basic check is simple
    expression.measure.parameters.forEach((param, idx) => {
      if (typeof param === 'number' && (isNaN(param) || param === null)) {
        errors.push({ filterId: filter.id, field: `measure.parameter.${idx}`, message: 'Invalid indicator parameter' });
      }
    });
  }

  // 2. Validate Operator
  if (!expression.operator) {
    errors.push({ filterId: filter.id, field: 'operator', message: 'Operator is required' });
  }

  // 3. Validate Right Side
  if (expression.valueType === 'number') {
    if (expression.compareToNumber === undefined || expression.compareToNumber === null || isNaN(expression.compareToNumber)) {
      errors.push({ filterId: filter.id, field: 'compareToNumber', message: 'Comparison value must be a number' });
    }
  } else if (expression.valueType === 'measure') {
    if (!expression.compareToMeasure) {
      errors.push({ filterId: filter.id, field: 'compareToMeasure', message: 'Comparison measure is required' });
    } else if (isIndicator(expression.compareToMeasure)) {
      expression.compareToMeasure.parameters.forEach((param, idx) => {
        if (typeof param === 'number' && (isNaN(param) || param === null)) {
          errors.push({ filterId: filter.id, field: `compareToMeasure.parameter.${idx}`, message: 'Invalid indicator parameter' });
        }
      });
    }
  }

  // 4. Validate Arithmetic (if present)
  if (expression.arithmeticOperator && (expression.arithmeticValue === undefined || isNaN(expression.arithmeticValue))) {
    errors.push({ filterId: filter.id, field: 'arithmeticValue', message: 'Arithmetic value is invalid' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a filter group recursively
 */
function validateFilterGroup(group: FilterGroup): ValidationResult {
  const errors: FilterValidationError[] = [];
  let valid = true;

  if (group.filters.length === 0) {
    // Empty group might be valid or invalid depending on strictness. 
    // Usually an empty group does nothing, so we can consider it "valid" but ineffectual, OR invalid.
    // Let's say it's valid but warns? No, for now let's say it's valid.
  }

  for (const child of group.filters) {
    const result = validateFilterNode(child);
    if (!result.valid) {
      valid = false;
      errors.push(...result.errors);
    }
  }

  return { valid, errors };
}

/**
 * Validate entire list of root nodes
 */
export function validateScanFilters(filters: FilterNode[]): ValidationResult {
  const allErrors: FilterValidationError[] = [];
  let allValid = true;

  if (filters.length === 0) {
    return { valid: false, errors: [{ filterId: 'root', field: 'filters', message: 'At least one filter is required' }] };
  }

  for (const filter of filters) {
    const result = validateFilterNode(filter);
    if (!result.valid) {
      allValid = false;
      allErrors.push(...result.errors);
    }
  }

  return {
    valid: allValid,
    errors: allErrors
  };
}
