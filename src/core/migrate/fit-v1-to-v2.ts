import { hasValue } from '../model/value';
import {
  isSource,
  isStatus,
  type Bike,
  type Fit,
  type ProfileSnapshot,
  type Scalar,
  type Setup,
  type Source,
  type Value,
} from '../model/types';

/**
 * fit.json schema 1 → format 2. Rules: docs/SPEC.md, "v1 → v2 migration rules".
 * Pure: no clock, no randomness, no I/O; those come in through `options`.
 */

type Json = Record<string, unknown>;

export interface V1Fit {
  schema: 1;
  meta?: Json;
  old?: Json;
  new?: Json;
  [key: string]: unknown;
}

export interface MigrationProfile {
  id: string;
  rev: number;
  snapshot: ProfileSnapshot;
}

export interface MigrateV1Options {
  /**
   * The profile to attach: the revision the fit date picks, snapshotted for the fit's
   * bike type (for example with `snapshotOf`).
   */
  profileFor: (rev: number, bikeType: string) => MigrationProfile;
  /** Timestamp written as `updated` (and `created` when the v1 file has no date). */
  now: string;
  /** Id of the new fit. */
  id: string;
}

export interface MigrationResult {
  fit: Fit;
  /** Things the fitter should look at, in plain words. Also written to `fit.log`. */
  warnings: string[];
}

/** Marcel's method switch: from this date drop and reach go to the bar top and front edge. */
export const MEASURE_REV2_FROM = '2026-11-02';

/** v1 source names that have a different name in v2. */
const SOURCE_RENAMES = new Map<string, Source>([['marcel', 'fitter']]);

const TILT_UP = ['up', 'nose up', 'nahoru', 'nahor', 'hore', 'hor', 'nahoře'];
const TILT_DOWN = ['down', 'nose down', 'dolů', 'dolu', 'dole', 'nadol'];
const CLEAT_AHEAD = [
  ...['ahead', 'front', 'forward'],
  ...['pred', 'před', 'vpred', 'vpredu', 'vpředu', 'dopredu', 'dopředu'],
];
const CLEAT_BEHIND = ['behind', 'back', 'za', 'vzadu', 'dozadu'];

/**
 * v1 words for choice fields → option ids used from v2 on. `strict`: every v1 value
 * of the field must be one of these words; anything else is flagged. Pedals are not
 * strict, because v1 stored product names there.
 */
const CHOICE_WORDS: Record<string, { strict: boolean; words: Map<string, string> }> = {
  cockpit_type: {
    strict: true,
    words: new Map([
      ['classic', 'classic'],
      ['klasický', 'classic'],
      ['klasicky', 'classic'],
      ['klasická', 'classic'],
      ['integrated', 'integrated'],
      ['integrovaný', 'integrated'],
      ['integrovany', 'integrated'],
      ['integrovaná', 'integrated'],
      ['non-standard', 'non_standard'],
      ['neštandardný', 'non_standard'],
      ['nestandardny', 'non_standard'],
      ['nestandardní', 'non_standard'],
      ['nestandardný', 'non_standard'],
    ]),
  },
  pedals: {
    strict: false,
    words: new Map([
      ['platform', 'platform'],
      ['platformové', 'platform'],
      ['platformove', 'platform'],
      ['platformy', 'platform'],
    ]),
  },
};

const RIGHT_WORDS = /(?<!\p{L})(right|pravá|prava|pravý|pravy|r)(?!\p{L})/iu;
const LEFT_WORDS = /(?<!\p{L})(left|levá|leva|ľavá|lava|levý|ľavý|l)(?!\p{L})/iu;
const NO_WEDGE_WORDS = [
  'none',
  'no wedges',
  'bez klínků',
  'bez klinku',
  'bez klinov',
  'bez klínov',
  '0',
];

/** v1 bike type words → bike type ids. */
const BIKE_TYPES = new Map([
  ['road', 'road'],
  ['silnice', 'road'],
  ['silniční', 'road'],
  ['cestný', 'road'],
  ['cestne', 'road'],
  ['gravel', 'gravel'],
  ['mtb', 'mtb'],
  ['horské', 'mtb'],
  ['horske', 'mtb'],
]);

const SALUTATIONS = new Map([
  ['vy', 'formal'],
  ['ty', 'informal'],
]);

/** Collects every value the migration marks for the fitter to look at. */
interface Flags {
  count: number;
}

