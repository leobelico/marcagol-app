// src/theme/tokens.ts
//
// Sistema de diseño de Tlachtli Mobile, tema «Llano» (igual que la web):
// - Claro: cal (#EEF1EA), tarjetas blancas, tinta verde, acento pasto (#1C6B37).
// - Oscuro: noche de cancha (#0C1A11), acento pasto claro (#62D68D) y
//   amarillo tarjeta (#FFD400) para «en vivo».
// Las dos paletas tienen las mismas llaves; las pantallas las leen con
// useTheme() / makeStyles() (src/theme/ThemeContext.tsx).

export const lightColors = {
  // Fondos
  bg: "#EEF1EA",
  bgElevated: "#FFFFFF", // barra de pestañas, filas presionadas
  card: "#FFFFFF",
  cardBorder: "#DFE5D9",
  soft: "#F3F6F0", // chips, burbujas de minuto

  // Encabezado de navegación
  header: "#FFFFFF",
  headerText: "#12261A",
  headerMuted: "#56645A",

  // Acento (lo activo: pestañas, botones, selección)
  accent: "#1C6B37",
  accentSoft: "rgba(28, 107, 55, 0.10)",
  onAccent: "#FFFFFF",

  // Texto
  text: "#12261A",
  textSecondary: "#4B5A50",
  textMuted: "#56645A",

  // Semánticos
  win: "#1C6B37",
  draw: "#9AA89D",
  loss: "#B3261E",
  live: "#B3261E",
  winSoft: "rgba(28, 107, 55, 0.12)",
  lossSoft: "rgba(179, 38, 30, 0.12)",
  yellowCard: "#FFD400",
  overlay: "rgba(12, 26, 17, 0.45)",

  // Podio
  gold: "#B58A00",
  silver: "#8E9A90",
  bronze: "#B86A3C",
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  bg: "#0C1A11",
  bgElevated: "#10211A",
  card: "#13251A",
  cardBorder: "#26392C",
  soft: "#1A2E21",

  header: "#163A24",
  headerText: "#FFFFFF",
  headerMuted: "#A3B4A8",

  accent: "#62D68D",
  accentSoft: "rgba(98, 214, 141, 0.14)",
  onAccent: "#0C1A11",

  text: "#EDF3EC",
  textSecondary: "#C3D1C6",
  textMuted: "#A3B4A8",

  win: "#62D68D",
  draw: "#5D6F62",
  loss: "#FF8F86",
  live: "#FFD400",
  winSoft: "rgba(98, 214, 141, 0.15)",
  lossSoft: "rgba(255, 143, 134, 0.15)",
  yellowCard: "#FFD400",
  overlay: "rgba(0, 0, 0, 0.6)",

  gold: "#FFD400",
  silver: "#C3D1C6",
  bronze: "#C97A4A",
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
  lg: 14,
  full: 999,
};

// Tipografía: Big Shoulders (condensada) para números y títulos, como
// la web; el resto con la fuente del sistema. Pesos y tamaños pensados para que los NÚMEROS
// (marcadores, puntos, goles) tengan más presencia que el texto normal.
export const typography = {
  statLarge: { fontSize: 32, fontFamily: "BigShoulders_900Black" },
  statMedium: { fontSize: 22, fontFamily: "BigShoulders_800ExtraBold" },
  statSmall: { fontSize: 13, fontWeight: "700" as const },
  title: { fontSize: 24, fontFamily: "BigShoulders_900Black", textTransform: "uppercase" as const },
  subtitle: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.6 },
  body: { fontSize: 14, fontWeight: "500" as const },
  bodyStrong: { fontSize: 14, fontWeight: "700" as const },
  caption: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.3 },
};
