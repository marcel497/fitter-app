import { describe, expect, it } from 'vitest';
import { loadFit, migrateFitV1toV2, parseHeelWedges } from '../../src/core/migrate';
import type { Fit } from '../../src/core/model';
import { validateFit } from '../../src/core/schema/validate';
import { migrateOptions, v1 } from '../helpers';

function migrate(name: string) {
  return migrateFitV1toV2(v1(name), migrateOptions);
}
const setup = (fit: Fit, template: string) => {
  const s = fit.setups.find((x) => x.template === template);
  if (!s) throw new Error(`no ${template} set-up`);
  return s;
};

describe('v1 → v2 migration, road fit with before and after', () => {
  const { fit, warnings } = migrate('road-before-after');
  const before = setup(fit, 'before');
  const after = setup(fit, 'after');

  it('produces a valid v2 fit', () => {
    expect(validateFit(fit)).toEqual({ ok: true, problems: [] });
    expect(fit.format).toBe('fit');
    expect(fit.format_version).toBe(2);
    expect(fit.id).toBe('fit-test-0001');
    expect(fit.updated).toBe(migrateOptions.now);
    expect(fit.created).toBe('2026-11-12');
  });

  it('turns old/new into before/after set-ups on one bike and compares them', () => {
    expect(fit.setups.map((s) => [s.id, s.template, s.label, s.bike])).toEqual([
      ['s1', 'before', 'Before', 'b1'],
      ['s2', 'after', 'After', 'b1'],
    ]);
    expect(fit.compare).toEqual(['s1', 's2']);
    expect(fit.bikes).toEqual([
      {
        id: 'b1',
        model: 'Example Endurance 2x11',
        year: 2025,
        size: '56',
        url: 'https://example.com/bike',
        geometry: { stack: 580, reach: 385, hta: 72.5, sta: 73.5, bb_drop: 72 },
      },
    ]);
  });

  it('picks profile revision 2 for a fit from 2 Nov 2026 on', () => {
    expect(fit.profile.rev).toBe(2);
    expect(fit.profile.id).toBe('synthetic-studio');
  });

  it('moves client identity into client{}', () => {
    expect(fit.client).toEqual({
      name: 'Sample Rider',
      salutation: 'formal',
      gender: 'm',
      folder_name: '2026-11-12_Sample_Rider_Road',
    });
    expect(fit.visit).toEqual({ date: '2026-11-12', kind: 'first', bike_type: 'road' });
    expect(JSON.stringify(fit.legacy)).not.toContain('Sample Rider');
  });

  it('renames setback_center to setback', () => {
    expect(after.values.setback?.v).toBe(214);
    expect(after.values.setback_center).toBeUndefined();
    expect(before.values.setback?.v).toBe(205);
  });

  it('folds the saddle tilt direction into the sign', () => {
    expect(before.values.seat_tilt?.v).toBe(-2);
    expect(before.values.seat_tilt_dir).toBeUndefined();
    expect(after.values.seat_tilt?.v).toBe(1.5);
  });

  it('takes before cleat signs from the direction word', () => {
    expect(before.values.cleat_r).toMatchObject({ v: -6, s: 'ok' });
    expect(before.values.cleat_l).toMatchObject({ v: 4, s: 'ok' });
    expect(before.values.cleat_r_dir).toBeUndefined();
  });

  it('keeps after cleats as signed, flagging a contradicting direction word', () => {
    expect(after.values.cleat_r).toMatchObject({
      v: 8,
      s: 'unclear',
      note: 'direction word said behind',
    });
    expect(after.values.cleat_l).toMatchObject({ v: 8, s: 'ok' });
  });

  it('splits heel wedge text into two numbers', () => {
    expect(after.values.heel_wedges).toBeUndefined();
    expect(after.values.heel_wedge_r).toMatchObject({ v: 2, s: 'ok', src: 'transcript' });
    expect(after.values.heel_wedge_l).toMatchObject({ v: 1, s: 'ok', src: 'transcript' });
  });

  it('maps component words to option ids', () => {
    expect(before.values.cockpit_type?.v).toBe('classic');
    expect(after.values.cockpit_type?.v).toBe('classic');
    expect(after.values.pedals?.v).toBe('Shimano SPD-SL');
  });

  it('maps v1 sources to v2 sources', () => {
    expect(after.values.stem_length?.src).toBe('fitter');
    expect(after.values.bar_width?.src).toBe('photo');
  });

  it('keeps notes, statuses and timestamps', () => {
    expect(after.values.drop_hoods).toEqual({
      v: 42,
      s: 'unclear',
      src: 'dictated',
      note: '40 on the recording',
    });
    expect(after.values.seat_height?.t).toBe('10:48');
  });

  it('turns the drawing into extra pages and drops the crop', () => {
    expect(fit.extra_pages).toEqual([
      { file: 'drawing.pdf', title: 'Position drawing', after: 'shoes' },
      { file: 'drawing_2.pdf', title: 'Position drawing', after: 'shoes' },
    ]);
    expect(fit.drawing).toBeUndefined();
    expect(fit.legacy?.v1_drawing).toBeUndefined();
  });

  it('keeps links, summary, unknown sections and other meta', () => {
    expect(fit.links).toHaveLength(1);
    expect(fit.summary?.intro).toBe('Synthetic summary for tests.');
    expect(fit.transcript).toEqual({ parts: [] });
    expect(fit.db_inbox).toEqual([]);
    expect(fit.legacy?.v1_meta).toEqual({ drive: { client_folder_id: 'synthetic-folder-id' } });
    expect(fit.meta).toBeUndefined();
    expect(fit.old).toBeUndefined();
    expect(fit.new).toBeUndefined();
    expect(fit.schema).toBeUndefined();
  });

  it('logs the migration and reports values to check', () => {
    expect(warnings).toEqual(['1 value needs a look; it is marked unclear with a note.']);
    const last = fit.log?.at(-1);
    expect(last).toMatchObject({ t: migrateOptions.now, src: 'migration' });
    expect(fit.log?.[0]).toEqual({
      t: '10:21',
      src: 'dictated',
      text: 'old positions 862 205 838 118',
    });
  });

  it('does not change the v1 input', () => {
    const input = v1('road-before-after');
    const copy = structuredClone(input);
    migrateFitV1toV2(input, migrateOptions);
    expect(input).toEqual(copy);
  });
});

