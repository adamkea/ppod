// App-wide design tokens plus the Material Design 3 (react-native-paper) theme.
// The raw tokens are kept for layout (spacing/radius/font sizes) and for the
// few brand colors that have no MD3 slot (winner gold, success green).

import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';

export const colors = {
  bg: '#0f1115',
  surface: '#181b22',
  surfaceAlt: '#21252e',
  border: '#2c313c',
  text: '#f2f4f8',
  textMuted: '#9aa3b2',
  primary: '#7c5cff',
  primaryText: '#ffffff',
  danger: '#ff5c5c',
  success: '#41d18b',
  winner: '#f5c542',
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
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const fontSize = {
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
};

export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    onPrimary: colors.primaryText,
    primaryContainer: '#3b2d7a',
    onPrimaryContainer: '#e3dbff',
    secondary: '#c3bfd9',
    onSecondary: '#1c1a2e',
    secondaryContainer: '#332a5e',
    onSecondaryContainer: '#d8ccff',
    tertiary: colors.winner,
    onTertiary: '#241a00',
    tertiaryContainer: '#4a3c00',
    onTertiaryContainer: '#ffe08f',
    error: colors.danger,
    onError: '#ffffff',
    errorContainer: '#5c1a1e',
    onErrorContainer: '#ffb4ab',
    background: colors.bg,
    onBackground: colors.text,
    surface: colors.surface,
    onSurface: colors.text,
    surfaceVariant: colors.surfaceAlt,
    onSurfaceVariant: colors.textMuted,
    outline: '#3a4150',
    outlineVariant: colors.border,
    inversePrimary: '#5b3fd0',
    inverseSurface: colors.text,
    inverseOnSurface: colors.bg,
    surfaceDisabled: 'rgba(242, 244, 248, 0.12)',
    onSurfaceDisabled: 'rgba(242, 244, 248, 0.38)',
    backdrop: 'rgba(0, 0, 0, 0.6)',
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: '#1c2029',
      level3: colors.surfaceAlt,
      level4: '#242935',
      level5: '#282d3a',
    },
  },
};
