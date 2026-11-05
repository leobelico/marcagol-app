// app/admin-equipos/[slug].tsx
import { useCallback, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { AdminTeam } from "../../src/types/api";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../src/components/AsyncState";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

export default function AdminEquiposScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();
  const [teams, setTeams] = useState<AdminTeam[] | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // useFocusEffect: al volver de crear/editar un equipo, la lista
  // se refresca sola con los datos actualizados.
  useFocusEffect(
    useCallback(() => {
      if (!token || !slug) return;
      api
        .getEquiposAdmin(token, slug)
        .then((res) => {
          setTeams(res.teams);
          setTenantId(res.tenant.id);
        })
        .catch((err) => setError(err.message ?? "No se pudo cargar"));
    }, [token, slug])
  );

  if (error) return <ErrorState message={error} />;
  if (!teams) return <LoadingState label="Cargando equipos..." />;

  return (
    <View style={styles.container}>
      {teams.length === 0 ? (
        <EmptyState message="Este torneo no tiene equipos aún. Crea el primero con el botón +." />
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable
                style={styles.cardMain}
                onPress={() =>
                  router.push(
                    `/admin-equipos/plantilla/${item.id}?teamName=${encodeURIComponent(item.name)}`
                  )
                }
              >
                {item.logo ? (
                  <Image source={{ uri: item.logo }} style={styles.logo} />
                ) : (
                  <View style={[styles.logo, styles.logoPlaceholder]}>
                    <Text style={{ fontSize: 16 }}>⚽</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.playerCount}>
                    {item.playerCount} jugador{item.playerCount !== 1 ? "es" : ""}
                    {item.allowLateRegistration ? " · Registro tardío" : ""}
                  </Text>
                  {item.disqualified ? (
                    <Text style={styles.disqualified}>DESCALIFICADO</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
              <Pressable
                hitSlop={8}
                style={styles.editButton}
                onPress={() =>
                  router.push(
                    `/admin-equipos/editar/${item.id}?name=${encodeURIComponent(item.name)}&logo=${encodeURIComponent(item.logo ?? "")}&captain=${encodeURIComponent(item.captain ?? "")}&tenantId=${tenantId ?? ""}&disqualified=${item.disqualified ? "1" : ""}&late=${item.allowLateRegistration ? "1" : ""}`
                  )
                }
              >
                <Ionicons name="pencil" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push(`/admin-equipos/nuevo?slug=${slug}`)}
      >
        <Ionicons name="add" size={26} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  cardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  editButton: { padding: spacing.lg, paddingLeft: spacing.sm },
  logo: { width: 36, height: 36, borderRadius: radius.sm },
  logoPlaceholder: {
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { ...typography.bodyStrong, fontSize: 15, color: colors.text },
  playerCount: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  disqualified: { ...typography.caption, color: colors.loss, marginTop: 2 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabPressed: { opacity: 0.85 },
}));
