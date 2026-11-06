// app/partido/[matchId].tsx
//
// Detalle de un partido: marcador, video (MarcaGol TV) y jugadas. Si el
// partido tiene video, se muestra su miniatura y al tocarla se abre en
// YouTube. Las jugadas con clip tienen botón "Ver".
import { useCallback, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../src/api/client";
import type { PartidoResponse, PartidoEvento } from "../../src/types/api";
import { LoadingState, ErrorState } from "../../src/components/AsyncState";
import { TeamCrest } from "../../src/components/match";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";
import { abrirVideo, miniaturaYoutube } from "../../src/utils/video";

function fechaLarga(iso: string) {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  });
  const hora = d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${hora}`;
}

const TEXTO: Record<string, string> = {
  GOAL: "Gol",
  YELLOW_CARD: "Amarilla",
  RED_CARD: "Roja",
  ASSIST: "Asistencia",
  SUBSTITUTION: "Asistencia",
};

export default function PartidoScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [data, setData] = useState<PartidoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(() => {
    if (!matchId) return Promise.resolve();
    return api
      .getPartido(matchId)
      .then((r) => {
        setData(r);
        setError(null);
      })
      .catch((e) => setError(e.message ?? "No se pudo cargar el partido"));
  }, [matchId]);

  // Recargar al entrar (un partido en vivo cambia seguido)
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  if (error && !data) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Cargando partido..." />;

  const { match: m, events } = data;
  const jugado = m.status === "FINISHED" || m.status === "LIVE";
  const enVivo = m.status === "LIVE";
  const mini = miniaturaYoutube(m.videoUrl);
  const conClip = events.filter((e) => e.clipUrl).length;

  return (
    <>
      <Stack.Screen options={{ title: m.round ?? "Partido" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            tintColor={colors.accent}
            onRefresh={async () => {
              setRefrescando(true);
              await cargar();
              setRefrescando(false);
            }}
          />
        }
      >
        {/* Marcador */}
        <View style={styles.marcador}>
          <Text style={styles.fecha}>
            {fechaLarga(m.date)}
            {m.cancha ? ` · Cancha ${m.cancha}` : ""}
          </Text>
          <View style={styles.fila}>
            <Pressable style={styles.equipo} onPress={() => router.push(`/equipo/${m.homeTeam.id}`)}>
              <TeamCrest name={m.homeTeam.name} logo={m.homeTeam.logo} size={52} />
              <Text style={styles.equipoNombre} numberOfLines={2}>{m.homeTeam.name}</Text>
            </Pressable>
            <View style={styles.centro}>
              {jugado ? (
                <Text style={[styles.score, enVivo && { color: colors.live }]}>
                  {m.homeScore ?? 0} - {m.awayScore ?? 0}
                </Text>
              ) : (
                <Text style={styles.vs}>vs</Text>
              )}
              <Text style={[styles.estado, enVivo && { color: colors.live }]}>
                {enVivo ? "EN VIVO" : m.status === "FINISHED" ? "FINAL" : m.status === "CANCELLED" ? "CANCELADO" : "PROGRAMADO"}
              </Text>
            </View>
            <Pressable style={styles.equipo} onPress={() => router.push(`/equipo/${m.awayTeam.id}`)}>
              <TeamCrest name={m.awayTeam.name} logo={m.awayTeam.logo} size={52} />
              <Text style={styles.equipoNombre} numberOfLines={2}>{m.awayTeam.name}</Text>
            </Pressable>
          </View>
          <Text style={styles.torneo} numberOfLines={1}>{m.tenant.name}</Text>
        </View>

        {/* Video */}
        {m.videoUrl ? (
          <Pressable
            onPress={() => abrirVideo(m.videoUrl!)}
            accessibilityLabel={enVivo ? "Ver transmisión en vivo en YouTube" : "Ver video del partido en YouTube"}
            style={({ pressed }) => [styles.video, pressed && { opacity: 0.9 }]}
          >
            {mini ? (
              <Image source={{ uri: mini }} style={StyleAbsoluto} resizeMode="cover" />
            ) : null}
            <View style={styles.videoVelo} />
            <View style={styles.play}>
              <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
            </View>
            <View style={[styles.videoTag, enVivo && { backgroundColor: colors.live }]}>
              {enVivo && <View style={styles.videoTagPunto} />}
              <Text style={styles.videoTagTxt}>{enVivo ? "EN VIVO" : "VIDEO DEL PARTIDO"}</Text>
            </View>
            <View style={styles.videoPie}>
              <Ionicons name="logo-youtube" size={14} color="#fff" />
              <Text style={styles.videoPieTxt}>Se abre en YouTube</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.sinVideo}>
            <Ionicons name="videocam-outline" size={20} color={colors.textMuted} />
            <Text style={styles.sinVideoTxt}>
              Este partido no tiene video. Con MarcaGol TV las canchas tendrán cámara y cada gol su clip.
            </Text>
          </View>
        )}

        {/* Jugadas */}
        <View style={styles.seccionFila}>
          <Text style={styles.seccion}>JUGADAS</Text>
          {conClip > 0 && <Text style={styles.seccionExtra}>{conClip} con clip</Text>}
        </View>
        <View style={styles.card}>
          {events.length === 0 ? (
            <Text style={styles.vacio}>Sin jugadas registradas.</Text>
          ) : (
            events.map((e, i) => (
              <Jugada
                key={e.id}
                e={e}
                local={e.teamId === m.homeTeam.id}
                equipo={e.teamId === m.homeTeam.id ? m.homeTeam.name : m.awayTeam.name}
                divisor={i > 0}
              />
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const StyleAbsoluto = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

function Jugada({ e, local, equipo, divisor }: { e: PartidoEvento; local: boolean; equipo: string; divisor: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.jugada, divisor && styles.divisor]}>
      <Text style={styles.minuto}>{e.minute}&apos;</Text>
      {e.type === "GOAL" ? (
        <Ionicons name="football" size={16} color={colors.text} />
      ) : e.type === "YELLOW_CARD" ? (
        <View style={[styles.tarjeta, { backgroundColor: colors.yellowCard }]} />
      ) : e.type === "RED_CARD" ? (
        <View style={[styles.tarjeta, { backgroundColor: colors.loss }]} />
      ) : (
        <Ionicons name="return-up-forward" size={16} color={colors.textMuted} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.jugador} numberOfLines={1}>{e.player.name}</Text>
        <Text style={styles.jugadaInfo} numberOfLines={1}>
          {TEXTO[e.type] ?? e.type} · {local ? "Local" : "Visita"} · {equipo}
        </Text>
      </View>
      {e.clipUrl ? (
        <Pressable
          onPress={() => abrirVideo(e.clipUrl!)}
          hitSlop={8}
          accessibilityLabel={`Ver clip de ${e.player.name}`}
          style={({ pressed }) => [styles.clip, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="play" size={12} color={colors.accent} />
          <Text style={styles.clipTxt}>Ver</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  marcador: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  fecha: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  fila: { flexDirection: "row", alignItems: "center" },
  equipo: { flex: 1, alignItems: "center", gap: 6 },
  equipoNombre: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" },
  centro: { alignItems: "center", minWidth: 96 },
  score: { color: colors.text, fontSize: 36, fontWeight: "800", fontVariant: ["tabular-nums"] },
  vs: { color: colors.textMuted, fontSize: 18, fontWeight: "700" },
  estado: { ...typography.caption, color: colors.textMuted, fontWeight: "800", letterSpacing: 1, marginTop: 2 },
  torneo: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  video: {
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#1f6b3a",
    alignItems: "center",
    justifyContent: "center",
  },
  videoVelo: { ...StyleAbsoluto, backgroundColor: "rgba(0,0,0,.28)" },
  play: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoTag: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,.6)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoTagPunto: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  videoTagTxt: { color: "#fff", fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5 },
  videoPie: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,.6)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoPieTxt: { color: "#fff", fontSize: 10.5, fontWeight: "700" },
  sinVideo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sinVideoTxt: { ...typography.caption, color: colors.textMuted, flex: 1 },
  seccionFila: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: spacing.sm },
  seccion: { ...typography.subtitle, color: colors.textMuted },
  seccionExtra: { ...typography.caption, color: colors.accent, fontWeight: "800" },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  vacio: { ...typography.body, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.lg },
  jugada: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm + 2 },
  divisor: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  minuto: { width: 30, color: colors.textMuted, fontWeight: "800", fontVariant: ["tabular-nums"] },
  tarjeta: { width: 11, height: 15, borderRadius: 2, marginHorizontal: 2.5 },
  jugador: { color: colors.text, fontSize: 14, fontWeight: "700" },
  jugadaInfo: { ...typography.caption, color: colors.textMuted },
  clip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clipTxt: { color: colors.accent, fontSize: 12, fontWeight: "800" },
}));
