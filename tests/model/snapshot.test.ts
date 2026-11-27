import { describe, expect, it } from 'vitest';
import { resolveBikeType, snapshotOf, SOURCES, STATUSES, MEASURES } from '../../src/core/model';
import { fitSchema, profileSchema } from '../../src/core/schema/validate';
import { syntheticProfile } from '../helpers';

describe('snapshotOf', () => {
  it('copies what a fit needs from the profile', () => {
    const p = syntheticProfile();
    const s = snapshotOf(p, 'road');
    expect(s?.fields).toBe(p.fields);
    expect(s?.language).toBe('en-GB');
    expect(s?.bike_type.templates?.after).toHaveLength(5);
  });

  it('resolves extends: gravel takes the road templates and keeps its own label', () => {
    const gravel = resolveBikeType(syntheticProfile(), 'gravel');
    expect(gravel?.label).toBe('Gravel');
    expect(gravel?.templates?.before).toHaveLength(2);
    expect(gravel?.extends).toBeUndefined();
  });

  it('stops on a cycle and returns undefined for an unknown type', () => {
    const p = syntheticProfile();
    p.bike_types.a = { extends: 'b', label: 'A' };
    p.bike_types.b = { extends: 'a' };
    expect(resolveBikeType(p, 'a')?.label).toBe('A');
    expect(snapshotOf(p, 'toString')).toBeUndefined();
  });
});

describe('lists shared by code and schemas', () => {
  it('stay in step', () => {
    expect([...fitSchema.$defs.source.enum]).toEqual([...SOURCES]);
    expect([...fitSchema.$defs.status.enum]).toEqual([...STATUSES]);
    expect([...profileSchema.$defs.geometry.properties.measure.enum]).toEqual([...MEASURES]);
  });
});
