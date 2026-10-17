import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform } from 'react-native';

export type IconName = keyof typeof Ionicons.glyphMap;
type SFSymbolName = Extract<SymbolViewProps['name'], string>;

/**
 * iOS draws SF Symbols, so glyph weight and optical size match the system; Android and web keep
 * Ionicons. Every icon the app uses is mapped explicitly; an unmapped name falls back to Ionicons.
 */
export const SF_SYMBOLS: Partial<Record<IconName, SFSymbolName>> = {
  add: 'plus',
  remove: 'minus',
  checkmark: 'checkmark',
  'checkmark-circle': 'checkmark.circle.fill',
  'close-circle': 'xmark.circle.fill',
  'ellipse-outline': 'circle',
  'arrow-forward': 'arrow.right',
  'arrow-undo': 'arrow.uturn.backward',
  'chevron-back': 'chevron.left',
  'chevron-forward': 'chevron.right',
  'chevron-down': 'chevron.down',
  'chevron-up': 'chevron.up',
  'swap-horizontal': 'arrow.left.arrow.right',
  play: 'play.fill',
  pause: 'pause.fill',
  'play-skip-forward': 'forward.end.fill',
  repeat: 'repeat',
  home: 'house.fill',
  'home-outline': 'house',
  'calendar-clear': 'calendar',
  'calendar-clear-outline': 'calendar',
  'stats-chart': 'chart.bar.fill',
  'stats-chart-outline': 'chart.bar',
  'ellipsis-horizontal': 'ellipsis',
  person: 'person.fill',
  book: 'book.fill',
  leaf: 'leaf.fill',
  'shield-checkmark-outline': 'checkmark.shield',
  'information-circle-outline': 'info.circle',
  'warning-outline': 'exclamationmark.triangle',
  'trash-outline': 'trash',
  flame: 'flame.fill',
  heart: 'heart.fill',
  'trophy-outline': 'trophy',
  barbell: 'dumbbell.fill',
  'barbell-outline': 'dumbbell',
  'body-outline': 'figure.stand',
  walk: 'figure.walk',
  'time-outline': 'clock',
  'timer-outline': 'timer',
  'hourglass-outline': 'hourglass',
};

export function Icon({ name, size, color }: { name: IconName; size: number; color: string }) {
  const ionicon = <Ionicons name={name} size={size} color={color} />;
  const symbol = Platform.OS === 'ios' ? SF_SYMBOLS[name] : undefined;
  if (!symbol) {
    return ionicon;
  }
  return <SymbolView name={symbol} size={size} tintColor={color} weight="medium" fallback={ionicon} />;
}
