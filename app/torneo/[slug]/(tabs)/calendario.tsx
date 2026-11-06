// app/torneo/[slug]/(tabs)/calendario.tsx
//
// Partidos del torneo agrupados por día, al estilo app de resultados.
import { type ComponentRef, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "../../../../src/api/client";
import type { Match } from "../../../../src/types/api";
import { useTorneoSlug } from "../../../../src/context/TorneoContext";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../../src/components/AsyncState";
import { MatchRow, formatDia } from "../../../../src/components/match";
import { radius, spacing, typography } from "../../../../src/theme/tokens";
import { makeStyles } from "../../../../src/theme/ThemeContext";

function diaClave(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

export default function CalendarioScreen() {
  const styles = useStyles();
  const slug = useTorneoSlug();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .getCalendario(slug)
      .then((res) => setMatches(res.matches))
      .catch((err) => setError(err.message ?? "No se pudo cargar"));
  }, [slug]);

  const dias = useMemo(() => {
    const grupos = new Map<string, Match[]>();
    for (const m of matches ?? []) {
      const k = diaClave(m.date);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(m);
    }
    return [...grupos.entries()];
  }, [matches]);

  // Día al que conviene saltar: hoy, o el siguiente día con partidos
  const hoy = diaClave(new Date().toISOString());
  const destino = dias.find(([k]) => k >= hoy)?.[0];

  if (error) return <ErrorState message={error} />;
  if (!matches) return <LoadingState label="Cargando calendario..." />;
  if (matches.length === 0) {
    return <EmptyState message="No hay partidos programados aún." />;
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.list}
      contentContainerStyle={styles.listContent}
    >
      {dias.map(([k, partidos]) => (
        <View
          key={k}
          onLayout={(e) => {
            if (k === destino) {
              scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - spacing.sm), animated: false });
            }
          }}
        >
          <Text style={[styles.day, k === hoy && styles.today]}>
            {k === hoy ? "Hoy · " : ""}
            {formatDia(partidos[0].date)}
          </Text>
          <View style={styles.card}>
            {partidos.map((m, i) => (
              <View key={m.id} style={i > 0 && styles.divider}>
                <MatchRow
                  date={m.date}
                  status={m.status}
                  homeTeam={m.homeTeam}
                  awayTeam={m.awayTeam}
                  homeScore={m.homeScore}
                  awayScore={m.awayScore}
                  video={!!m.videoUrl}
                  onPress={() => router.push(`/partido/${m.id}`)}
                  detail={[
                    m.cancha ? `Cancha ${m.cancha}` : null,
                    m.referee ? `Árbitro: ${m.referee.name}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  day: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "capitalize",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  today: { color: colors.accent },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
}));
