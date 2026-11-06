// app/jugador/[teamId]/[playerId].tsx
//
// Perfil de jugador estilo SofaScore: stats acumuladas arriba,
// lista de partidos jugados abajo, cada uno con íconos de los
// eventos de ESE jugador en ESE partido (gol, tarjeta).
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../../src/api/client";
import type { TeamDetailPlayer, PlayerMatch } from "../../../src/types/api";
import { LoadingState, ErrorState } from "../../../src/components/AsyncState";
import Ionicons from "@expo/vector-icons/Ionicons";
import { abrirVideo } from "../../../src/utils/video";
import { radius, spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

interface JugadorData {
  player: TeamDetailPlayer;
  teamName: string;
  teamLogo: string | null;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  });
}

// Jugadas del jugador que tienen clip, de la más reciente a la más vieja
function clips(matches: PlayerMatch[]) {
  const nombres: Record<string, string> = {
    GOAL: "Gol",
    ASSIST: "Asistencia",
    SUBSTITUTION: "Asistencia",
    YELLOW_CARD: "Amarilla",
    RED_CARD: "Roja",
  };
  return matches.flatMap((m) => {
    const rival = m.isHome ? m.awayTeam.name : m.homeTeam.name;
    return m.events
      .filter((e) => !!e.clipUrl)
      .map((e) => ({
        matchId: m.id,
        url: e.clipUrl!,
        titulo: `${nombres[e.type] ?? "Jugada"} vs ${rival}`,
        fecha: m.date,
        minuto: e.minute,
      }));
  });
}

function EventIcons({ events }: { events: PlayerMatch["events"] }) {
  const styles = useStyles();
  if (events.length === 0) return null;
  return (
    <View style={styles.eventIconsRow}>
      {events.map((e, i) => {
        if (e.type === "GOAL") {
          return (
            <Text key={i} style={styles.eventIcon}>
              ⚽
            </Text>
          );
        }
        if (e.type === "YELLOW_CARD") {
          return <View key={i} style={styles.yellowCard} />;
        }
        if (e.type === "RED_CARD") {
          return <View key={i} style={styles.redCard} />;
        }
        return null;
      })}
    </View>
  );
}

export default function JugadorScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { teamId, playerId } = useLocalSearchParams<{
    teamId: string;
    playerId: string;
  }>();
  const [data, setData] = useState<JugadorData | null>(null);
  const [matches, setMatches] = useState<PlayerMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || !playerId) return;
    api
      .getTeamDetail(teamId)
      .then((res) => {
        const player = res.players.find((p) => p.id === playerId);
        if (!player) {
          setError("Jugador no encontrado.");
          return;
        }
        setData({
          player,
          teamName: res.team.name,
          teamLogo: res.team.logo,
        });
      })
      .catch((err) => setError(err.message ?? "No se pudo cargar"));

    api
      .getPlayerMatches(playerId)
      .then((res) => setMatches(res.matches))
      .catch(() => setMatches([]));
  }, [teamId, playerId]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Cargando jugador..." />;

  const { player, teamName, teamLogo } = data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        {player.photo ? (
          <Image source={{ uri: player.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
        )}
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.position}>
          {player.position ?? "Sin posición"}
          {player.number != null ? ` · #${player.number}` : ""}
        </Text>

        <Pressable
          style={styles.teamRow}
          onPress={() => router.push(`/equipo/${teamId}`)}
        >
          {teamLogo ? (
            <Image source={{ uri: teamLogo }} style={styles.teamLogo} />
          ) : (
            <View style={[styles.teamLogo, styles.avatarPlaceholder]}>
              <Text style={{ fontSize: 12 }}>⚽</Text>
            </View>
          )}
          <Text style={styles.teamName}>{teamName}</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Goles" value={player.goals} color={colors.accent} />
        <StatCard label="Asistencias" value={player.assists} color={colors.text} />
        <StatCard label="Amarillas" value={player.yellow} color={colors.yellowCard} />
        <StatCard label="Rojas" value={player.red} color={colors.loss} />
      </View>

      {/* MarcaGol TV: sus jugadas con clip */}
      {matches && clips(matches).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>JUGADAS EN VIDEO</Text>
          <View style={[styles.card, { marginBottom: spacing.xl }]}>
            {clips(matches).map((c, i, todos) => (
              <Pressable
                key={`${c.matchId}-${i}`}
                onPress={() => abrirVideo(c.url)}
                accessibilityLabel={`Ver clip: ${c.titulo}`}
                style={({ pressed }) => [
                  styles.clipRow,
                  i < todos.length - 1 && styles.rowDivider,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.clipPlay}>
                  <Ionicons name="play" size={14} color="#fff" style={{ marginLeft: 2 }} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.matchOpponent} numberOfLines={1}>{c.titulo}</Text>
                  <Text style={styles.matchDate}>
                    {formatFecha(c.fecha)} · minuto {c.minuto}
                  </Text>
                </View>
                <Ionicons name="logo-youtube" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>PARTIDOS</Text>
      <View style={styles.card}>
        {!matches ? (
          <Text style={styles.emptyText}>Cargando partidos...</Text>
        ) : matches.length === 0 ? (
          <Text style={styles.emptyText}>Sin partidos jugados aún.</Text>
        ) : (
          matches.map((m, i) => {
            const opponent = m.isHome ? m.awayTeam : m.homeTeam;
            return (
              <Pressable
                key={m.id}
                onPress={() => router.push(`/partido/${m.id}`)}
                style={({ pressed }) => [
                  styles.matchRow,
                  i < matches.length - 1 && styles.rowDivider,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.matchTop}>
                  <Text style={styles.matchOpponent} numberOfLines={1}>
                    {m.isHome ? "vs" : "@"} {opponent.name}
                    {m.videoUrl ? "  ▶" : ""}
                  </Text>
                  <Text style={styles.matchScore}>
                    {m.homeScore} - {m.awayScore}
                  </Text>
                </View>
                <View style={styles.matchBottom}>
                  <Text style={styles.matchDate}>{formatFecha(m.date)}</Text>
                  <EventIcons events={m.events} />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({
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
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  clipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  clipPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.live,
    alignItems: "center",
    justifyContent: "center",
  },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { alignItems: "center", marginBottom: spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    ...typography.title,
    fontSize: 22,
    color: colors.text,
    textAlign: "center",
  },
  position: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  teamLogo: { width: 20, height: 20, borderRadius: 5 },
  teamName: { ...typography.caption, color: colors.textSecondary },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    alignItems: "center",
  },
  statValue: { ...typography.statLarge },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.sm + 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    padding: spacing.lg,
    textAlign: "center",
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  matchRow: { padding: spacing.md, gap: spacing.xs + 2 },
  matchTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchOpponent: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  matchScore: { ...typography.statSmall, color: colors.text },
  matchBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchDate: { ...typography.caption, color: colors.textMuted },
  eventIconsRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  eventIcon: { fontSize: 13 },
  yellowCard: {
    width: 10,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.yellowCard,
  },
  redCard: {
    width: 10,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.loss,
  },
}));
