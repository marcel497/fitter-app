/**
 * Side-view landmarks that position fields are measured between.
 *
 * This list is part of the contract with the Sedimi site (docs/interop/README.md).
 * Adding a landmark is a compatible change. Changing what an existing id means is a
 * format change and needs a new format version and a migration.
 *
 * Coordinates: millimetres from the bottom bracket centre, x forward, y up.
 */
export const LANDMARKS = {
  bb: 'Bottom bracket: centre of the crank axle. Origin of all coordinates.',
  saddle_ref:
    "Saddle reference point: the point the fitter's profile defines (definitions.saddle_ref).",
  saddle_tip: 'Saddle tip: front end of the saddle nose, on the centre line.',
  saddle_rail_centre:
    'Rail centre: centre of the saddle rails at the seatpost clamp, on the rail line.',
  bar_centre_at_stem: 'Bar centre at the stem: centre of the bar cross-section next to the stem.',
  bar_top_at_stem: 'Bar top at the stem: top edge of the bar next to the stem.',
  bar_front_at_stem: 'Bar front at the stem: front edge of the bar next to the stem.',
  bar_point:
    "Bar point (Sedimi's definition): bar centre at the stem, plus bar reach horizontally and bar rise vertically.",
  hood_end: 'End of hood grip: top of the brake hood where the hand rests (hood apex).',
  grip_mid: 'Grip middle: middle of the flat-bar grip, on the grip axis.',
} as const;

export type Landmark = keyof typeof LANDMARKS;

export const LANDMARK_IDS = Object.keys(LANDMARKS) as Landmark[];

export const MEASURES = ['straight', 'horizontal', 'vertical'] as const;

export type Measure = (typeof MEASURES)[number];

export function isLandmark(id: string): id is Landmark {
  return Object.hasOwn(LANDMARKS, id);
}
