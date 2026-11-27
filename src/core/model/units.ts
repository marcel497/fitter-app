import type { FieldDef, Units } from './types';

export const MM_PER_INCH = 25.4;

/** Decimals shown for lengths in inches; 0.01 in is about 0.25 mm. */
const INCH_DECIMALS = 2;

export interface DisplayNumber {
  text: string;
  unit: string;
}

/**
 * Format a stored number (mm or degrees) for display in the profile's units and
 * language. Values are always stored in mm and degrees; only the display changes.
 */
export function formatNumber(
  stored: number,
  field: Pick<FieldDef, 'unit' | 'decimals'>,
  units: Units,
  language: string,
): DisplayNumber {
  let n = stored || 0; // −0 would print as "-0"
  let decimals = field.decimals ?? 0;
  let unit = field.unit === 'deg' ? '°' : (field.unit ?? '');
  if (field.unit === 'mm' && units.length === 'in') {
    n = stored / MM_PER_INCH;
    decimals = INCH_DECIMALS;
    unit = 'in';
  }
  return { text: formatter(language, decimals).format(n), unit };
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Building an Intl.NumberFormat is slow; tables call this once per cell, so reuse them. */
function formatter(language: string, decimals: number): Intl.NumberFormat {
  const key = `${language}|${decimals}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(language, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: false,
    });
    formatters.set(key, f);
  }
  return f;
}
