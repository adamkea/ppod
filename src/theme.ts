// App-wide design tokens plus the react-native-paper theme.
//
// Design language: "card-table ledger". Felt-green dark surfaces, bone text,
// and a single gold accent that doubles as the winner color, so the accent
// always means something. Space Grotesk carries display and body type; IBM
// Plex Mono is reserved for the scorekeeping voice: invite codes, dates,
// counts, and standings numbers.
//
// Shape rule: panels and inputs share one soft-rectangle scale (sm/md/lg);
// pill is reserved for chips and avatars. No mixed systems.

import { MD3DarkTheme, configureFonts, type MD3Theme } from 'react-native-paper';

export const colors = {
  bg: '#0c110e',
  surface: '#131a16',
  surfaceAlt: '#1b241e',
  border: '#27332b',
  borderStrong: '#3b4c40',
  text: '#ece9dc',
  textMuted: '#99a798',
  primary: '#d9a441',
  primaryText: '#181203',
  danger: '#e26a55',
  success: '#83b692',
  winner: '#d9a441',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
};

export const fontSize = {
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
};

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_700Bold',
};

// Static font files carry their own weight, so every variant is pinned to the
// matching file and fontWeight is normalized to '400' to stop Android and web
// from synthesizing a second layer of boldness on top.
const groteskByWeight: Record<string, string> = {
  '300': 'SpaceGrotesk_300Light',
  '400': fonts.regular,
  '500': fonts.medium,
  '600': fonts.semibold,
  '700': fonts.bold,
};

const fontConfig = Object.fromEntries(
  Object.entries(MD3DarkTheme.fonts).map(([variant, style]) => {
    const weight = String(
      (style as { fontWeight?: string }).fontWeight ?? '400',
    );
    return [
      variant,
      {
        ...style,
        fontFamily: groteskByWeight[weight] ?? fonts.regular,
        fontWeight: '400' as const,
      },
    ];
  }),
);

export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: radius.sm,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    onPrimary: colors.primaryText,
    primaryContainer: '#3d3012',
    onPrimaryContainer: '#eed9a6',
    secondary: '#b9c6b8',
    onSecondary: '#1c241e',
    secondaryContainer: '#2a382f',
    onSecondaryContainer: '#d9e4d6',
    tertiary: colors.winner,
    onTertiary: colors.primaryText,
    tertiaryContainer: '#3d3012',
    onTertiaryContainer: '#eed9a6',
    error: colors.danger,
    onError: '#ffffff',
    errorContainer: '#571f16',
    onErrorContainer: '#ffb4a4',
    background: colors.bg,
    onBackground: colors.text,
    surface: colors.surface,
    onSurface: colors.text,
    surfaceVariant: colors.surfaceAlt,
    onSurfaceVariant: colors.textMuted,
    outline: colors.borderStrong,
    outlineVariant: colors.border,
    inversePrimary: '#8a6a22',
    inverseSurface: colors.text,
    inverseOnSurface: colors.bg,
    surfaceDisabled: 'rgba(236, 233, 220, 0.12)',
    onSurfaceDisabled: 'rgba(236, 233, 220, 0.38)',
    backdrop: 'rgba(4, 7, 5, 0.65)',
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: '#161f1a',
      level3: colors.surfaceAlt,
      level4: '#1e2821',
      level5: '#222d25',
    },
  },
};
