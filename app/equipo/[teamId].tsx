// app/equipo/[teamId].tsx
//
// Detalle público de un equipo: stats generales, plantilla y
// últimos partidos jugados. Accesible desde la Tabla de posiciones,
// sin necesidad de login.
import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../src/api/client";
import type { TeamDetailResponse } from "../../src/types/api";
import { LoadingState, ErrorState } from "../../src/components/AsyncState";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  });
}

export default function EquipoDetalleScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const [data, setData] = useState<TeamDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    api
      .getTeamDetail(teamId)
      .then(setData)
      .catch((err) => setError(err.message ?? "No se pudo cargar"));
  }, [teamId]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Cargando equipo..." />;

  const { team, stats, players, matches } = data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        {team.logo ? (
          <Image source={{ uri: team.logo }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoPlaceholder]}>
            <Text style={{ fontSize: 24 }}>⚽</Text>
          </View>
        )}
        <Text style={styles.teamName}>{team.name}</Text>

        <View style={styles.statsRow}>
          <Stat label="G" value={stats.w} color={colors.win} />
          <Stat label="E" value={stats.d} color={colors.textSecondary} />
          <Stat label="P" value={stats.l} color={colors.loss} />
          <Stat label="GF" value={stats.gf} color={colors.text} />
          <Stat label="GC" value={stats.ga} color={colors.text} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>PLANTILLA</Text>
      <View style={styles.card}>
        {players.length === 0 ? (
          <Text style={styles.emptyText}>Sin jugadores registrados.</Text>
        ) : (
          players.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.playerRow,
                i < players.length - 1 && styles.rowDivider,
              ]}
            >
              <Text style={styles.playerNumber}>{p.number ?? "-"}</Text>
              {p.photo ? (
                <Image source={{ uri: p.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.logoPlaceholder]}>
                  <Text style={{ fontSize: 12 }}>👤</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.playerPosition}>
                  {p.position ?? "Sin posición"}
                </Text>
              </View>
              <Text style={styles.playerGoals}>{p.goals}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>PARTIDOS JUGADOS</Text>
      <View style={styles.card}>
        {matches.length === 0 ? (
          <Text style={styles.emptyText}>Sin partidos jugados aún.</Text>
        ) : (
          matches.map((m, i) => {
            const result =
              (m.teamScore ?? 0) > (m.opponentScore ?? 0)
                ? "W"
                : (m.teamScore ?? 0) < (m.opponentScore ?? 0)
                ? "L"
                : "D";
            return (
              <View
                key={m.id}
                style={[
                  styles.matchRow,
                  i < matches.length - 1 && styles.rowDivider,
                ]}
              >
                <View
                  style={[
                    styles.resultBadge,
                    result === "W" && { backgroundColor: colors.winSoft },
                    result === "L" && { backgroundColor: colors.lossSoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.resultText,
                      result === "W" && { color: colors.win },
                      result === "L" && { color: colors.loss },
                    ]}
                  >
                    {result === "W" ? "G" : result === "L" ? "P" : "E"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchOpponent} numberOfLines={1}>
                    {m.isHome ? "vs" : "@"} {m.opponent.name}
                  </Text>
                  <Text style={styles.matchDate}>{formatFecha(m.date)}</Text>
                </View>
                <Text style={styles.matchScore}>
                  {m.teamScore} - {m.opponentScore}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: "center", marginBottom: spacing.xl },
  logo: { width: 64, height: 64, borderRadius: radius.md, marginBottom: spacing.sm },
  logoPlaceholder: {
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  teamName: {
    ...typography.title,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  statsRow: { flexDirection: "row", gap: spacing.lg },
  stat: { alignItems: "center" },
  statValue: { ...typography.statMedium },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.sm + 2,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    padding: spacing.lg,
    textAlign: "center",
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  playerNumber: {
    ...typography.statSmall,
    color: colors.textMuted,
    width: 20,
    textAlign: "center",
  },
  avatar: { width: 32, height: 32, borderRadius: radius.full },
  playerName: { ...typography.bodyStrong, color: colors.text },
  playerPosition: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  playerGoals: { ...typography.statSmall, color: colors.accent },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  resultBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgElevated,
  },
  resultText: { fontSize: 11, fontWeight: "800", color: colors.textMuted },
  matchOpponent: { ...typography.bodyStrong, color: colors.text },
  matchDate: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  matchScore: { ...typography.statSmall, color: colors.text },
}));
