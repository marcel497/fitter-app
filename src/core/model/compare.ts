import type { FieldDef, Fit, Scalar, Setup, Value } from './types';
import { hasValue } from './value';

export interface CompareRow {
  key: string;
  field?: FieldDef;
  /** Value in the first compared set-up, if any. */
  a?: Value;
  /** Value in the second compared set-up, if any. */
  b?: Value;
  /** b − a, only when both sides hold a number. */
  delta?: number;
}

function numeric(v: Scalar): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Difference between two values, or undefined when either is not a recorded number. */
export function delta(a: Value | undefined, b: Value | undefined): number | undefined {
  if (!hasValue(a) || !hasValue(b) || !numeric(a.v) || !numeric(b.v)) return undefined;
  return roundTiny(b.v - a.v);
}

/** Avoid 0.30000000000000004 style noise from float subtraction. */
function roundTiny(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function findSetup(fit: Fit, id: string): Setup | undefined {
  return fit.setups.find((s) => s.id === id);
}

/**
 * Rows for the side-by-side comparison of the fit's two compared set-ups.
 * Every field with a value on at least one side is listed (a field recorded only
 * after shows in the after column alone); `delta` is set only when both sides
 * hold a number. Order: the snapshot's field order, then any other keys.
 */
export function compareRows(fit: Fit): CompareRow[] {
  const [idA, idB] = fit.compare;
  const a = idA ? findSetup(fit, idA) : undefined;
  const b = idB ? findSetup(fit, idB) : undefined;
  const fields = fit.profile.snapshot.fields;
  const byKey = new Map(fields.map((f) => [f.key, f]));
  // A Set keeps insertion order: profile fields first, then other recorded keys.
  const keys = new Set([
    ...byKey.keys(),
    ...Object.keys(a?.values ?? {}),
    ...Object.keys(b?.values ?? {}),
  ]);

  const rows: CompareRow[] = [];
  for (const key of keys) {
    const va = a?.values[key];
    const vb = b?.values[key];
    if (!hasValue(va) && !hasValue(vb)) continue;
    const row: CompareRow = { key };
    const field = byKey.get(key);
    if (field) row.field = field;
    if (hasValue(va)) row.a = va;
    if (hasValue(vb)) row.b = vb;
    const d = delta(va, vb);
    if (d !== undefined) row.delta = d;
    rows.push(row);
  }
  return rows;
}
