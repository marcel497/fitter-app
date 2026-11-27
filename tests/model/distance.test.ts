import { describe, expect, it } from 'vitest';
import { deriveThird } from '../../src/core/model';

describe('deriveThird', () => {
  it('derives the straight distance from horizontal and vertical', () => {
    expect(deriveThird({ horizontal: 300, vertical: -400 })?.straight).toBe(500);
  });

  it('derives the vertical part from straight and horizontal', () => {
    expect(deriveThird({ straight: 851, horizontal: 214 })?.vertical).toBeCloseTo(823.65, 2);
  });

  it('derives the horizontal part from straight and vertical', () => {
    expect(deriveThird({ straight: 500, vertical: 400 })?.horizontal).toBe(300);
  });

  it('needs exactly two parts', () => {
    expect(deriveThird({ straight: 500 })).toBeUndefined();
    expect(deriveThird({ straight: 500, horizontal: 300, vertical: 400 })).toBeUndefined();
  });

  it('refuses numbers that cannot form a right triangle', () => {
    expect(deriveThird({ straight: 200, horizontal: 300 })).toBeUndefined();
    expect(deriveThird({ straight: -5, vertical: 3 })).toBeUndefined();
  });
});
