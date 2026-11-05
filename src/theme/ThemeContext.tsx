// src/theme/ThemeContext.tsx
//
// Tema claro/oscuro. Por defecto sigue al teléfono; el usuario puede
// fijar Claro u Oscuro desde Perfil (se guarda en el dispositivo).
//
// En las pantallas:
//   const useStyles = makeStyles((colors) => ({ ... }));
//   ...
//   const styles = useStyles();
//   const { colors } = useTheme();
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { darkColors, lightColors, type ThemeColors } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

const PREF_KEY = "marcagol_theme";

interface ThemeValue {
  colors: ThemeColors;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue>({
  colors: lightColors,
  scheme: "light",
  preference: "system",
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    SecureStore.getItemAsync(PREF_KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") setPref(v);
      })
      .catch(() => {});
  }, []);

  const scheme: "light" | "dark" =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  const value = useMemo<ThemeValue>(
    () => ({
      colors: scheme === "dark" ? darkColors : lightColors,
      scheme,
      preference,
      setPreference: (p) => {
        setPref(p);
        SecureStore.setItemAsync(PREF_KEY, p).catch(() => {});
      },
    }),
    [scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Misma restricción que usa StyleSheet.create
type Styles = Parameters<typeof StyleSheet.create>[0];

/** Crea un hook de estilos que se recalcula al cambiar de tema. */
export function makeStyles<S extends Styles>(factory: (colors: ThemeColors) => S & Styles) {
  const cache = new Map<ThemeColors, Readonly<S>>();
  return function useStyles(): Readonly<S> {
    const { colors } = useTheme();
    let styles = cache.get(colors);
    if (!styles) {
      styles = StyleSheet.create(factory(colors));
      cache.set(colors, styles);
    }
    return styles;
  };
}
