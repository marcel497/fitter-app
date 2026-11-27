import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020';
import type { Fit, Profile } from '../model/types';
import fitSchema from './fit.schema.json';
import profileSchema from './profile.schema.json';

export { fitSchema, profileSchema };

export interface ValidationResult {
  ok: boolean;
  /** Plain-language problems, each starting with the field path. */
  problems: string[];
}

let validators: { profile: ValidateFunction<Profile>; fit: ValidateFunction<Fit> } | undefined;

/** Compile on first use, so starting the app does not pay for it. */
function getValidators() {
  if (!validators) {
    const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true });
    ajv.addSchema(profileSchema);
    ajv.addSchema(fitSchema);
    validators = {
      profile: ajv.getSchema(profileSchema.$id) as ValidateFunction<Profile>,
      fit: ajv.getSchema(fitSchema.$id) as ValidateFunction<Fit>,
    };
  }
  return validators;
}

/** `/setups/0/values/seat_height` → `setups[0].values.seat_height` */
function toPath(pointer: string): string {
  let path = '';
  for (const raw of pointer.split('/').slice(1)) {
    const part = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (/^\d+$/.test(part)) path += `[${part}]`;
    else path += path ? `.${part}` : part;
  }
  return path;
}

/** Keywords whose errors only repeat a more specific error found inside them. */
const WRAPPER_KEYWORDS = new Set(['if', 'allOf', 'anyOf', 'oneOf', '$ref']);

function describe(error: ErrorObject): string | undefined {
  if (WRAPPER_KEYWORDS.has(error.keyword)) return undefined;
  const p = error.params as Record<string, unknown>;
  if (error.keyword === 'required') {
    return `${toPath(`${error.instancePath}/${String(p.missingProperty)}`)}: is missing`;
  }
  const path = toPath(error.instancePath) || 'file';
  switch (error.keyword) {
    case 'enum':
      return `${path}: must be one of ${(p.allowedValues as unknown[]).map(String).join(', ')}`;
    case 'const':
      return `${path}: must be ${JSON.stringify(p.allowedValue)}`;
    case 'type':
      return `${path}: must be ${String(p.type).replace(/,/g, ' or ')}`;
    case 'pattern':
      return `${path}: has the wrong form`;
    default:
      return `${path}: ${error.message ?? 'is not valid'}`;
  }
}

function result<T>(
  validator: ValidateFunction<T>,
  data: unknown,
  checks: (d: T) => string[],
): ValidationResult {
  const problems = validator(data)
    ? checks(data)
    : [...new Set((validator.errors ?? []).map(describe).filter((m) => m !== undefined))];
  return { ok: problems.length === 0, problems };
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

function profileChecks(profile: Profile): string[] {
  const problems: string[] = [];
  const keys = new Set(profile.fields.map((f) => f.key));
  try {
    Intl.getCanonicalLocales(profile.language);
  } catch {
    problems.push(`language: "${profile.language}" is not a language tag the browser knows`);
  }
  for (const key of duplicates(profile.fields.map((f) => f.key))) {
    problems.push(`fields: key "${key}" is used more than once`);
  }
  profile.fields.forEach((f, i) => {
    if (f.geometry && f.std !== undefined) {
      problems.push(`fields[${i}]: a field has either geometry or std, not both`);
    }
  });
  for (const [type, def] of Object.entries(profile.bike_types)) {
    if (def.extends !== undefined && !Object.hasOwn(profile.bike_types, def.extends)) {
      problems.push(`bike_types.${type}.extends: no bike type "${def.extends}"`);
    }
    for (const [template, entries] of Object.entries(def.templates ?? {})) {
      for (const entry of entries) {
        if (!keys.has(entry.key)) {
          problems.push(`bike_types.${type}.templates.${template}: no field "${entry.key}"`);
        }
      }
    }
  }
  return problems;
}

function fitChecks(fit: Fit): string[] {
  const problems: string[] = [];
  const setupIds = new Set(fit.setups.map((s) => s.id));
  const bikeIds = new Set(fit.bikes.map((b) => b.id));
  for (const id of duplicates(fit.setups.map((s) => s.id))) {
    problems.push(`setups: id "${id}" is used more than once`);
  }
  for (const id of duplicates(fit.bikes.map((b) => b.id))) {
    problems.push(`bikes: id "${id}" is used more than once`);
  }
  fit.compare.forEach((id, i) => {
    if (!setupIds.has(id)) problems.push(`compare[${i}]: no set-up "${id}"`);
  });
  fit.setups.forEach((s, i) => {
    if (s.bike !== undefined && !bikeIds.has(s.bike)) {
      problems.push(`setups[${i}].bike: no bike "${s.bike}"`);
    }
  });
  (fit.proposals ?? []).forEach((p, i) => {
    if (!setupIds.has(p.setup)) problems.push(`proposals[${i}].setup: no set-up "${p.setup}"`);
  });
  return problems;
}

export function validateProfile(data: unknown): ValidationResult {
  return result(getValidators().profile, data, profileChecks);
}

export function validateFit(data: unknown): ValidationResult {
  return result(getValidators().fit, data, fitChecks);
}
