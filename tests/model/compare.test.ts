import { describe, expect, it } from 'vitest';
import { compareRows, delta } from '../../src/core/model';
import { loadFit } from '../../src/core/migrate';
import { migrateOptions, v1 } from '../helpers';

describe('delta', () => {
  it('subtracts without float noise', () => {
    expect(delta({ v: 0.1, s: 'ok', src: 'typed' }, { v: 0.4, s: 'ok', src: 'typed' })).toBe(0.3);
  });

  it('is undefined when a side is missing or not a number', () => {
    expect(delta(undefined, { v: 1, s: 'ok', src: 'typed' })).toBeUndefined();
    expect(
      delta({ v: null, s: 'missing', src: 'typed' }, { v: 1, s: 'ok', src: 'typed' }),
    ).toBeUndefined();
    expect(
      delta({ v: 'a', s: 'ok', src: 'typed' }, { v: 1, s: 'ok', src: 'typed' }),
    ).toBeUndefined();
  });
});

describe('compareRows', () => {
  const loaded = loadFit(v1('road-before-after'), migrateOptions);
  if (loaded.kind !== 'ok') throw new Error('fixture did not load');
  const rows = compareRows(loaded.fit);
  const row = (key: string) => rows.find((r) => r.key === key);

  it('lists profile fields first, in profile order', () => {
    expect(rows.slice(0, 4).map((r) => r.key)).toEqual([
      'seat_tilt',
      'seat_height',
      'setback',
      'drop',
    ]);
  });

  it('gives a delta when both sides have a number', () => {
    expect(row('seat_height')?.delta).toBe(-11);
    expect(row('setback')?.delta).toBe(9);
    expect(row('seat_tilt')?.delta).toBe(3.5);
  });

  it('shows a field recorded only after in the after column alone', () => {
    expect(row('setback_tip')?.a).toBeUndefined();
    expect(row('setback_tip')?.b?.v).toBe(62);
    expect(row('setback_tip')?.delta).toBeUndefined();
  });
});
