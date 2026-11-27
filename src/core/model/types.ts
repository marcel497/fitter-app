import type { Landmark, Measure } from './landmarks';

/** Status of one recorded value. An absent value counts as missing. */
export const STATUSES = ['ok', 'unclear', 'missing'] as const;
export type Status = (typeof STATUSES)[number];

/** Where a value came from, highest priority first. Ranked in `SOURCE_RANK` (source.ts). */
export const SOURCES = [
  'fitter',
  'dictated',
  'typed',
  'transcript',
  'ai',
  'photo',
  'library',
  'db',
  'default',
  'derived',
] as const;
export type Source = (typeof SOURCES)[number];

export function isStatus(x: unknown): x is Status {
  return STATUSES.includes(x as Status);
}

export function isSource(x: unknown): x is Source {
  return SOURCES.includes(x as Source);
}

export type Scalar = number | string | boolean | null;

/** One recorded value: `{v, s, src, note, t}`. Numbers are mm or degrees. */
export interface Value {
  v: Scalar;
  s: Status;
  src: Source;
  note?: string;
  t?: string;
  [extra: string]: unknown;
}

export type FieldGroup = 'position' | 'angle' | 'component' | 'shoes' | 'other';
export type FieldType = 'number' | 'text' | 'choice' | 'bool';

export interface Geometry {
  from: Landmark;
  to: Landmark;
  measure: Measure;
}

export type ShowIf =
  | { key: string; op: 'eq' | 'ne'; value: Scalar }
  | { key: string; op: 'in' | 'not_in'; value: Scalar[] }
  | { key: string; op: 'set' | 'unset' };

export interface FieldDef {
  key: string;
  label: string;
  group: FieldGroup;
  type: FieldType;
  unit?: 'mm' | 'deg' | '';
  decimals?: number;
  range?: [number, number];
  sign?: { '+': string; '-': string };
  method?: string;
  options?: { id: string; label: string }[];
  show_if?: ShowIf;
  default?: Scalar;
  geometry?: Geometry;
  std?: string;
  [extra: string]: unknown;
}

export type SaddleRefPreset = 'width_point' | 'midpoint' | 'rail_centre' | 'nose_offset' | 'custom';

export interface SaddleRefDefinition {
  preset: SaddleRefPreset;
  width_mm?: number;
  nose_offset_mm?: number;
  text?: string;
  sketch?: string;
  [extra: string]: unknown;
}

export interface Definitions {
  saddle_ref: SaddleRefDefinition;
  [extra: string]: unknown;
}

export interface TemplateEntry {
  key: string;
  required: boolean;
}

export interface BikeTypeDef {
  extends?: string;
  label?: string;
  templates?: Record<string, TemplateEntry[]>;
  key_outputs?: string[];
  illustrations?: string[];
  [extra: string]: unknown;
}

export interface Units {
  length: 'mm' | 'in';
  angle: 'deg';
}

export interface Profile {
  format: 'fitter-profile';
  format_version: 1;
  id: string;
  rev: number;
  language: string;
  units: Units;
  studio?: Record<string, unknown>;
  definitions: Definitions;
  fields: FieldDef[];
  bike_types: Record<string, BikeTypeDef>;
  dictation?: Record<string, unknown>;
  texts?: Record<string, string>;
  pages?: string[];
  [extra: string]: unknown;
}

/** The part of a profile a fit carries, so it renders the same years later. */
export interface ProfileSnapshot {
  definitions: Definitions;
  fields: FieldDef[];
  bike_type: BikeTypeDef;
  units: Units;
  language: string;
  [extra: string]: unknown;
}

export interface Bike {
  id: string;
  model?: string | null;
  year?: number | null;
  size?: string | null;
  url?: string | null;
  geometry?: Record<string, number | string | null>;
  [extra: string]: unknown;
}

export interface Setup {
  id: string;
  template: string;
  label: string;
  bike?: string;
  values: Record<string, Value>;
  [extra: string]: unknown;
}

export interface Proposal {
  setup: string;
  key: string;
  v: Scalar;
  src: Source;
  note: string;
  [extra: string]: unknown;
}

export interface Fit {
  format: 'fit';
  format_version: 2;
  id: string;
  created: string;
  updated: string;
  profile: { id: string; rev: number; snapshot: ProfileSnapshot };
  client: { name?: string; salutation?: string; [extra: string]: unknown };
  visit: { date?: string; kind?: string; bike_type: string; [extra: string]: unknown };
  bikes: Bike[];
  setups: Setup[];
  compare: string[];
  links?: Record<string, unknown>[];
  summary?: Record<string, unknown>;
  extra_pages?: { file: string; title: string; after?: string; [extra: string]: unknown }[];
  proposals?: Proposal[];
  log?: Record<string, unknown>[];
  /** Data from an older format that v2 has no field for. */
  legacy?: Record<string, unknown>;
  [extra: string]: unknown;
}
