import { describe, expect, it } from 'vitest';
import { isVisible } from '../../src/core/model';
import type { FieldDef } from '../../src/core/model';

const field = (show_if?: FieldDef['show_if']): FieldDef => ({
  key: 'cleat_r',
  label: 'cleat',
  group: 'shoes',
  type: 'number',
  ...(show_if ? { show_if } : {}),
});
const platform = { pedals: { v: 'platform', s: 'ok' as const, src: 'dictated' as const } };

describe('isVisible', () => {
  it('shows a field without a condition', () => {
    expect(isVisible(field(), {})).toBe(true);
  });

  it('hides cleat fields on platform pedals', () => {
    const f = field({ key: 'pedals', op: 'ne', value: 'platform' });
    expect(isVisible(f, platform)).toBe(false);
    expect(isVisible(f, {})).toBe(true);
  });

  it('supports eq, in, not_in, set and unset', () => {
    expect(isVisible(field({ key: 'pedals', op: 'eq', value: 'platform' }), platform)).toBe(true);
    expect(
      isVisible(field({ key: 'pedals', op: 'in', value: ['spd', 'platform'] }), platform),
    ).toBe(true);
    expect(isVisible(field({ key: 'pedals', op: 'not_in', value: ['platform'] }), platform)).toBe(
      false,
    );
    expect(isVisible(field({ key: 'pedals', op: 'not_in', value: ['platform'] }), {})).toBe(true);
    expect(isVisible(field({ key: 'pedals', op: 'set' }), platform)).toBe(true);
    expect(isVisible(field({ key: 'pedals', op: 'unset' }), platform)).toBe(false);
  });

  it('treats a missing value as unset', () => {
    const missing = { pedals: { v: null, s: 'missing' as const, src: 'dictated' as const } };
    expect(isVisible(field({ key: 'pedals', op: 'set' }), missing)).toBe(false);
  });
});
