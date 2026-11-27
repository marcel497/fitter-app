import type { FieldDef } from './types';

/**
 * Whether two field definitions record the same quantity, so their values may be
 * compared row by row (for example across two fits made with different profile
 * revisions). Position fields compare by geometry, standard fields by `std` id, and
 * the fitter's own fields by key and unit.
 */
export function sameMeaning(a: FieldDef, b: FieldDef): boolean {
  if (a.geometry || b.geometry) {
    return (
      !!a.geometry &&
      !!b.geometry &&
      a.geometry.from === b.geometry.from &&
      a.geometry.to === b.geometry.to &&
      a.geometry.measure === b.geometry.measure
    );
  }
  if (a.std || b.std) return a.std === b.std;
  return a.key === b.key && (a.unit ?? '') === (b.unit ?? '');
}
