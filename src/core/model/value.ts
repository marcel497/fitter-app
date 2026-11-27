import type { Value } from './types';

/** Whether a value has actually been recorded: present, not missing, not empty. */
export function hasValue(value: Value | undefined): value is Value {
  return value !== undefined && value.s !== 'missing' && value.v !== null && value.v !== '';
}