describe('v1 → v2 migration, gravel fit without a before set-up', () => {
  const { fit, warnings } = migrate('gravel-no-before');
  const after = setup(fit, 'after');

  it('produces a valid fit with only the after set-up', () => {
    expect(validateFit(fit).problems).toEqual([]);
    expect(fit.setups).toHaveLength(1);
    expect(fit.compare).toEqual(['s2']);
  });

  it('picks profile revision 1 before 2 Nov 2026 and the gravel bike type', () => {
    expect(fit.profile.rev).toBe(1);
    expect(fit.visit.bike_type).toBe('gravel');
    expect(fit.client.salutation).toBe('informal');
  });

  it('unwraps bike values stored as value objects', () => {
    expect(fit.bikes[0]).toEqual({ id: 'b1', model: 'Example Gravel GRX', year: null, size: 'M' });
  });

  it('records platform pedals so cleat fields hide', () => {
    expect(after.values.pedals).toEqual({ v: 'platform', s: 'ok', src: 'default' });
  });

  it('reads "no wedges" as zero on both sides', () => {
    expect(after.values.heel_wedge_r?.v).toBe(0);
    expect(after.values.heel_wedge_l?.v).toBe(0);
  });

  it('marks an unknown cockpit word unclear instead of guessing', () => {
    expect(after.values.cockpit_type).toMatchObject({ v: 'something odd', s: 'unclear' });
    expect(warnings).toContain('1 value needs a look; it is marked unclear with a note.');
  });
});

