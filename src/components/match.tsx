// src/components/match.tsx
//
// Piezas de "app de resultados": escudo de equipo, fila de partido
// (hora/estado · equipos · marcador) y racha de últimos resultados.
import { Image, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MatchStatus } from "../types/api";
import { radius, spacing } from "../theme/tokens";
import { makeStyles, useTheme } from "../theme/ThemeContext";

// Colores para escudos sin logo (se elige uno fijo por nombre)
const CREST_COLORS = [
  "#E2342D", "#2F64E0", "#0E9F6E", "#D99A00", "#7A3FD1",
  "#EE7A1E", "#0FA3B1", "#8B5E34", "#C2185B", "#455A64",
];

export function crestColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CREST_COLORS[h % CREST_COLORS.length];
}

export function iniciales(name: string) {
  const palabras = name
    .replace(/\b(fc|cf|club|deportivo|atl\.?|atlético|real|de|del|la|los|las)\b/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const base = palabras.length ? palabras : name.split(/\s+/);
  return (base.length === 1 ? base[0].slice(0, 3) : base.slice(0, 2).map((p) => p[0]).join(""))
    .toUpperCase();
}

export function TeamCrest({
  name,
  logo,
  size = 22,
}: {
  name: string;
  logo?: string | null;
  size?: number;
}) {
  const { colors } = useTheme();
  if (logo) {
    return (
      <Image
        source={{ uri: logo }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: crestColor(name),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.34, fontWeight: "800" }}>
        {iniciales(name)}
      </Text>
    </View>
  );
}

export function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });
}

export function formatDia(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  });
}

type RowTeam = { name: string; logo?: string | null };

export function MatchRow({
  date,
  status,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  detail,
  onPress,
  video,
}: {
  date: string;
  status: MatchStatus;
  homeTeam: RowTeam;
  awayTeam: RowTeam;
  homeScore: number | null;
  awayScore: number | null;
  /** Texto pequeño bajo los equipos (cancha, árbitro...) */
  detail?: string;
  onPress?: () => void;
  /** Tlachtli TV: el partido tiene video */
  video?: boolean;
}) {
  const styles = useStyles();
  const live = status === "LIVE";
  const fin = status === "FINISHED";
  const hayMarcador = (live || fin) && homeScore != null && awayScore != null;
  const hs = homeScore ?? 0;
  const as = awayScore ?? 0;
  const homeLose = fin && hs < as;
  const awayLose = fin && as < hs;

  const estado =
    status === "LIVE" ? "En vivo" : status === "FINISHED" ? "Final" : status === "CANCELLED" ? "Canc." : formatHora(date);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text
        style={[styles.status, live && styles.live, status === "CANCELLED" && styles.cancel]}
        numberOfLines={1}
      >
        {estado}
      </Text>
      <View style={styles.teams}>
        <View style={styles.team}>
          <TeamCrest name={homeTeam.name} logo={homeTeam.logo} size={18} />
          <Text style={[styles.name, homeLose && styles.lose, fin && hs > as && styles.win]} numberOfLines={1}>
            {homeTeam.name}
          </Text>
        </View>
        <View style={styles.team}>
          <TeamCrest name={awayTeam.name} logo={awayTeam.logo} size={18} />
          <Text style={[styles.name, awayLose && styles.lose, fin && as > hs && styles.win]} numberOfLines={1}>
            {awayTeam.name}
          </Text>
        </View>
        {detail ? <Text style={styles.detail} numberOfLines={1}>{detail}</Text> : null}
      </View>
      {video ? (
        <View style={styles.videoIco} accessibilityLabel="Tiene video">
          <Ionicons name="play" size={10} color="#fff" style={{ marginLeft: 1 }} />
        </View>
      ) : null}
      {hayMarcador && (
        <View style={styles.scores}>
          <Text style={[styles.score, live && styles.live, homeLose && styles.lose]}>{hs}</Text>
          <Text style={[styles.score, live && styles.live, awayLose && styles.lose]}>{as}</Text>
        </View>
      )}
    </Pressable>
  );
}

export type Resultado = "G" | "E" | "P";

export function FormDots({ results }: { results: Resultado[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = { G: colors.win, E: colors.draw, P: colors.loss };
  return (
    <View style={styles.form}>
      {results.map((r, i) => (
        <View key={i} style={[styles.formDot, { backgroundColor: bg[r] }]}>
          <Text style={styles.formText}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
    gap: spacing.sm,
  },
  pressed: { backgroundColor: colors.soft },
  status: {
    width: 48,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  live: { color: colors.live, fontWeight: "800" },
  cancel: { color: colors.loss },
  teams: { flex: 1, gap: 6, minWidth: 0 },
  team: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flexShrink: 1, fontSize: 13.5, fontWeight: "500", color: colors.text },
  win: { fontWeight: "700" },
  lose: { color: colors.textMuted },
  detail: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  videoIco: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.live,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  scores: { gap: 6, alignItems: "flex-end" },
  score: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  form: { flexDirection: "row", gap: 2 },
  formDot: {
    width: 14,
    height: 14,
    borderRadius: radius.sm / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  formText: { color: "#FFFFFF", fontSize: 8, fontWeight: "800" },
}));
