import { describe, expect, it } from 'vitest';
import { applyValue, SOURCE_RANK } from '../../src/core/model';
import type { Setup } from '../../src/core/model';

const setup = (src: Setup['values'][string]['src']): Setup => ({
  id: 's2',
  template: 'after',
  label: 'After',
  values: { drop: { v: 96, s: 'ok', src } },
});

describe('applyValue', () => {
  it('lets a higher or equal source overwrite', () => {
    const r = applyValue(setup('dictated'), 'drop', { v: 98, s: 'ok', src: 'fitter' });
    expect(r.applied).toBe(true);
    expect(r.setup.values.drop?.v).toBe(98);
    const same = applyValue(setup('dictated'), 'drop', { v: 97, s: 'ok', src: 'typed' });
    expect(same.applied).toBe(true);
  });

  it('turns a lower source into a proposal and leaves the set-up alone', () => {
    const before = setup('dictated');
    const r = applyValue(before, 'drop', { v: 90, s: 'ok', src: 'ai', note: 'from transcript' });
    expect(r.applied).toBe(false);
    expect(r.setup).toBe(before);
    if (!r.applied) {
      expect(r.proposal).toEqual({
        setup: 's2',
        key: 'drop',
        v: 90,
        src: 'ai',
        note: 'from transcript',
      });
    }
  });

  it('always replaces a derived value', () => {
    const r = applyValue(setup('derived'), 'drop', { v: 90, s: 'ok', src: 'default' });
    expect(r.applied).toBe(true);
  });

  it('writes a new key and does not mutate the input', () => {
    const before = setup('dictated');
    const r = applyValue(before, 'reach', { v: 548, s: 'ok', src: 'dictated' });
    expect(r.setup.values.reach?.v).toBe(548);
    expect(before.values.reach).toBeUndefined();
  });

  it('ranks sources as the spec lists them', () => {
    expect(SOURCE_RANK.fitter).toBeGreaterThan(SOURCE_RANK.dictated);
    expect(SOURCE_RANK.dictated).toBe(SOURCE_RANK.typed);
    expect(SOURCE_RANK.typed).toBeGreaterThan(SOURCE_RANK.transcript);
    expect(SOURCE_RANK.ai).toBe(SOURCE_RANK.transcript);
    expect(SOURCE_RANK.transcript).toBeGreaterThan(SOURCE_RANK.library);
    expect(SOURCE_RANK.db).toBe(SOURCE_RANK.library);
    expect(SOURCE_RANK.library).toBeGreaterThan(SOURCE_RANK.default);
  });
});

describe('applyValue on an empty slot', () => {
  it('fills a missing value whatever its source', () => {
    const empty: Setup = {
      id: 's2',
      template: 'after',
      label: 'After',
      values: { drop: { v: null, s: 'missing', src: 'fitter' } },
    };
    expect(applyValue(empty, 'drop', { v: 90, s: 'ok', src: 'dictated' }).applied).toBe(true);
  });
});
