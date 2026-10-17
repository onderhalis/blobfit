import { type } from '@/theme/tokens';

import { fittedFontSize } from '../Hero';

describe('fittedFontSize', () => {
  it('keeps the design size when the longest word fits', () => {
    expect(fittedFontSize('Day 01', 200, 'display')).toBe(type.display.fontSize);
    expect(fittedFontSize('Session 5 is ready.', 220, 'h1')).toBe(type.h1.fontSize);
  });

  it('shrinks so the longest word fits a narrow column instead of breaking mid-word', () => {
    const size = fittedFontSize('A stronger, happier you starts Wednesday.', 160, 'h1');
    expect(size).toBeLessThan(type.h1.fontSize);
    expect(size * 0.6 * 'Wednesday.'.length).toBeLessThanOrEqual(160);
  });

  it('accounts for Dynamic Type up to the variant cap, with a readable floor', () => {
    expect(fittedFontSize('Wednesday.', 220, 'h1', 1.25)).toBeLessThan(fittedFontSize('Wednesday.', 220, 'h1', 1));
    expect(fittedFontSize('Supercalifragilistic', 100, 'h1', 2)).toBe(22);
  });
});
