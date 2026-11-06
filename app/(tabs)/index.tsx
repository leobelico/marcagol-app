// app/(tabs)/index.tsx
//
// Pantalla de inicio. Arriba, "Mi equipo" (el equipo que el aficionado
// eligió en la bienvenida) o una invitación a elegirlo. Abajo, las ligas
// como tarjetas grandes que se pasan deslizando.
// La primera vez que se abre la app, manda a la bienvenida (/bienvenida).
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/api/client";
import type { Organization } from "../../src/types/api";
import { LoadingState, ErrorState } from "../../src/components/AsyncState";
import {
  LigasDeck,
  MiEquipoCard,
  MiJugadorCard,
  ProximamenteTV,
  SigueATuEquipo,
} from "../../src/components/inicio";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";
import {
  bienvenidaVista,
  borrarMiEquipo,
  leerMiEquipo,
  type MiEquipo,
} from "../../src/utils/miEquipo";

export default function InicioScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [ligas, setLigas] = useState<Organization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [miEquipo, setMiEquipo] = useState<MiEquipo | null | undefined>(undefined);
  const [refrescando, setRefrescando] = useState(false);
  const [vuelta, setVuelta] = useState(0); // fuerza recarga de "Mi equipo"
  const jugador = miEquipo?.rol === "jugador" ? miEquipo.jugador ?? null : null;

  const cargarLigas = useCallback(() => {
    setError(null);
    return api
      .getOrganizations()
      .then((res) => setLigas(res.organizations))
      .catch((err) => setError(err.message ?? "No se pudo cargar"));
  }, []);

  useEffect(() => {
    cargarLigas();
    bienvenidaVista().then((vista) => {
      if (!vista) router.push("/bienvenida");
    });
  }, [cargarLigas]);

  // Al volver de la bienvenida (o de "Cambiar"), releer el equipo
  useFocusEffect(
    useCallback(() => {
      leerMiEquipo().then(setMiEquipo);
    }, [])
  );

  // Por si se equivocó al elegir: cambiar o dejar de seguir
  function opcionesMiEquipo() {
    if (!miEquipo) return;
    const quien = jugador ? `${jugador.name} · ${miEquipo.teamName}` : miEquipo.teamName;
    Alert.alert(quien, `${miEquipo.tenantName}\n¿Qué quieres hacer?`, [
      {
        text: jugador ? "Cambiar jugador o equipo" : "Cambiar de equipo",
        onPress: () => router.push("/bienvenida"),
      },
      {
        text: jugador ? "Ya no soy este jugador" : "Dejar de seguir",
        style: "destructive",
        onPress: async () => {
          await borrarMiEquipo();
          setMiEquipo(null);
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function refrescar() {
    setRefrescando(true);
    setVuelta((v) => v + 1);
    await cargarLigas();
    setRefrescando(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.accent} />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Ionicons name="football" size={20} color={colors.accent} />
          </View>
          <Text style={styles.eyebrow}>MARCAGOL</Text>
          {miEquipo && (
            <Pressable
              onPress={opcionesMiEquipo}
              hitSlop={8}
              accessibilityLabel="Cambiar o dejar de seguir mi equipo"
              style={({ pressed }) => [styles.miBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons
                name={jugador ? "person-circle-outline" : "shield-outline"}
                size={16}
                color={colors.headerText}
              />
              <Text style={styles.miBtnTexto} numberOfLines={1}>
                {jugador ? "Mi perfil" : "Mi equipo"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.headerText} />
            </Pressable>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {jugador
            ? `¡Hola, ${jugador.name.trim().split(/\s+/)[0]}!`
            : miEquipo
            ? `¡Vamos ${miEquipo.teamName}!`
            : "¿A qué liga vas hoy?"}
        </Text>
      </View>

      <View style={styles.seccion}>
        {miEquipo === undefined ? null : miEquipo ? (
          <>
            {jugador && (
              <MiJugadorCard key={`${jugador.id}-${vuelta}`} equipo={miEquipo} />
            )}
            {jugador && <Text style={styles.subLabel}>TU EQUIPO</Text>}
            <MiEquipoCard key={`${miEquipo.teamId}-${vuelta}`} equipo={miEquipo} />
          </>
        ) : (
          <SigueATuEquipo />
        )}
      </View>

      <Text style={styles.label}>LIGAS</Text>
      {error && <ErrorState message={error} />}
      {!error && !ligas && <LoadingState label="Cargando ligas..." />}
      {!error && ligas && ligas.length > 0 && <LigasDeck ligas={ligas} miEquipo={miEquipo} />}
      {!error && ligas && ligas.length > 1 && (
        <Text style={styles.ayuda}>Desliza para ver más ligas</Text>
      )}

      <View style={[styles.seccion, { paddingTop: spacing.xl }]}>
        <ProximamenteTV />
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.header,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    ...typography.subtitle,
    color: colors.accent,
    letterSpacing: 1.2,
  },
  miBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.headerMuted,
  },
  miBtnTexto: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.headerText,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    color: colors.headerText,
  },
  seccion: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  label: {
    ...typography.subtitle,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  subLabel: {
    ...typography.subtitle,
    color: colors.textMuted,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  ayuda: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
}));
