import type { FieldDef, Value } from './types';
import { hasValue } from './value';

/**
 * Whether a field is shown, given the values already recorded in the same set-up.
 * A field without `show_if` is always shown. A missing value counts as unset.
 */
export function isVisible(field: FieldDef, values: Record<string, Value>): boolean {
  const cond = field.show_if;
  if (!cond) return true;
  const value = values[cond.key];
  const isSet = hasValue(value);
  const v = isSet ? value.v : undefined;
  switch (cond.op) {
    case 'set':
      return isSet;
    case 'unset':
      return !isSet;
    case 'eq':
      return v === cond.value;
    case 'ne':
      return v !== cond.value;
    case 'in':
      return v !== undefined && cond.value.includes(v);
    case 'not_in':
      return v === undefined || !cond.value.includes(v);
  }
}
