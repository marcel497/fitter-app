import type { BikeTypeDef, Profile, ProfileSnapshot } from './types';

/**
 * A bike type with `extends` resolved: keys the type sets itself win, the rest come
 * from the type it extends (for example gravel extends road). Cycles stop.
 */
export function resolveBikeType(profile: Profile, type: string): BikeTypeDef | undefined {
  const seen = new Set<string>();
  let resolved: BikeTypeDef | undefined;
  for (let id: string | undefined = type; id !== undefined && !seen.has(id);) {
    seen.add(id);
    const def: BikeTypeDef | undefined = Object.hasOwn(profile.bike_types, id)
      ? profile.bike_types[id]
      : undefined;
    if (!def) break;
    resolved = { ...def, ...resolved };
    id = def.extends;
  }
  if (resolved) delete resolved.extends;
  return resolved;
}

/** The part of a profile a fit carries for one bike type (fit.profile.snapshot). */
export function snapshotOf(profile: Profile, bikeType: string): ProfileSnapshot | undefined {
  const bike_type = resolveBikeType(profile, bikeType);
  if (!bike_type) return undefined;
  return {
    definitions: profile.definitions,
    fields: profile.fields,
    bike_type,
    units: profile.units,
    language: profile.language,
  };
}
