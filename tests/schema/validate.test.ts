import { describe, expect, it } from 'vitest';
import { validateFit, validateProfile } from '../../src/core/schema/validate';
import { migrateFitV1toV2 } from '../../src/core/migrate';
import { migrateOptions, syntheticProfile, v1 } from '../helpers';

describe('validateProfile', () => {
  it('accepts the synthetic profile', () => {
    expect(validateProfile(syntheticProfile())).toEqual({ ok: true, problems: [] });
  });

  it('keeps unknown keys valid', () => {
    expect(validateProfile({ ...syntheticProfile(), future_key: { a: 1 } }).ok).toBe(true);
  });

  it('names missing top-level keys', () => {
    const { rev: _rev, ...rest } = syntheticProfile();
    expect(validateProfile(rest).problems).toEqual(['rev: is missing']);
  });

  it('refuses an unknown landmark with the field path', () => {
    const p = syntheticProfile();
    const f = p.fields[1];
    if (!f?.geometry) throw new Error('fixture changed');
    (f.geometry as { to: string }).to = 'handlebar';
    const { problems } = validateProfile(p);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^fields\[1\]\.geometry\.to: must be one of bb, saddle_ref/);
  });

  it('refuses a field with both geometry and std', () => {
    const p = syntheticProfile();
    const f = p.fields[1];
    if (f) f.std = 'saddle.height';
    expect(validateProfile(p).problems).toEqual([
      'fields[1]: a field has either geometry or std, not both',
    ]);
  });

  it('requires mm on position fields with geometry', () => {
    const p = syntheticProfile();
    const f = p.fields[1];
    if (f) f.unit = 'deg';
    expect(validateProfile(p).problems).toEqual(['fields[1].unit: must be "mm"']);
  });

  it('requires the width for the width point preset', () => {
    const p = syntheticProfile();
    p.definitions.saddle_ref = { preset: 'width_point' };
    expect(validateProfile(p).problems).toEqual(['definitions.saddle_ref.width_mm: is missing']);
  });

  it('checks templates and extends against fields and bike types', () => {
    const p = syntheticProfile();
    p.fields.push({ ...p.fields[0]!, label: 'again' });
    p.bike_types.mtb = {
      extends: 'enduro',
      templates: { after: [{ key: 'grip_width', required: true }] },
    };
    expect(validateProfile(p).problems).toEqual([
      'fields: key "seat_tilt" is used more than once',
      'bike_types.mtb.extends: no bike type "enduro"',
      'bike_types.mtb.templates.after: no field "grip_width"',
    ]);
  });
});

describe('validateFit', () => {
  const good = () => migrateFitV1toV2(v1('road-before-after'), migrateOptions).fit;

  it('reports a bad status in plain words', () => {
    const fit = good();
    const s = fit.setups[0]?.values.seat_height;
    if (s) (s as { s: string }).s = 'fine';
    expect(validateFit(fit).problems).toEqual([
      'setups[0].values.seat_height.s: must be one of ok, unclear, missing',
    ]);
  });

  it('reports a set-up pointing at a bike that is not there', () => {
    const fit = good();
    fit.bikes = [];
    expect(validateFit(fit).problems).toEqual([
      'setups[0].bike: no bike "b1"',
      'setups[1].bike: no bike "b1"',
    ]);
  });

  it('reports duplicate set-up ids and unknown proposal set-ups', () => {
    const fit = good();
    fit.setups[1]!.id = 's1';
    fit.proposals = [{ setup: 's7', key: 'drop', v: 1, src: 'ai', note: '' }];
    expect(validateFit(fit).problems).toEqual([
      'setups: id "s1" is used more than once',
      'compare[1]: no set-up "s2"',
      'proposals[0].setup: no set-up "s7"',
    ]);
  });

  it('refuses a fit with no set-ups', () => {
    const fit = good();
    fit.setups = [];
    fit.compare = ['x'];
    expect(validateFit(fit).problems).toEqual(['setups: must NOT have fewer than 1 items']);
  });
});

describe('validateProfile language', () => {
  it('refuses a tag the browser cannot use', () => {
    expect(validateProfile({ ...syntheticProfile(), language: 'en-12' }).problems).toEqual([
      'language: "en-12" is not a language tag the browser knows',
    ]);
  });
});
