// app/torneo/[slug]/(tabs)/index.tsx
//
// Pantalla de inicio del torneo: en vivo y próximos, últimos
// resultados, top 3 equipos y top 3 goleadores. Combina los tres endpoints
// ya existentes (standings, goleadores, calendario) sin pedir
// nada nuevo al backend.
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Pressable } from "react-native";
import { api } from "../../../../src/api/client";
import type {
  StandingRow,
  GoleadorRow,
  Match,
} from "../../../../src/types/api";
import { useTorneoSlug } from "../../../../src/context/TorneoContext";
import { LoadingState, ErrorState } from "../../../../src/components/AsyncState";
import { MatchRow, TeamCrest } from "../../../../src/components/match";
import { radius, spacing, typography } from "../../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../../src/theme/ThemeContext";

interface HomeData {
  tenantName: string;
  topTeams: StandingRow[];
  topScorers: GoleadorRow[];
  recentMatches: Match[];
  upcoming: Match[];
}

function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  });
}

export default function InicioScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const slug = useTorneoSlug();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.getStandings(slug),
      api.getGoleadores(slug),
      api.getCalendario(slug),
    ])
      .then(([standingsRes, goleadoresRes, calendarioRes]) => {
        const finished = calendarioRes.matches
          .filter((m) => m.status === "FINISHED")
          .slice(-5)
          .reverse();

        const live = calendarioRes.matches.filter((m) => m.status === "LIVE");
        const next = calendarioRes.matches
          .filter((m) => m.status === "SCHEDULED")
          .slice(0, Math.max(0, 4 - live.length));

        setData({
          tenantName: standingsRes.tenant.name,
          topTeams: standingsRes.standings.slice(0, 3),
          topScorers: goleadoresRes.players.slice(0, 3),
          recentMatches: finished,
          upcoming: [...live, ...next],
        });
      })
      .catch((err) => setError(err.message ?? "No se pudo cargar"));
  }, [slug]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Cargando resumen..." />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* En vivo y próximos */}
      {data.upcoming.length > 0 && (
        <Section title="En vivo y próximos" onPress={() => router.push("../calendario")}>
          <View style={styles.card}>
            {data.upcoming.map((m, i) => (
              <View key={m.id} style={i > 0 && styles.rowDividerTop}>
                <MatchRow
                  date={m.date}
                  status={m.status}
                  homeTeam={m.homeTeam}
                  awayTeam={m.awayTeam}
                  homeScore={m.homeScore}
                  awayScore={m.awayScore}
                  onPress={() => router.push(`/partido/${m.id}`)}
                  detail={`${formatFechaCorta(m.date)}${m.cancha ? ` · Cancha ${m.cancha}` : ""}`}
                />
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Últimos resultados */}
      <Section title="Últimos resultados" onPress={() => router.push("../calendario")}>
        {data.recentMatches.length === 0 ? (
          <EmptyCard text="Aún no hay partidos finalizados." />
        ) : (
          <View style={styles.card}>
            {data.recentMatches.map((m, i) => (
              <View key={m.id} style={i > 0 && styles.rowDividerTop}>
                <MatchRow
                  date={m.date}
                  status={m.status}
                  homeTeam={m.homeTeam}
                  awayTeam={m.awayTeam}
                  homeScore={m.homeScore}
                  awayScore={m.awayScore}
                  onPress={() => router.push(`/partido/${m.id}`)}
                  detail={formatFechaCorta(m.date)}
                />
              </View>
            ))}
          </View>
        )}
      </Section>

      {/* Top 3 equipos */}
      <Section title="Top equipos" onPress={() => router.push("../tabla")}>
        {data.topTeams.length === 0 ? (
          <EmptyCard text="Aún no hay equipos con partidos jugados." />
        ) : (
          <View style={styles.card}>
            {data.topTeams.map((s, i) => (
              <View
                key={s.team.id}
                style={[
                  styles.podiumRow,
                  i < data.topTeams.length - 1 && styles.rowDivider,
                ]}
              >
                <View
                  style={[
                    styles.posBadge,
                    i === 0 && { backgroundColor: colors.gold },
                    i === 1 && { backgroundColor: colors.silver },
                    i === 2 && { backgroundColor: colors.bronze },
                  ]}
                >
                  <Text style={styles.posText}>
                    {i + 1}
                  </Text>
                </View>
                <TeamCrest name={s.team.name} logo={s.team.logo} size={26} />
                <Text style={styles.podiumName} numberOfLines={1}>
                  {s.team.name}
                </Text>
                <Text style={styles.podiumPts}>{s.pts} PTS</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      {/* Top 3 goleadores */}
      <Section title="Top goleadores" onPress={() => router.push("../goleo")}>
        {data.topScorers.length === 0 ? (
          <EmptyCard text="Aún no hay goles registrados." />
        ) : (
          <View style={styles.card}>
            {data.topScorers.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.podiumRow,
                  i < data.topScorers.length - 1 && styles.rowDivider,
                ]}
              >
                <View
                  style={[
                    styles.posBadge,
                    i === 0 && { backgroundColor: colors.gold },
                    i === 1 && { backgroundColor: colors.silver },
                    i === 2 && { backgroundColor: colors.bronze },
                  ]}
                >
                  <Text style={styles.posText}>
                    {i + 1}
                  </Text>
                </View>
                {p.photo ? (
                  <Image source={{ uri: p.photo }} style={styles.playerAvatar} />
                ) : (
                  <View style={[styles.playerAvatar, styles.logoPlaceholder]}>
                    <Text style={{ fontSize: 12 }}>👤</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.podiumSubtext} numberOfLines={1}>
                    {p.team.name}
                  </Text>
                </View>
                <Text style={styles.podiumGoals}>{p.goals}</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

    </ScrollView>
  );
}

function Section({
  title,
  onPress,
  children,
}: {
  title: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
        <Pressable onPress={onPress} hitSlop={8}>
          <Text style={styles.sectionLink}>Ver todo</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.card, styles.emptyCard]}>
      <Text style={styles.emptyCardText}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
  },
  sectionTitle: { ...typography.subtitle, color: colors.textSecondary },
  sectionLink: { ...typography.caption, color: colors.accent },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  emptyCard: { padding: spacing.lg, alignItems: "center" },
  emptyCardText: { ...typography.body, color: colors.textMuted },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  rowDividerTop: { borderTopWidth: 1, borderTopColor: colors.cardBorder },

  podiumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  posBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.draw,
    alignItems: "center",
    justifyContent: "center",
  },
  posText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },
  teamLogo: { width: 26, height: 26, borderRadius: 6 },
  playerAvatar: { width: 32, height: 32, borderRadius: radius.full },
  logoPlaceholder: {
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumName: { flex: 1, ...typography.bodyStrong, color: colors.text },
  podiumSubtext: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  podiumPts: { ...typography.statSmall, color: colors.text },
  podiumGoals: { ...typography.statMedium, color: colors.accent },

  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  matchDate: {
    ...typography.caption,
    color: colors.textMuted,
    width: 42,
  },
  matchTeam: { flex: 1, ...typography.body, color: colors.textSecondary },
  matchTeamRight: { textAlign: "right" },
  matchScore: {
    ...typography.statSmall,
    color: colors.text,
    minWidth: 40,
    textAlign: "center",
  },
}));