describe('v1 → v2 migration, edge cases', () => {
  const base = { schema: 1 as const, meta: { date: '2026-11-20', type: 'road' } };

  it('keeps unparseable heel wedge text in the note, counted once', () => {
    const { fit, warnings } = migrateFitV1toV2(
      { ...base, new: { heel_wedges: { v: 'one under the right', s: 'ok', src: 'dictated' } } },
      migrateOptions,
    );
    const values = fit.setups[0]?.values;
    expect(values?.heel_wedge_r).toMatchObject({
      v: null,
      s: 'unclear',
      note: 'v1 heel_wedges: "one under the right"',
    });
    expect(values?.heel_wedge_l?.s).toBe('unclear');
    expect(warnings).toContain('1 value needs a look; it is marked unclear with a note.');
  });

  it('flags an unknown source and a bare value instead of dropping them', () => {
    const { fit } = migrateFitV1toV2(
      { ...base, new: { drop: { v: 90, s: 'ok', src: 'guess' }, reach: 548 } },
      migrateOptions,
    );
    const values = fit.setups[0]?.values;
    expect(values?.drop).toMatchObject({ v: 90, s: 'unclear', src: 'typed' });
    expect(values?.reach).toMatchObject({ v: 548, s: 'unclear', src: 'typed' });
    expect(validateFit(fit).ok).toBe(true);
  });

  it('marks a before cleat without a direction word for a look', () => {
    const { fit } = migrateFitV1toV2(
      { ...base, old: { cleat_r: { v: 5, s: 'ok', src: 'dictated' } }, new: {} },
      migrateOptions,
    );
    expect(fit.setups[0]?.values.cleat_r).toMatchObject({ v: 5, s: 'unclear' });
  });

  it('assumes road and revision 2 when the v1 file says nothing, and says so', () => {
    const { fit, warnings } = migrateFitV1toV2({ schema: 1, new: {} }, migrateOptions);
    expect(fit.visit.bike_type).toBe('road');
    expect(fit.profile.rev).toBe(2);
    expect(fit.created).toBe(migrateOptions.now);
    expect(warnings).toHaveLength(2);
  });

  it('keeps before values of a no-before fit under legacy', () => {
    const { fit, warnings } = migrateFitV1toV2(
      {
        ...base,
        meta: { ...base.meta, no_old: true },
        old: { drop: { v: 1, s: 'ok', src: 'db' } },
      },
      migrateOptions,
    );
    expect(fit.setups).toHaveLength(1);
    expect(fit.legacy?.v1_old).toEqual({ drop: { v: 1, s: 'ok', src: 'db' } });
    expect(warnings[0]).toMatch(/legacy\.v1_old/);
  });
});

describe('parseHeelWedges', () => {
  it.each([
    ['right shoe 1, left shoe 0', { r: 1, l: 0 }],
    ['pravá bota 2, levá bota 1', { r: 2, l: 1 }],
    ['levá 1; pravá 3', { r: 3, l: 1 }],
    ['R 1 / L 2', { r: 1, l: 2 }],
    ['bez klínků', { r: 0, l: 0 }],
  ])('%s', (text, expected) => {
    expect(parseHeelWedges(text)).toEqual(expected);
  });

  it('returns undefined when a side is missing', () => {
    expect(parseHeelWedges('right shoe 1')).toBeUndefined();
  });
});

describe('loadFit', () => {
  it('migrates a v1 file and says so', () => {
    const r = loadFit(v1('road-before-after'), migrateOptions);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.migratedFrom).toBe(1);
  });

  it('accepts a v2 file as it is', () => {
    const { fit } = migrate('road-before-after');
    const r = loadFit(fit, migrateOptions);
    expect(r).toEqual({ kind: 'ok', fit, warnings: [] });
  });

  it('opens a newer format read-only', () => {
    const r = loadFit({ format: 'fit', format_version: 3 }, migrateOptions);
    expect(r.kind).toBe('read_only');
  });

  it('refuses something that is not a fit', () => {
    expect(loadFit({ hello: 1 }, migrateOptions)).toEqual({
      kind: 'invalid',
      problems: ['file: this is not a fit file'],
    });
    expect(loadFit(null, migrateOptions).kind).toBe('invalid');
  });

  it('reports problems in a v2 file with the field path', () => {
    const { fit } = migrate('road-before-after');
    const broken = structuredClone(fit) as unknown as Record<string, unknown> & Fit;
    broken.compare = ['s1', 's9'];
    const r = loadFit(broken, migrateOptions);
    expect(r).toEqual({ kind: 'invalid', problems: ['compare[1]: no set-up "s9"'] });
  });
});

