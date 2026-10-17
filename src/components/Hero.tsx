import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space, type } from '@/theme/tokens';

import { AppText } from './AppText';
import { ART, type ArtName } from './art';
import { Illustration } from './Illustration';
import { useLayout } from './Screen';

/** Average advance of an Inter ExtraBold glyph at our tight tracking, in em. Measured on the web build. */
const GLYPH_EM = 0.6;
const MAX_SCALE = { display: 1.2, h1: 1.25 } as const;

/**
 * Largest font size (up to the variant's own) at which the longest word of `text` fits `width`,
 * so headings wrap between words instead of breaking mid-word on small phones. Accounts for the
 * Dynamic Type scale the text will actually be rendered at.
 */
export function fittedFontSize(text: string, width: number, variant: 'display' | 'h1', fontScale = 1) {
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length));
  const rendered = Math.min(fontScale, MAX_SCALE[variant]);
  const fits = width / (longest * GLYPH_EM) / Math.max(rendered, 1);
  return Math.max(22, Math.min(type[variant].fontSize, Math.floor(fits)));
}

interface HeroProps {
  art: ArtName;
  /** Art height on a 393pt-wide phone; it scales down on narrower screens. */
  artHeight: number;
  /** Drawn over the art (e.g. motion marks), positioned by the caller. */
  artOverlay?: ReactNode;
  headline: string;
  headlineVariant?: 'display' | 'h1';
  headlineLabel?: string;
  /** Above and below the headline. */
  before?: ReactNode;
  after?: ReactNode;
  /** Pinned under the text; may extend under the art (e.g. the primary CTA). */
  footer?: ReactNode;
  gap?: number;
}

/** Text on the left, Blob on the right. Never overlaps text, at any width or text size. */
export function Hero({ art, artHeight, artOverlay, headline, headlineVariant = 'h1', headlineLabel, before, after, footer, gap = space.xs }: HeroProps) {
  const { content, fontScale, narrow } = useLayout();
  const [footerHeight, setFooterHeight] = useState(0);
  const asset = ART[art];
  // The art bleeds into the right gutter; the text keeps at least 56% (62% on 320pt phones).
  const maxArtWidth = content * (narrow ? 0.38 : 0.44) + space.lg;
  const scaled = artHeight * Math.min(1, Math.max(0.7, content / 353));
  const artWidth = Math.min((scaled * asset.width) / asset.height, maxArtWidth);
  const height = (artWidth * asset.height) / asset.width;
  const textWidth = content - artWidth + space.lg;
  const size = fittedFontSize(headline, textWidth, headlineVariant, fontScale);
  const lineHeight = Math.round(size * (type[headlineVariant].lineHeight / type[headlineVariant].fontSize));

  return (
    <View style={styles.hero}>
      <View style={[styles.text, { gap }, footer ? { paddingBottom: footerHeight + space.lg } : null]}>
        {before}
        <AppText variant={headlineVariant} accessibilityLabel={headlineLabel} style={{ fontSize: size, lineHeight }}>
          {headline}
        </AppText>
        {after}
      </View>
      <View style={[styles.art, { width: artWidth, height }]} pointerEvents="none">
        <Illustration name={art} height={height} width={artWidth} />
        {artOverlay}
      </View>
      {footer ? (
        <View style={styles.footer} onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row' },
  text: { flex: 1, justifyContent: 'center', zIndex: 1 },
  art: { marginRight: -space.lg },
  footer: { position: 'absolute', left: 0, bottom: 0, zIndex: 2 },
});