function isObject(x: unknown): x is Json {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isScalar(x: unknown): x is Scalar {
  return x === null || ['number', 'string', 'boolean'].includes(typeof x);
}

function unwrap(x: unknown): unknown {
  return isObject(x) && 'v' in x ? x.v : x;
}

/** A v1 text (plain or inside a value object) as a non-empty string, or undefined. */
function text(x: unknown): string | undefined {
  const raw = unwrap(x);
  if (raw === null || raw === undefined) return undefined;
  const s = String(raw).trim();
  return s ? s : undefined;
}

/** `2026-11-2`, `2.11.2026`, `2026-11-02T10:02` → `2026-11-02`; undefined if not a date. */
export function normaliseDate(x: unknown): string | undefined {
  const s = text(x);
  if (!s) return undefined;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/u);
  const dmy = s.match(/^(\d{1,2})\. ?(\d{1,2})\. ?(\d{4})$/u);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : [];
  if (!y || !m || !d) return undefined;
  const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const check = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(check.getTime()) && check.toISOString().startsWith(date) ? date : undefined;
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/u;

/** A v1 word (plain or inside a value object), trimmed and lower-cased; '' if none. */
function words(x: unknown): string {
  const raw = unwrap(x);
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function addNote(value: Value, note: string): Value {
  return { ...value, note: value.note ? `${value.note}; ${note}` : note };
}

function flag(flags: Flags, value: Value, note: string): Value {
  flags.count += 1;
  return addNote({ ...value, s: 'unclear' }, note);
}

/** One v1 value `{v, s, src, note}` → v2 value. Unknown parts are kept and flagged, never dropped. */
function toValue(raw: unknown, flags: Flags): Value {
  if (!isObject(raw) || !('v' in raw)) {
    const v = isScalar(raw) ? raw : JSON.stringify(raw);
    if (v === null) return { v, s: 'missing', src: 'typed' };
    return flag(
      flags,
      { v, s: 'ok', src: 'typed' },
      'v1 held a bare value without status or source',
    );
  }
  const { v, s, src, ...rest } = raw;
  const problems: string[] = [];
  const renamed = typeof src === 'string' ? SOURCE_RENAMES.get(src) : undefined;
  const source = isSource(src) ? src : renamed;
  if (!source) problems.push(`v1 source "${String(src)}" is not known`);
  if (!isStatus(s)) problems.push(`v1 status "${String(s)}" is not known`);
  if (!isScalar(v)) problems.push('v1 value was not a plain number or text');
  const value: Value = {
    ...rest,
    v: isScalar(v) ? v : JSON.stringify(v),
    s: isStatus(s) ? s : 'unclear',
    src: source ?? 'typed',
  };
  return problems.length ? flag(flags, value, problems.join('; ')) : value;
}

function signed(value: Value, sign: 1 | -1): Value {
  // `|| 0` turns −0 into 0, so a level saddle never shows as "-0".
  return typeof value.v === 'number' ? { ...value, v: sign * Math.abs(value.v) || 0 } : value;
}

/** Saddle tilt: the direction word folds into the sign (+ nose down, − nose up). */
function foldTilt(tilt: Value, dir: string, _isAfter: boolean, flags: Flags): Value {
  if (TILT_UP.includes(dir)) return signed(tilt, -1);
  if (TILT_DOWN.includes(dir)) return signed(tilt, 1);
  return dir ? flag(flags, tilt, `direction word "${dir}" not understood`) : tilt;
}

/**
 * Cleat fore-aft (SPEC, "Cleat fore-aft"): + = first metatarsal head ahead of the
 * pedal axle. v1 after values are already signed; v1 before values take their sign
 * from the direction word.
 */
function foldCleat(cleat: Value, dir: string, isAfter: boolean, flags: Flags): Value {
  if (typeof cleat.v !== 'number') return cleat;
  const ahead = CLEAT_AHEAD.includes(dir);
  const behind = CLEAT_BEHIND.includes(dir);
  if (isAfter) {
    return cleat.v > 0 && behind ? flag(flags, cleat, `direction word said ${dir}`) : cleat;
  }
  if (ahead) return signed(cleat, 1);
  if (behind) return signed(cleat, -1);
  if (dir) return flag(flags, cleat, `direction word "${dir}" not understood`);
  return cleat.v > 0 ? flag(flags, cleat, 'no direction word in v1; kept as plus') : cleat;
}

/** v1 direction words and the value each one folds into. */
const DIRECTION_FOLDS = [
  { dir: 'seat_tilt_dir', key: 'seat_tilt', fold: foldTilt },
  { dir: 'cleat_r_dir', key: 'cleat_r', fold: foldCleat },
  { dir: 'cleat_l_dir', key: 'cleat_l', fold: foldCleat },
];

/** `"right shoe 1, left shoe 0"` / `"pravá bota 2, levá bota 1"` → two numbers. */
export function parseHeelWedges(text: string): { r: number; l: number } | undefined {
  const t = text.trim().toLowerCase();
  if (NO_WEDGE_WORDS.includes(t)) return { r: 0, l: 0 };
  let r: number | undefined;
  let l: number | undefined;
  for (const part of t.split(/[,;/]|\band\b|\ba\b/u)) {
    const n = part.match(/-?\d+(?:[.,]\d+)?/u);
    if (!n) continue;
    const num = Number(n[0].replace(',', '.'));
    if (RIGHT_WORDS.test(part) && r === undefined) r = num;
    else if (LEFT_WORDS.test(part) && l === undefined) l = num;
  }
  return r !== undefined && l !== undefined ? { r, l } : undefined;
}

function splitHeelWedges(values: Record<string, Value>, flags: Flags): void {
  const raw = values.heel_wedges;
  if (!raw) return;
  delete values.heel_wedges;
  if (raw.v === null || raw.s === 'missing') {
    const { note: _note, ...missing } = raw;
    values.heel_wedge_r = { ...missing, v: null, s: 'missing' };
    values.heel_wedge_l = { ...missing, v: null, s: 'missing' };
    return;
  }
  const text = String(raw.v);
  const parsed = parseHeelWedges(text);
  if (parsed) {
    values.heel_wedge_r = { ...raw, v: parsed.r };
    values.heel_wedge_l = { ...raw, v: parsed.l };
  } else {
    // One unreadable text, two fields: count it once.
    const note = `v1 heel_wedges: "${text}"`;
    values.heel_wedge_r = flag(flags, { ...raw, v: null }, note);
    values.heel_wedge_l = addNote({ ...raw, v: null, s: 'unclear' }, note);
  }
}

function mapChoices(values: Record<string, Value>, flags: Flags): void {
  for (const [key, { strict, words: map }] of Object.entries(CHOICE_WORDS)) {
    const value = values[key];
    if (!hasValue(value) || typeof value.v !== 'string') continue;
    const id = map.get(words(value));
    if (id) values[key] = { ...value, v: id };
    else if (strict) values[key] = flag(flags, value, `"${value.v}" is not one of the options`);
  }
}

function convertSetup(v1: Json, isAfter: boolean, platform: boolean, flags: Flags) {
  const values: Record<string, Value> = {};
  const dirs = new Map<string, unknown>();
  for (const [key, raw] of Object.entries(v1)) {
    if (key.endsWith('_dir')) dirs.set(key, raw);
    else values[key] = toValue(raw, flags);
  }

  // One meaning, one key: the after setback was stored as setback_center.
  const centre = values.setback_center;
  if (centre) {
    if (values.setback) {
      values.setback_center = flag(flags, centre, 'v1 had both setback and setback_center');
    } else {
      values.setback = centre;
      delete values.setback_center;
    }
  }

  for (const { dir, key, fold } of DIRECTION_FOLDS) {
    const value = values[key];
    // Fold only into a number; otherwise the word stays below as a flagged leftover.
    if (!value || typeof value.v !== 'number') continue;
    values[key] = fold(value, words(dirs.get(dir)), isAfter, flags);
    dirs.delete(dir);
  }
  // Direction words no rule consumes stay as text, flagged.
  for (const [key, raw] of dirs) {
    values[key] = flag(flags, toValue(raw, flags), 'direction word kept from v1');
  }

  splitHeelWedges(values, flags);
  mapChoices(values, flags);
  if (platform && !values.pedals) values.pedals = { v: 'platform', s: 'ok', src: 'default' };
  return values;
}

function convertBike(raw: unknown): Bike | undefined {
  if (!isObject(raw)) return undefined;
  const bike: Bike = { id: 'b1' };
  for (const [key, value] of Object.entries(raw)) {
    if (key !== 'id') bike[key] = unwrap(value);
  }
  if (bike.year !== undefined) {
    const year = text(bike.year);
    bike.year = year && Number.isInteger(Number(year)) ? Number(year) : null;
  }
  for (const key of ['model', 'size', 'url'] as const) {
    if (bike[key] !== undefined && bike[key] !== null) bike[key] = String(bike[key]);
  }
  return bike;
}

function drawingPages(drawing: Json): NonNullable<Fit['extra_pages']> {
  const files: string[] = [];
  if (typeof drawing.pdf === 'string' && drawing.pdf) files.push(drawing.pdf);
  const extra = Array.isArray(drawing.extra) ? drawing.extra : drawing.extra ? [drawing.extra] : [];
  for (const item of extra) {
    const file = isObject(item) ? (item.pdf ?? item.file) : item;
    if (typeof file === 'string' && file) files.push(file);
  }
  return files.map((file) => ({ file, title: 'Position drawing', after: 'shoes' }));
}

export function isV1Fit(data: unknown): data is V1Fit {
  return isObject(data) && data.schema === 1;
}

export function migrateFitV1toV2(v1: V1Fit, options: MigrateV1Options): MigrationResult {
  const {
    schema: _schema,
    meta: rawMeta,
    old: rawOld,
    new: rawNew,
    drawing: rawDrawing,
    target_report: target,
    links,
    summary,
    log: rawLog,
    ...rest
  } = v1;
  const meta = isObject(rawMeta) ? rawMeta : {};
  const old = isObject(rawOld) ? rawOld : {};
  const after = isObject(rawNew) ? rawNew : {};
  const drawing = isObject(rawDrawing) ? rawDrawing : {};
  const {
    client: metaClient,
    salutation: metaSalutation,
    gender,
    email,
    folder_name,
    date: metaDate,
    created: metaCreated,
    visit: metaVisit,
    type,
    bike_kind,
    bike: metaBike,
    no_old,
    pedals_platform,
    ...restMeta
  } = meta;

  const warnings: string[] = [];
  const flags: Flags = { count: 0 };
  const legacy: Json = {};

  const date = normaliseDate(metaDate);
  const rev = date && date < MEASURE_REV2_FROM ? 1 : 2;
  if (!date) {
    if (text(metaDate)) legacy.v1_date = metaDate;
    warnings.push(
      'The v1 file has no readable date; measuring methods of profile revision 2 were assumed.',
    );
  }

  const kindWord = words(bike_kind) || words(type);
  const bikeType = BIKE_TYPES.get(words(bike_kind)) ?? BIKE_TYPES.get(words(type)) ?? 'road';
  if (!kindWord) warnings.push('The v1 file has no bike type; road was assumed.');
  else if (!BIKE_TYPES.has(words(bike_kind)) && !BIKE_TYPES.has(words(type))) {
    warnings.push(`The v1 bike type "${kindWord}" is not known; road was assumed.`);
  }

  const client: Fit['client'] = {};
  const clientParts = { name: metaClient, gender, email, folder_name };
  for (const [key, raw] of Object.entries(clientParts)) {
    const value = text(raw);
    if (value !== undefined) client[key] = value;
  }
  const salutation = words(metaSalutation);
  if (salutation) client.salutation = SALUTATIONS.get(salutation) ?? salutation;

  const visit: Fit['visit'] = { bike_type: bikeType };
  if (date) visit.date = date;
  const visitKind = text(metaVisit);
  if (visitKind) visit.kind = visitKind;

  const bike = convertBike(metaBike);
  const bikeRef = bike ? { bike: bike.id } : {};
  const platform = unwrap(pedals_platform) === true;

  const setups: Setup[] = [];
  if (Object.keys(old).length) {
    if (unwrap(no_old) === true) {
      legacy.v1_old = old;
      warnings.push(
        'The v1 file says there was no before set-up but holds before values; they are kept under legacy.v1_old.',
      );
    } else {
      setups.push({
        id: 's1',
        template: 'before',
        label: 'Before',
        ...bikeRef,
        values: convertSetup(old, false, platform, flags),
      });
    }
  }
  setups.push({
    id: 's2',
    template: 'after',
    label: 'After',
    ...bikeRef,
    values: convertSetup(after, true, platform, flags),
  });

  const { pdf: _pdf, extra: _extra, crop: _crop, ...restDrawing } = drawing;
  if (Object.keys(restDrawing).length) legacy.v1_drawing = restDrawing;
  if (Object.keys(restMeta).length) legacy.v1_meta = restMeta;

  if (flags.count) {
    warnings.push(
      flags.count === 1
        ? '1 value needs a look; it is marked unclear with a note.'
        : `${flags.count} values need a look; they are marked unclear with a note.`,
    );
  }

  const log = Array.isArray(rawLog) ? [...(rawLog as Json[])] : [];
  log.push({
    t: options.now,
    src: 'migration',
    text: ['Migrated from fit.json schema 1 to format 2.', ...warnings].join(' '),
  });

  const created = text(metaCreated);
  if (created && !TIMESTAMP.test(created)) legacy.v1_created = metaCreated;
  const fit: Fit = {
    ...rest,
    format: 'fit',
    format_version: 2,
    id: options.id,
    created: created && TIMESTAMP.test(created) ? created : (date ?? options.now),
    updated: options.now,
    profile: options.profileFor(rev, bikeType),
    client,
    visit,
    bikes: bike ? [bike] : [],
    setups,
    compare: setups.map((s) => s.id),
    links: Array.isArray(links) ? (links as Json[]) : [],
    extra_pages: drawingPages(drawing),
    proposals: [],
    log,
  };
  if (isObject(summary)) fit.summary = summary;
  else if (summary !== undefined) legacy.v1_summary = summary;
  if (target !== undefined) fit.target = target;
  if (Object.keys(legacy).length) fit.legacy = legacy;
  return { fit, warnings };
}
