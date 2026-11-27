import { describe, expect, it } from 'vitest';
import { formatNumber } from '../../src/core/model';

const mm = { length: 'mm', angle: 'deg' } as const;
const inch = { length: 'in', angle: 'deg' } as const;

describe('formatNumber', () => {
  it('shows mm with the field decimals', () => {
    expect(formatNumber(851, { unit: 'mm', decimals: 0 }, mm, 'en-GB')).toEqual({
      text: '851',
      unit: 'mm',
    });
  });

  it('uses the decimal comma of the language', () => {
    expect(formatNumber(1.5, { unit: 'deg', decimals: 1 }, mm, 'cs-CZ')).toEqual({
      text: '1,5',
      unit: '°',
    });
  });

  it('converts lengths to inches for display only', () => {
    expect(formatNumber(254, { unit: 'mm', decimals: 0 }, inch, 'en-US')).toEqual({
      text: '10.00',
      unit: 'in',
    });
  });

  it('leaves angles in degrees when lengths are in inches', () => {
    expect(formatNumber(7, { unit: 'deg', decimals: 0 }, inch, 'en-US').text).toBe('7');
  });

  it('never groups thousands', () => {
    expect(formatNumber(1050, { unit: 'mm' }, mm, 'en-GB').text).toBe('1050');
  });
});

describe('formatNumber edge cases', () => {
  it('prints minus zero as zero', () => {
    expect(formatNumber(-0, { unit: 'deg', decimals: 1 }, mm, 'en-GB').text).toBe('0.0');
  });
});
