// app/admin-equipos/plantilla/[teamId].tsx
//
// Plantilla de un equipo: lista de jugadores con editar/eliminar,
// y botón flotante para agregar uno nuevo.
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { AdminPlayer } from "../../../src/types/api";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../src/components/AsyncState";
import { radius, spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

export default function PlantillaScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { teamId, teamName } = useLocalSearchParams<{
    teamId: string;
    teamName?: string;
  }>();
  const { token } = useAuth();
  const [players, setPlayers] = useState<AdminPlayer[] | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token || !teamId) return;
      api
        .getJugadoresAdmin(token, teamId)
        .then((res) => {
          setPlayers(res.players);
          setTenantId(res.team.tenantId ?? null);
        })
        .catch((err) => setError(err.message ?? "No se pudo cargar"));
    }, [token, teamId])
  );

  function handleDelete(player: AdminPlayer) {
    Alert.alert(
      "Eliminar jugador",
      `¿Seguro que quieres eliminar a ${player.name}? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await api.deleteJugador(token, player.id);
              setPlayers((prev) =>
                prev ? prev.filter((p) => p.id !== player.id) : prev
              );
            } catch (err) {
              const message =
                err instanceof ApiError ? err.message : "No se pudo eliminar";
              Alert.alert("Error", message);
            }
          },
        },
      ]
    );
  }

  if (error) return <ErrorState message={error} />;
  if (!players) return <LoadingState label="Cargando plantilla..." />;

  return (
    <View style={styles.container}>
      {players.length === 0 ? (
        <EmptyState message="Este equipo no tiene jugadores registrados." />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.number}>{item.number ?? "-"}</Text>
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={{ fontSize: 13 }}>👤</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.position} numberOfLines={1}>
                  {item.position ?? "Sin posición"} · {item.goals} gol
                  {item.goals !== 1 ? "es" : ""}
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                style={styles.iconButton}
                onPress={() => {
                  const query = new URLSearchParams({
                    name: item.name,
                    number: item.number != null ? String(item.number) : "",
                    position: item.position ?? "",
                    teamId: teamId ?? "",
                    tenantId: tenantId ?? "",
                    photo: item.photo ?? "",
                    ineUrl: item.ineUrl ?? "",
                    documentoOficialUrl: item.documentoOficialUrl ?? "",
                  }).toString();
                  router.push(`/admin-equipos/jugador/${item.id}?${query}`);
                }}
              >
                <Ionicons name="pencil" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                hitSlop={8}
                style={styles.iconButton}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={18} color={colors.loss} />
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={() => {
          const query = new URLSearchParams({
            teamId: teamId ?? "",
            teamName: teamName ?? "",
          }).toString();
          router.push(`/admin-equipos/jugador/nuevo?${query}`);
        }}
      >
        <Ionicons name="add" size={26} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  number: {
    ...typography.statSmall,
    color: colors.textMuted,
    width: 22,
    textAlign: "center",
  },
  avatar: { width: 36, height: 36, borderRadius: radius.full },
  avatarPlaceholder: {
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.text },
  position: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  iconButton: { padding: spacing.xs },
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
