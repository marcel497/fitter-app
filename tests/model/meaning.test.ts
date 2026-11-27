import { describe, expect, it } from 'vitest';
import { sameMeaning } from '../../src/core/model';
import type { FieldDef } from '../../src/core/model';

const base = { label: 'drop', group: 'position', type: 'number', unit: 'mm' } as const;
const dropTop: FieldDef = {
  ...base,
  key: 'drop',
  geometry: { from: 'saddle_ref', to: 'bar_top_at_stem', measure: 'vertical' },
};
const dropCentre: FieldDef = {
  ...base,
  key: 'drop',
  geometry: { from: 'saddle_ref', to: 'bar_centre_at_stem', measure: 'vertical' },
};

describe('sameMeaning', () => {
  it('tells drop to bar top from drop to bar centre, though both are called drop', () => {
    expect(sameMeaning(dropTop, dropCentre)).toBe(false);
    expect(sameMeaning(dropTop, { ...dropTop, key: 'other_name' })).toBe(true);
  });

  it('compares standard fields by std id', () => {
    const a: FieldDef = {
      key: 'a',
      label: 'a',
      group: 'angle',
      type: 'number',
      std: 'saddle.tilt',
    };
    expect(sameMeaning(a, { ...a, key: 'b' })).toBe(true);
    expect(sameMeaning(a, { ...a, std: 'bar.angle' })).toBe(false);
    expect(sameMeaning(a, dropTop)).toBe(false);
  });

  it('compares own fields by key and unit', () => {
    const own: FieldDef = { key: 'note', label: 'note', group: 'other', type: 'text' };
    expect(sameMeaning(own, { ...own, label: 'renamed' })).toBe(true);
    expect(sameMeaning(own, { ...own, key: 'other' })).toBe(false);
  });
});
