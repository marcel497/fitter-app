import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { snapshotOf, type Profile } from '../src/core/model';
import type { MigrationProfile, V1Fit } from '../src/core/migrate';

export function fixture<T = unknown>(path: string): T {
  const file = fileURLToPath(new URL(`fixtures/${path}`, import.meta.url));
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

export function syntheticProfile(): Profile {
  return fixture<Profile>('profile/synthetic-profile.json');
}

/** A resolver like the app will use: snapshot of the synthetic profile at the asked revision. */
export function profileFor(rev: number, bikeType: string): MigrationProfile {
  const p = syntheticProfile();
  const snapshot = snapshotOf(p, bikeType);
  if (!snapshot) throw new Error(`fixture has no ${bikeType} bike type`);
  return { id: p.id, rev, snapshot };
}

export const migrateOptions = {
  profileFor,
  now: '2026-11-27T12:00:00+01:00',
  id: 'fit-test-0001',
};

export function v1(name: string): V1Fit {
  return fixture<V1Fit>(`fit-v1/${name}.json`);
}
