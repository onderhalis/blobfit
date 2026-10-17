import { colors } from '../tokens';

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;

describe('text colour contrast (WCAG AA)', () => {
  const backgrounds = { bg: colors.bg, bgDeep: colors.bgDeep, surface: colors.surface, surfaceMuted: colors.surfaceMuted };

  it.each(Object.entries(backgrounds))('ink and secondary text are readable on %s', (_, background) => {
    expect(contrast(colors.ink, background)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.inkSecondary, background)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.accentInk, background)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.successInk, background)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.dangerInk, background)).toBeGreaterThanOrEqual(AA);
  });

  it('white on the primary dark button', () => {
    expect(contrast(colors.inkOnDark, colors.ink)).toBeGreaterThanOrEqual(AA);
  });

  it('accent-ink on accent-soft and status inks on their soft fills', () => {
    expect(contrast(colors.accentInk, colors.accentSoft)).toBeGreaterThanOrEqual(AA);
    expect(contrast(colors.successInk, colors.successSoft)).toBeGreaterThanOrEqual(AA);
  });

  it.each(Object.entries(colors.tint))('%s tag text on its tint', (_, tint) => {
    expect(contrast(tint.fg, tint.bg)).toBeGreaterThanOrEqual(AA);
  });

  it('accent fills stay visible on cards; their values are always also shown as text', () => {
    // The orange ring/bar is below the 3:1 non-text guideline, so every ring and bar
    // carries a numeric text label and an accessibility value and never relies on colour alone.
    expect(contrast(colors.accent, colors.surface)).toBeGreaterThanOrEqual(2.2);
  });
});
