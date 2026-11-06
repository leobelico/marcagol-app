// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";
import { AuthProvider } from "../src/context/AuthContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <AppStack />
        </SafeAreaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerShadowVisible: scheme === "light",
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: "800" },
          headerBackTitle: "Atrás",
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="bienvenida"
          options={{ headerShown: false, presentation: "fullScreenModal", gestureEnabled: false }}
        />
        <Stack.Screen name="partido/[matchId]" options={{ title: "Partido" }} />
        <Stack.Screen
          name="organizacion/[slug]"
          options={{ title: "Torneos" }}
        />
        <Stack.Screen
          name="torneo/[slug]/(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="login"
          options={{ title: "Iniciar sesión", presentation: "modal" }}
        />
        <Stack.Screen
          name="admin/index"
          options={{ title: "Capturar resultados" }}
        />
        <Stack.Screen name="admin/[slug]" options={{ title: "Partidos" }} />
        <Stack.Screen
          name="admin/partido/[matchId]"
          options={{ title: "", presentation: "modal" }}
        />
        <Stack.Screen
          name="admin-equipos/index"
          options={{ title: "Gestionar equipos" }}
        />
        <Stack.Screen
          name="admin-equipos/[slug]"
          options={{ title: "Equipos" }}
        />
        <Stack.Screen
          name="admin-equipos/plantilla/[teamId]"
          options={{ title: "Plantilla" }}
        />
        <Stack.Screen
          name="admin-equipos/jugador/[playerId]"
          options={{ title: "Editar jugador", presentation: "modal" }}
        />
        <Stack.Screen
          name="admin-equipos/jugador/nuevo"
          options={{ title: "Nuevo jugador", presentation: "modal" }}
        />
        <Stack.Screen name="equipo/[teamId]" options={{ title: "Equipo" }} />
        <Stack.Screen
          name="jugador/[teamId]/[playerId]"
          options={{ title: "Jugador" }}
        />
        <Stack.Screen
          name="admin-equipos/nuevo"
          options={{ title: "Nuevo equipo", presentation: "modal" }}
        />
        <Stack.Screen
          name="admin-equipos/editar/[teamId]"
          options={{ title: "Editar equipo", presentation: "modal" }}
        />
        <Stack.Screen name="capitan/index" options={{ title: "Mi equipo" }} />
        <Stack.Screen
          name="capitan/jugador"
          options={{ title: "Jugador", presentation: "modal" }}
        />
        <Stack.Screen
          name="gestion/index"
          options={{ title: "Gestionar torneos" }}
        />
        <Stack.Screen
          name="gestion/nuevo"
          options={{ title: "Nuevo torneo", presentation: "modal" }}
        />
        <Stack.Screen
          name="gestion/subadmins"
          options={{ title: "Sub admins" }}
        />
        <Stack.Screen
          name="gestion/capitanes"
          options={{ title: "Capitanes" }}
        />
        <Stack.Screen name="gestion/[id]/index" options={{ title: "Torneo" }} />
        <Stack.Screen
          name="gestion/[id]/calendario"
          options={{ title: "Calendario" }}
        />
        <Stack.Screen
          name="gestion/[id]/calendario-generar"
          options={{ title: "Generar calendario", presentation: "modal" }}
        />
        <Stack.Screen
          name="gestion/[id]/partido-nuevo"
          options={{ title: "Agregar partido", presentation: "modal" }}
        />
        <Stack.Screen
          name="gestion/[id]/liguilla"
          options={{ title: "Liguilla" }}
        />
        <Stack.Screen
          name="gestion/[id]/arbitros"
          options={{ title: "Árbitros" }}
        />
        <Stack.Screen
          name="gestion/[id]/arbitro-nuevo"
          options={{ title: "Nuevo árbitro", presentation: "modal" }}
        />
        <Stack.Screen
          name="gestion/[id]/finanzas"
          options={{ title: "Finanzas" }}
        />
        <Stack.Screen
          name="gestion/[id]/movimiento-nuevo"
          options={{ title: "Nuevo movimiento", presentation: "modal" }}
        />
        <Stack.Screen
          name="gestion/[id]/landing"
          options={{ title: "Flyer / Landing" }}
        />
      </Stack>
    </>
  );
}
