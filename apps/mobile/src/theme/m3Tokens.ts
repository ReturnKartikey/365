export interface M3ColorScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  background: string;
  onBackground: string;

  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;

  outline: string;
  outlineVariant: string;

  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  isDark: boolean;
}

export interface M3ShapeScheme {
  none: number;
  extraSmall: number;
  small: number;
  medium: number;
  large: number;
  extraLarge: number;
  full: number;
}

export const M3Shapes: M3ShapeScheme = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
};

// M3 Standard Easing curves for Reanimated / animations
export const M3Motion = {
  durationShort1: 50,
  durationShort2: 100,
  durationShort3: 150,
  durationShort4: 200,
  durationMedium1: 250,
  durationMedium2: 300,
  durationMedium3: 350,
  durationMedium4: 400,
  durationLong1: 450,
  durationLong2: 500,
  // Cubic bezier easing curves
  emphasized: [0.2, 0.0, 0.0, 1.0] as const,
  emphasizedDecelerate: [0.05, 0.7, 0.1, 1.0] as const,
  emphasizedAccelerate: [0.3, 0.0, 0.8, 0.15] as const,
  standard: [0.2, 0.0, 0.0, 1.0] as const,
};

export const M3Typography = {
  displayLarge: {
    fontFamilySerif: 'Fraunces_700Bold',
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontFamilySerif: 'Fraunces_600SemiBold',
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
  },
  displaySmall: {
    fontFamilySerif: 'Fraunces_600SemiBold',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
  },
  headlineLarge: {
    fontFamilySerif: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamilySerif: 'Fraunces_500Medium',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamilySerif: 'Fraunces_500Medium',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
  },
  titleLarge: {
    fontFamilySans: 'Inter_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamilySans: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamilySans: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bodyLarge: {
    fontFamilySans: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontFamilySans: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamilySans: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  labelLarge: {
    fontFamilySans: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamilySans: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamilySans: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
};
