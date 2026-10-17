import { Platform } from 'react-native';

/**
 * iOS uses the system chrome: a UITabBarController tab bar (NativeTabs), native navigation bars
 * with the back button and swipe-back, modal sheets, and UIKit's automatic scroll insets for the
 * status bar, navigation bar, tab bar and home indicator. Android and web keep the custom chrome,
 * which is what the web preview and the e2e tests exercise.
 */
export const SYSTEM_CHROME = Platform.OS === 'ios';