describe('v1 → v2 migration, untidy v1 data', () => {
  const run = (v1fit: Parameters<typeof migrateFitV1toV2>[0]) => {
    const r = migrateFitV1toV2(v1fit, migrateOptions);
    return { ...r, valid: validateFit(r.fit) };
  };

  it('snapshots the profile for the fit’s own bike type', () => {
    const { fit } = migrate('gravel-no-before');
    expect(fit.profile.snapshot.bike_type.label).toBe('Gravel');
  });

  it('keeps a direction word whose value is missing or not a number, flagged', () => {
    const { fit } = run({
      schema: 1,
      meta: { date: '2026-11-20', type: 'road' },
      old: {
        seat_tilt_dir: 'nahoru',
        cleat_r: { v: '5', s: 'ok', src: 'dictated' },
        cleat_r_dir: 'za',
      },
      new: {},
    });
    const before = fit.setups[0]?.values;
    expect(before?.seat_tilt_dir).toMatchObject({ v: 'nahoru', s: 'unclear' });
    expect(before?.cleat_r_dir).toMatchObject({ v: 'za', s: 'unclear' });
  });

  it('drops empty client fields instead of failing the import', () => {
    const { fit, valid } = run({
      schema: 1,
      meta: { date: '2026-11-20', gender: null, email: '', visit: null },
    });
    expect(valid.ok).toBe(true);
    expect(fit.client).toEqual({});
    expect(fit.visit.kind).toBeUndefined();
  });

  it('maps bike type words and falls back to road with a warning', () => {
    expect(
      run({ schema: 1, meta: { date: '2026-11-20', type: 'silnice' } }).fit.visit.bike_type,
    ).toBe('road');
    const odd = run({ schema: 1, meta: { date: '2026-11-20', type: 'Road bike' } });
    expect(odd.valid.ok).toBe(true);
    expect(odd.fit.visit.bike_type).toBe('road');
    expect(odd.warnings[0]).toMatch(/"road bike" is not known/);
  });

  it('leaves a missing cockpit value missing', () => {
    const { fit, warnings } = run({
      schema: 1,
      meta: { date: '2026-11-20' },
      new: { cockpit_type: { v: '', s: 'missing', src: 'db' } },
    });
    expect(fit.setups[0]?.values.cockpit_type?.s).toBe('missing');
    expect(warnings.join(' ')).not.toMatch(/needs a look/);
  });

  it('reads a blank bike year as unknown', () => {
    expect(
      run({ schema: 1, meta: { date: '2026-11-20', bike: { year: ' ' } } }).fit.bikes[0]?.year,
    ).toBeNull();
  });

  it('never stores minus zero', () => {
    const { fit } = run({
      schema: 1,
      meta: { date: '2026-11-20' },
      old: { seat_tilt: { v: 0, s: 'ok', src: 'dictated' }, seat_tilt_dir: 'up' },
      new: {},
    });
    expect(Object.is(fit.setups[0]?.values.seat_tilt?.v, 0)).toBe(true);
  });

  it('normalises loose dates and keeps unreadable ones under legacy', () => {
    const loose = run({ schema: 1, meta: { date: '2.11.2026', created: '12.11.2026 10:00' } });
    expect(loose.valid.ok).toBe(true);
    expect(loose.fit.visit.date).toBe('2026-11-02');
    expect(loose.fit.profile.rev).toBe(2);
    expect(loose.fit.created).toBe('2026-11-02');
    expect(loose.fit.legacy?.v1_created).toBe('12.11.2026 10:00');
    const early = run({ schema: 1, meta: { date: '2026-10-5' } });
    expect(early.fit.visit.date).toBe('2026-10-05');
    expect(early.fit.profile.rev).toBe(1);
    const bad = run({ schema: 1, meta: { date: 'last tuesday' } });
    expect(bad.valid.ok).toBe(true);
    expect(bad.fit.legacy?.v1_date).toBe('last tuesday');
    expect(bad.fit.profile.rev).toBe(2);
  });
});
