import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LANDMARK_IDS, isLandmark } from '../../src/core/model';
import { profileSchema } from '../../src/core/schema/validate';

describe('landmarks', () => {
  it('match the landmark enum in the profile schema', () => {
    expect([...profileSchema.$defs.landmark.enum]).toEqual(LANDMARK_IDS);
  });

  it('are all listed in the interop contract', () => {
    const contract = readFileSync(
      fileURLToPath(new URL('../../docs/interop/README.md', import.meta.url)),
      'utf8',
    );
    for (const id of LANDMARK_IDS) expect(contract).toContain(`\`${id}\``);
  });

  it('knows its own ids only', () => {
    expect(isLandmark('bar_point')).toBe(true);
    expect(isLandmark('toString')).toBe(false);
  });
});
