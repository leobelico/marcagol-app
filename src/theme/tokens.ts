// src/theme/tokens.ts
//
// Sistema de diseño de MarcaGol Mobile, estilo app de resultados.
// - Claro: fondo gris claro, tarjetas blancas, acento azul.
// - Oscuro: azul marino de la marca, acento verde MarcaGol, ámbar en vivo.
// Las dos paletas tienen las mismas llaves; las pantallas las leen con
// useTheme() / makeStyles() (src/theme/ThemeContext.tsx).

export const lightColors = {
  // Fondos
  bg: "#EDF1F6",
  bgElevated: "#FFFFFF", // barra de pestañas, filas presionadas
  card: "#FFFFFF",
  cardBorder: "#E3E8EF",
  soft: "#F3F5F9", // chips, burbujas de minuto

  // Encabezado de navegación
  header: "#FFFFFF",
  headerText: "#1E2128",
  headerMuted: "#7A8494",

  // Acento (lo activo: pestañas, botones, selección)
  accent: "#2C55E8",
  accentSoft: "rgba(44, 85, 232, 0.10)",
  onAccent: "#FFFFFF",

  // Texto
  text: "#1E2128",
  textSecondary: "#4E5866",
  textMuted: "#7A8494",

  // Semánticos
  win: "#1DA45A",
  draw: "#A3AAB5",
  loss: "#E5383B",
  live: "#E5383B",
  winSoft: "rgba(29, 164, 90, 0.12)",
  lossSoft: "rgba(229, 56, 59, 0.12)",
  yellowCard: "#F2C230",
  overlay: "rgba(15, 20, 35, 0.45)",

  // Podio
  gold: "#D99A00",
  silver: "#8E99A8",
  bronze: "#B86A3C",
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  bg: "#0B1022",
  bgElevated: "#0E1430",
  card: "#141B33",
  cardBorder: "#1F2745",
  soft: "#1A2240",

  header: "#13306A",
  headerText: "#FFFFFF",
  headerMuted: "#A5B1D6",

  accent: "#22C55E",
  accentSoft: "rgba(34, 197, 94, 0.14)",
  onAccent: "#052012",

  text: "#EEF1FA",
  textSecondary: "#B4BCD6",
  textMuted: "#8790AE",

  win: "#22C55E",
  draw: "#66708F",
  loss: "#F05252",
  live: "#FFB020",
  winSoft: "rgba(34, 197, 94, 0.15)",
  lossSoft: "rgba(240, 82, 82, 0.15)",
  yellowCard: "#F5B942",
  overlay: "rgba(0, 0, 0, 0.6)",

  gold: "#F5B942",
  silver: "#C4CDD5",
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

// Tipografía: pesos y tamaños pensados para que los NÚMEROS
// (marcadores, puntos, goles) tengan más presencia que el texto normal.
export const typography = {
  statLarge: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
  statMedium: { fontSize: 18, fontWeight: "800" as const },
  statSmall: { fontSize: 13, fontWeight: "700" as const },
  title: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.6 },
  body: { fontSize: 14, fontWeight: "500" as const },
  bodyStrong: { fontSize: 14, fontWeight: "700" as const },
  caption: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.3 },
};
