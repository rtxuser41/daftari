export const themeColors: {
  primary: { light: string; dark: string };
  background: { light: string; dark: string };
  surface: { light: string; dark: string };
  foreground: { light: string; dark: string };
  muted: { light: string; dark: string };
  border: { light: string; dark: string };
  success: { light: string; dark: string };
  warning: { light: string; dark: string };
  error: { light: string; dark: string };
  successSurface: { light: string; dark: string };
  warningSurface: { light: string; dark: string };
  errorSurface: { light: string; dark: string };
  infoSurface: { light: string; dark: string };
  accentSurface: { light: string; dark: string };
  hero: { light: string; dark: string };
  heroForeground: { light: string; dark: string };
  heroMuted: { light: string; dark: string };
  heroPositive: { light: string; dark: string };
  heroNegative: { light: string; dark: string };
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
