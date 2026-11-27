import type { Fit } from '../model/types';
import { validateFit } from '../schema/validate';
import { isV1Fit, migrateFitV1toV2, type MigrateV1Options } from './fit-v1-to-v2';

export * from './fit-v1-to-v2';

/** The newest fit format this app writes. */
export const FIT_FORMAT_VERSION = 2;

export type LoadFitResult =
  /** A current fit, possibly just migrated. Save the original beside it before writing. */
  | { kind: 'ok'; fit: Fit; migratedFrom?: number; warnings: string[] }
  /** Made by a newer app version: show it, but never write it. */
  | { kind: 'read_only'; data: Record<string, unknown>; message: string }
  /** Not a fit, or a fit with problems the fitter has to fix first. */
  | { kind: 'invalid'; problems: string[] };

/**
 * Turn the parsed contents of a fit.json into a fit the app can work with:
 * migrate older formats, refuse to write newer ones, validate everything.
 */
export function loadFit(data: unknown, migrateOptions: MigrateV1Options): LoadFitResult {
  if (isV1Fit(data)) {
    const { fit, warnings } = migrateFitV1toV2(data, migrateOptions);
    const check = validateFit(fit);
    if (!check.ok) return { kind: 'invalid', problems: check.problems };
    return { kind: 'ok', fit, migratedFrom: 1, warnings };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { kind: 'invalid', problems: ['file: this is not a fit file'] };
  }
  const { format, format_version: version } = data as Record<string, unknown>;
  if (format !== 'fit') return { kind: 'invalid', problems: ['file: this is not a fit file'] };
  if (typeof version === 'number' && version > FIT_FORMAT_VERSION) {
    return {
      kind: 'read_only',
      data: data as Record<string, unknown>,
      message: `This fit was saved by a newer version of Sedimi Fitter (format ${version}). Update the app to edit it.`,
    };
  }
  const check = validateFit(data);
  if (!check.ok) return { kind: 'invalid', problems: check.problems };
  return { kind: 'ok', fit: data as Fit, warnings: [] };
}
