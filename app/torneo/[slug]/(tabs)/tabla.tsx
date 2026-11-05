// app/torneo/[slug]/(tabs)/tabla.tsx
//
// Tabla general con escudos, zona de liguilla y racha de los últimos
// cinco partidos (calculada con el calendario).
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "../../../../src/api/client";
import type { Match, StandingRow } from "../../../../src/types/api";
import { useTorneoSlug } from "../../../../src/context/TorneoContext";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../../src/components/AsyncState";
import { FormDots, TeamCrest, type Resultado } from "../../../../src/components/match";
import { radius, spacing, typography } from "../../../../src/theme/tokens";
import { makeStyles } from "../../../../src/theme/ThemeContext";

// Lugares que se marcan como zona de liguilla
const ZONA_LIGUILLA = 4;

function rachas(matches: Match[]) {
  const porEquipo: Record<string, Resultado[]> = {};
  const jugados = matches
    .filter((m) => m.status === "FINISHED" && m.homeScore != null && m.awayScore != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const m of jugados) {
    const hs = m.homeScore!;
    const as = m.awayScore!;
    const local: Resultado = hs > as ? "G" : hs === as ? "E" : "P";
    const visita: Resultado = as > hs ? "G" : hs === as ? "E" : "P";
    (porEquipo[m.homeTeam.id] ??= []).push(local);
    (porEquipo[m.awayTeam.id] ??= []).push(visita);
  }
  for (const k of Object.keys(porEquipo)) porEquipo[k] = porEquipo[k].slice(-5);
  return porEquipo;
}

export default function TablaScreen() {
  const styles = useStyles();
  const slug = useTorneoSlug();
  const [standings, setStandings] = useState<StandingRow[] | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .getStandings(slug)
      .then((res) => setStandings(res.standings))
      .catch((err) => setError(err.message ?? "No se pudo cargar"));
    // La racha es un extra: si falla, la tabla se muestra igual
    api
      .getCalendario(slug)
      .then((res) => setMatches(res.matches))
      .catch(() => {});
  }, [slug]);

  const forma = useMemo(() => rachas(matches), [matches]);

  if (error) return <ErrorState message={error} />;
  if (!standings) return <LoadingState label="Cargando tabla..." />;
  if (standings.length === 0) {
    return <EmptyState message="Aún no hay equipos registrados en este torneo." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.posCol]}>#</Text>
          <Text style={[styles.headerCell, styles.teamCol, styles.left]}>Equipo</Text>
          <Text style={[styles.headerCell, styles.numCol]}>PJ</Text>
          <Text style={[styles.headerCell, styles.numCol]}>DIF</Text>
          <Text style={[styles.headerCell, styles.numCol]}>PTS</Text>
          <Text style={[styles.headerCell, styles.formCol]}>Últimos 5</Text>
        </View>
        {standings.map((item, index) => (
          <Pressable
            key={item.team.id}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => router.push(`/equipo/${item.team.id}`)}
          >
            <View style={styles.posCol}>
              <View style={[styles.posBadge, index < ZONA_LIGUILLA && styles.posZona]}>
                <Text style={[styles.posText, index < ZONA_LIGUILLA && styles.posTextZona]}>
                  {index + 1}
                </Text>
              </View>
            </View>
            <View style={[styles.teamCol, styles.teamRow]}>
              <TeamCrest name={item.team.name} logo={item.team.logo} size={20} />
              <Text style={styles.teamText} numberOfLines={1}>
                {item.team.name}
              </Text>
            </View>
            <Text style={[styles.cell, styles.numCol]}>{item.pj}</Text>
            <Text style={[styles.cell, styles.numCol]}>
              {item.dif > 0 ? `+${item.dif}` : item.dif}
            </Text>
            <Text style={[styles.cell, styles.numCol, styles.pts]}>{item.pts}</Text>
            <View style={styles.formCol}>
              <FormDots results={forma[item.team.id] ?? []} />
            </View>
          </Pressable>
        ))}
        <View style={styles.legend}>
          <View style={[styles.legendBox, styles.posZona]} />
          <Text style={styles.legendText}>Zona de liguilla</Text>
          <Text style={styles.legendText}>· G gana · E empata · P pierde</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerCell: { fontSize: 10.5, fontWeight: "600", color: colors.textMuted, textAlign: "center" },
  left: { textAlign: "left" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pressed: { backgroundColor: colors.soft },
  posCol: { width: 28, alignItems: "center" },
  teamCol: { flex: 1, minWidth: 0 },
  numCol: { width: 30 },
  formCol: { width: 78, alignItems: "center" },
  posBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  posZona: { backgroundColor: colors.accent },
  posText: { fontSize: 11.5, fontWeight: "700", color: colors.textSecondary },
  posTextZona: { color: colors.onAccent },
  teamRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.xs },
  teamText: { ...typography.bodyStrong, fontSize: 13, color: colors.text, flexShrink: 1 },
  cell: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  pts: { fontWeight: "800", fontSize: 14, color: colors.text },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    padding: spacing.md,
  },
  legendBox: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10.5, color: colors.textMuted },
}));
