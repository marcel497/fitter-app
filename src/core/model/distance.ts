/** The three ways of taking a distance between two landmarks. */
export interface DistanceParts {
  straight?: number;
  horizontal?: number;
  vertical?: number;
}

/**
 * Work out the missing one of straight, horizontal and vertical from the other two
 * (straight² = horizontal² + vertical²). Horizontal and vertical are signed; the
 * straight distance is not. Returns undefined when fewer than two are given, when
 * all three are given, or when the numbers cannot belong to one right triangle.
 * A derived horizontal or vertical part comes back non-negative: its sign is not
 * knowable from the other two, so the caller applies the field's own direction.
 */
export function deriveThird({
  straight,
  horizontal,
  vertical,
}: DistanceParts): Required<DistanceParts> | undefined {
  if (straight === undefined) {
    if (horizontal === undefined || vertical === undefined) return undefined;
    return { straight: Math.hypot(horizontal, vertical), horizontal, vertical };
  }
  if (straight < 0 || (horizontal === undefined) === (vertical === undefined)) return undefined;
  const known = horizontal ?? vertical ?? 0;
  const rest = straight * straight - known * known;
  if (rest < 0) return undefined;
  const third = Math.sqrt(rest);
  return horizontal === undefined
    ? { straight, horizontal: third, vertical: known }
    : { straight, horizontal, vertical: third };
}
