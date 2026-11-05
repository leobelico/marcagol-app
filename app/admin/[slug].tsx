// app/admin/[slug].tsx
//
// Lista de partidos de un torneo para que el admin capture resultados.
// Tocar un partido abre el modal de captura (app/admin/partido/[matchId]).
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { AdminMatch } from "../../src/types/api";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../src/components/AsyncState";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  });
}

export default function AdminPartidosScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();
  const [matches, setMatches] = useState<AdminMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // useFocusEffect en vez de useEffect: así al volver del modal de
  // captura (tras guardar un resultado), la lista se refresca sola.
  useFocusEffect(
    useCallback(() => {
      if (!token || !slug) return;
      api
        .getPartidosAdmin(token, slug)
        .then((res) => setMatches(res.matches))
        .catch((err) => setError(err.message ?? "No se pudo cargar"));
    }, [token, slug])
  );

  if (error) return <ErrorState message={error} />;
  if (!matches) return <LoadingState label="Cargando partidos..." />;
  if (matches.length === 0) {
    return <EmptyState message="Este torneo no tiene partidos aún." />;
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const captured = item.status === "FINISHED";
        return (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => {
              const query = new URLSearchParams({
                homeTeam: item.homeTeam.name,
                awayTeam: item.awayTeam.name,
                homeScore: String(item.homeScore ?? 0),
                awayScore: String(item.awayScore ?? 0),
              }).toString();
              router.push(`/admin/partido/${item.id}?${query}`);
            }}
          >
            <View style={styles.cardTop}>
              <Text style={styles.date}>{formatFecha(item.date)}</Text>
              <View
                style={[
                  styles.statusBadge,
                  captured && styles.statusBadgeDone,
                ]}
              >
                <Ionicons
                  name={captured ? "checkmark-circle" : "time-outline"}
                  size={13}
                  color={captured ? colors.accent : colors.textMuted}
                />
                <Text
                  style={[
                    styles.statusText,
                    captured && { color: colors.accent },
                  ]}
                >
                  {captured ? "Capturado" : "Pendiente"}
                </Text>
              </View>
            </View>
            <View style={styles.teamsRow}>
              <Text style={styles.teamName} numberOfLines={1}>
                {item.homeTeam.name}
              </Text>
              <Text style={styles.score}>
                {captured ? `${item.homeScore} - ${item.awayScore}` : "vs"}
              </Text>
              <Text
                style={[styles.teamName, styles.teamNameRight]}
                numberOfLines={1}
              >
                {item.awayTeam.name}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const useStyles = makeStyles((colors) => ({
  list: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  cardPressed: { opacity: 0.7 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
  },
  date: { ...typography.caption, color: colors.textMuted },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  statusBadgeDone: { backgroundColor: colors.accentSoft },
  statusText: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  teamsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  teamName: { flex: 1, ...typography.bodyStrong, color: colors.text },
  teamNameRight: { textAlign: "right" },
  score: { ...typography.statSmall, color: colors.text, minWidth: 50, textAlign: "center" },
}));
