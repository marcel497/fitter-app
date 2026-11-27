import type { Proposal, Setup, Source, Value } from './types';
import { hasValue } from './value';

/**
 * Source priority (SPEC, "One value"). A lower source never overwrites a higher one;
 * it becomes a proposal instead. An empty slot (missing value) takes any source. `derived` values are computed by the app: any recorded
 * source replaces them, and they never block anything.
 */
export const SOURCE_RANK: Record<Source, number> = {
  fitter: 5,
  dictated: 4,
  typed: 4,
  transcript: 3,
  ai: 3,
  photo: 3,
  library: 2,
  db: 2,
  default: 1,
  derived: 0,
};

export type ApplyResult =
  { applied: true; setup: Setup } | { applied: false; setup: Setup; proposal: Proposal };

/**
 * Write `value` into `setup.values[key]` if its source may overwrite what is there.
 * Returns a new set-up; the input is not changed.
 */
export function applyValue(setup: Setup, key: string, value: Value): ApplyResult {
  const current = setup.values[key];
  if (
    hasValue(current) &&
    current.src !== 'derived' &&
    SOURCE_RANK[value.src] < SOURCE_RANK[current.src]
  ) {
    return {
      applied: false,
      setup,
      proposal: { setup: setup.id, key, v: value.v, src: value.src, note: value.note ?? '' },
    };
  }
  return { applied: true, setup: { ...setup, values: { ...setup.values, [key]: value } } };
}
