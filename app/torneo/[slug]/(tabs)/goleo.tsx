// app/torneo/[slug]/(tabs)/goleo.tsx
import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../../../src/api/client";
import type { GoleadorRow } from "../../../../src/types/api";
import { useTorneoSlug } from "../../../../src/context/TorneoContext";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../../src/components/AsyncState";
import { radius, spacing, typography } from "../../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../../src/theme/ThemeContext";

export default function GoleoScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const slug = useTorneoSlug();
  const [players, setPlayers] = useState<GoleadorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .getGoleadores(slug)
      .then((res) => setPlayers(res.players))
      .catch((err) => setError(err.message ?? "No se pudo cargar"));
  }, [slug]);

  if (error) return <ErrorState message={error} />;
  if (!players) return <LoadingState label="Cargando goleadores..." />;
  if (players.length === 0) {
    return <EmptyState message="Aún no hay estadísticas registradas." />;
  }

  return (
    <FlatList
      data={players}
      keyExtractor={(item) => item.id}
      style={styles.list}
      renderItem={({ item, index }) => (
        <Pressable
          style={styles.row}
          onPress={() =>
            router.push(`/jugador/${item.team.id}/${item.id}`)
          }
        >
          <View style={styles.posBadge}>
            <Text
              style={[
                styles.posText,
                index === 0 && { color: colors.gold },
              ]}
            >
              {index + 1}
            </Text>
          </View>
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
            <Text style={styles.team} numberOfLines={1}>
              {item.team.name}
            </Text>
          </View>
          <View style={styles.goalsBox}>
            <Text style={styles.goals}>{item.goals}</Text>
            <Text style={styles.goalsLabel}>GOL{item.goals !== 1 ? "ES" : ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    />
  );
}

const useStyles = makeStyles((colors) => ({
  list: { flex: 1, backgroundColor: colors.bg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  posBadge: { width: 22, alignItems: "center" },
  posText: { fontSize: 12, fontWeight: "800", color: colors.textMuted },
  avatar: { width: 38, height: 38, borderRadius: radius.full },
  avatarPlaceholder: {
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.text },
  team: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  goalsBox: { alignItems: "center", minWidth: 44 },
  goals: { ...typography.statMedium, color: colors.accent },
  goalsLabel: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
}));
