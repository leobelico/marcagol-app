// src/components/inicio.tsx
//
// Piezas de la pantalla de inicio:
// - MiEquipoCard: próximo partido, lugar en la tabla, racha y goleador
//   del equipo que el aficionado eligió en la bienvenida.
// - MiJugadorCard: si el usuario es jugador, su ficha con goles,
//   asistencias, tarjetas y lugar en el goleo.
// - SigueATuEquipo: invitación a elegir equipo cuando aún no hay uno.
// - LigasDeck: tarjetas grandes por liga que se pasan deslizando. La de tu
//   liga va primero y entra directo a tu torneo.
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../api/client";
import type { Match, Organization } from "../types/api";
import { crestColor, FormDots, iniciales, TeamCrest, type Resultado } from "./match";
import { radius, spacing, typography } from "../theme/tokens";
import { makeStyles, useTheme } from "../theme/ThemeContext";
import type { MiEquipo } from "../utils/miEquipo";

// ─────────────────────────────────────────────────────────────
// Dibujo de cancha (líneas tenues de fondo para las tarjetas)
// ─────────────────────────────────────────────────────────────

function Cancha({ opacidad = 0.22 }: { opacidad?: number }) {
  const linea = `rgba(255,255,255,${opacidad})`;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 12, left: 12, right: 12, bottom: 12 }}>
      <View style={{ flex: 1, borderWidth: 2, borderColor: linea, borderRadius: 8 }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, backgroundColor: linea }} />
      <View
        style={{
          position: "absolute",
          width: 84,
          height: 84,
          borderRadius: 42,
          borderWidth: 2,
          borderColor: linea,
          top: "50%",
          left: "50%",
          marginTop: -42,
          marginLeft: -42,
        }}
      />
      <View style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: "17%", borderWidth: 2, borderTopWidth: 0, borderColor: linea }} />
      <View style={{ position: "absolute", bottom: 0, left: "25%", right: "25%", height: "17%", borderWidth: 2, borderBottomWidth: 0, borderColor: linea }} />
    </View>
  );
}

// Colores de portada por liga: tonos profundos para que el texto blanco
// siempre se lea. Se elige uno fijo según el nombre.
const PORTADAS = ["#13306A", "#0A6B4B", "#4C2390", "#7A3B12", "#8F1A4A", "#0E5A73", "#5A3A1F", "#2A3F8F"];
export function colorLiga(nombre: string) {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return PORTADAS[h % PORTADAS.length];
}

// ─────────────────────────────────────────────────────────────
// Mi equipo
// ─────────────────────────────────────────────────────────────

interface DatosEquipo {
  proximo: Match | null;
  posicion: number | null;
  puntos: number | null;
  racha: Resultado[];
  goleador: { name: string; goals: number } | null;
}

function cuandoEs(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);
  const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoy.toDateString()) return { dia: "Hoy", hora };
  if (d.toDateString() === manana.toDateString()) return { dia: "Mañana", hora };
  const dia = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  return { dia: dia.charAt(0).toUpperCase() + dia.slice(1), hora };
}

export function MiEquipoCard({ equipo }: { equipo: MiEquipo }) {
  const styles = useStyles();
  const [datos, setDatos] = useState<DatosEquipo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    setDatos(null);
    setError(false);
    Promise.all([
      api.getCalendario(equipo.tenantSlug),
      api.getStandings(equipo.tenantSlug),
      api.getTeamDetail(equipo.teamId),
    ])
      .then(([cal, tabla, detalle]) => {
        if (!vivo) return;
        const ahora = Date.now();
        const mios = cal.matches.filter(
          (m) => m.homeTeam.id === equipo.teamId || m.awayTeam.id === equipo.teamId
        );
        const proximo =
          mios.find((m) => m.status === "LIVE") ??
          mios
            .filter((m) => m.status === "SCHEDULED" && new Date(m.date).getTime() >= ahora - 2 * 3600e3)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ??
          null;
        const idx = tabla.standings.findIndex((s) => s.team.id === equipo.teamId);
        const racha = detalle.matches
          .slice(0, 5)
          .reverse()
          .map((m): Resultado => {
            const a = m.teamScore ?? 0;
            const b = m.opponentScore ?? 0;
            return a > b ? "G" : a === b ? "E" : "P";
          });
        const top = [...detalle.players].sort((a, b) => b.goals - a.goals)[0];
        setDatos({
          proximo,
          posicion: idx >= 0 ? idx + 1 : null,
          puntos: idx >= 0 ? tabla.standings[idx].pts : null,
          racha,
          goleador: top && top.goals > 0 ? { name: top.name, goals: top.goals } : null,
        });
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [equipo.tenantSlug, equipo.teamId]);

  const fondo = crestColor(equipo.teamName);
  const p = datos?.proximo;
  const enVivo = p?.status === "LIVE";
  const rival = p ? (p.homeTeam.id === equipo.teamId ? p.awayTeam : p.homeTeam) : null;
  const cuando = p ? cuandoEs(p.date) : null;

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        onPress={() => router.push(`/equipo/${equipo.teamId}`)}
        style={({ pressed }) => [styles.mio, { backgroundColor: fondo }, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.mioVelo} />
        <Cancha opacidad={0.14} />
        <View style={styles.mioTop}>
          <Text style={styles.mioEtiqueta}>
            {enVivo ? "EN VIVO" : "TU PRÓXIMO PARTIDO"}
          </Text>
          <Pressable
            hitSlop={10}
            onPress={() => router.push("/bienvenida")}
            style={styles.cambiar}
          >
            <Text style={styles.cambiarTexto}>Cambiar</Text>
          </Pressable>
        </View>

        {!datos && !error ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: spacing.xl }} />
        ) : (
          <View style={styles.vs}>
            <View style={styles.vsEquipo}>
              <View style={styles.aro}>
                <TeamCrest name={equipo.teamName} logo={equipo.teamLogo} size={48} />
              </View>
              <Text style={styles.vsNombre} numberOfLines={2}>{equipo.teamName}</Text>
            </View>
            <View style={styles.vsCentro}>
              {p && enVivo ? (
                <Text style={styles.vsMarcador}>
                  {p.homeTeam.id === equipo.teamId
                    ? `${p.homeScore ?? 0} - ${p.awayScore ?? 0}`
                    : `${p.awayScore ?? 0} - ${p.homeScore ?? 0}`}
                </Text>
              ) : cuando ? (
                <>
                  <Text style={styles.vsHora}>{cuando.hora}</Text>
                  <Text style={styles.vsDia}>
                    {cuando.dia}
                    {p?.cancha ? ` · Cancha ${p.cancha}` : ""}
                  </Text>
                </>
              ) : (
                <Text style={styles.vsDia}>{error ? "Sin conexión" : "Sin partidos\nprogramados"}</Text>
              )}
            </View>
            <View style={styles.vsEquipo}>
              {rival ? (
                <>
                  <View style={styles.aro}>
                    <TeamCrest name={rival.name} logo={rival.logo} size={48} />
                  </View>
                  <Text style={styles.vsNombre} numberOfLines={2}>{rival.name}</Text>
                </>
              ) : (
                <View style={[styles.aro, styles.aroVacio]}>
                  <Ionicons name="help" size={22} color="rgba(255,255,255,.7)" />
                </View>
              )}
            </View>
          </View>
        )}
        <Text style={styles.mioPie} numberOfLines={1}>
          {equipo.orgName} · {equipo.tenantName}
        </Text>
      </Pressable>

      {datos && (
        <View style={styles.cifras}>
          <View style={styles.cifra}>
            <Text style={styles.cifraNum}>{datos.posicion ? `${datos.posicion}°` : "—"}</Text>
            <Text style={styles.cifraTxt}>en la tabla</Text>
          </View>
          <View style={styles.cifra}>
            <Text style={styles.cifraNum}>{datos.puntos ?? "—"}</Text>
            <Text style={styles.cifraTxt}>puntos</Text>
          </View>
          <View style={styles.cifra}>
            {datos.racha.length ? (
              <FormDots results={datos.racha} />
            ) : (
              <Text style={styles.cifraNum}>—</Text>
            )}
            <Text style={styles.cifraTxt}>últimos 5</Text>
          </View>
        </View>
      )}
      {datos?.goleador && (
        <View style={styles.goleador}>
          <Ionicons name="football" size={18} color={fondo} />
          <Text style={styles.goleadorTxt} numberOfLines={1}>
            Goleador: <Text style={{ fontWeight: "800" }}>{datos.goleador.name}</Text>
          </Text>
          <Text style={styles.goleadorNum}>{datos.goleador.goals}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Mi jugador
// ─────────────────────────────────────────────────────────────

interface DatosJugador {
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  photo: string | null;
  number: number | null;
  position: string | null;
  lugarGoleo: number | null;
}

export function MiJugadorCard({ equipo }: { equipo: MiEquipo }) {
  const styles = useStyles();
  const yo = equipo.jugador!;
  const [datos, setDatos] = useState<DatosJugador | null>(null);
  const [error, setError] = useState(false);

  // Entrada: la ficha aparece con un pequeño rebote
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entrada, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }).start();
  }, [entrada]);

  useEffect(() => {
    let vivo = true;
    Promise.all([api.getTeamDetail(equipo.teamId), api.getGoleadores(equipo.tenantSlug)])
      .then(([detalle, goleo]) => {
        if (!vivo) return;
        const p = detalle.players.find((x) => x.id === yo.id);
        const goles = p?.goals ?? 0;
        // Lugar compartido en empates: 1 + cuántos tienen más goles
        const lugar = 1 + goleo.players.filter((x) => x.goals > goles).length;
        setDatos({
          goals: p?.goals ?? 0,
          assists: p?.assists ?? 0,
          yellow: p?.yellow ?? 0,
          red: p?.red ?? 0,
          photo: p?.photo ?? yo.photo,
          number: p?.number ?? yo.number,
          position: p?.position ?? null,
          lugarGoleo: goles > 0 ? lugar : null,
        });
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [equipo.teamId, equipo.tenantSlug, yo.id, yo.photo, yo.number]);

  const color = crestColor(equipo.teamName);
  const numero = datos?.number ?? yo.number;
  const foto = datos?.photo ?? yo.photo;
  const partes = yo.name.trim().split(/\s+/);
  const nombre = partes[0];
  const apellido = partes.slice(1).join(" ");

  return (
    <Animated.View
      style={{
        opacity: entrada,
        transform: [{ scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
      }}
    >
      <Pressable
        onPress={() => router.push(`/jugador/${equipo.teamId}/${yo.id}`)}
        style={({ pressed }) => [styles.jug, pressed && { opacity: 0.92 }]}
      >
        <View style={[styles.jugFranja, { backgroundColor: color }]} />
        {numero != null && <Text style={styles.jugDorsal}>{numero}</Text>}
        <View style={styles.jugFila}>
          <View style={[styles.jugFotoAro, { borderColor: color }]}>
            {foto ? (
              <Image source={{ uri: foto }} style={styles.jugFoto} />
            ) : (
              <View style={[styles.jugFoto, { backgroundColor: color, alignItems: "center", justifyContent: "center" }]}>
                <Text style={styles.jugIniciales}>{iniciales(yo.name)}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.jugEtiqueta}>
              TU FICHA{datos?.position ? ` · ${datos.position.toUpperCase()}` : ""}
            </Text>
            <Text style={styles.jugNombre} numberOfLines={1}>{nombre}</Text>
            {!!apellido && <Text style={styles.jugApellido} numberOfLines={1}>{apellido}</Text>}
            <View style={styles.jugEquipo}>
              <TeamCrest name={equipo.teamName} logo={equipo.teamLogo} size={16} />
              <Text style={styles.jugEquipoTxt} numberOfLines={1}>
                {equipo.teamName}{numero != null ? ` · #${numero}` : ""}
              </Text>
            </View>
          </View>
        </View>

        {datos?.lugarGoleo ? (
          <View style={styles.jugGoleo}>
            <Ionicons name="trophy" size={14} color="#F5B942" />
            <Text style={styles.jugGoleoTxt}>
              {datos.lugarGoleo === 1 ? "¡Líder de goleo del torneo!" : `${datos.lugarGoleo}° en la tabla de goleo`}
            </Text>
          </View>
        ) : null}

        {!datos && !error ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: spacing.md }} />
        ) : (
          <View style={styles.jugStats}>
            <View style={styles.jugStat}>
              <Text style={styles.jugNum}>{datos?.goals ?? "—"}</Text>
              <Text style={styles.jugNumTxt}>goles</Text>
            </View>
            <View style={styles.jugStat}>
              <Text style={styles.jugNum}>{datos?.assists ?? "—"}</Text>
              <Text style={styles.jugNumTxt}>asistencias</Text>
            </View>
            <View style={styles.jugStat}>
              <View style={styles.jugTarjetaFila}>
                <View style={[styles.tarjeta, { backgroundColor: "#F2C230" }]} />
                <Text style={styles.jugNum}>{datos?.yellow ?? "—"}</Text>
              </View>
              <Text style={styles.jugNumTxt}>amarillas</Text>
            </View>
            <View style={styles.jugStat}>
              <View style={styles.jugTarjetaFila}>
                <View style={[styles.tarjeta, { backgroundColor: "#E5383B" }]} />
                <Text style={styles.jugNum}>{datos?.red ?? "—"}</Text>
              </View>
              <Text style={styles.jugNumTxt}>rojas</Text>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function SigueATuEquipo() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push("/bienvenida")}
      style={({ pressed }) => [styles.sigue, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.sigueIcono}>
        <Ionicons name="star" size={20} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sigueTitulo}>Sigue a tu equipo</Text>
        <Text style={styles.sigueTxt}>Ve su próximo partido y su racha al abrir la app.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// Mazo de ligas
// ─────────────────────────────────────────────────────────────

const GAP = 12;

export function LigasDeck({
  ligas: todas,
  miEquipo,
}: {
  ligas: Organization[];
  miEquipo?: MiEquipo | null;
}) {
  const styles = useStyles();
  // Tu liga primero
  const ligas = miEquipo
    ? [...todas].sort(
        (a, b) => Number(b.slug === miEquipo.orgSlug) - Number(a.slug === miEquipo.orgSlug)
      )
    : todas;
  const { width } = useWindowDimensions();
  const ancho = Math.min(width - 56, 420);
  const paso = ancho + GAP;
  const lado = (width - ancho) / 2;
  const scrollX = useRef(new Animated.Value(0)).current;
  const [actual, setActual] = useState(0);

  // Entrada: las tarjetas suben y aparecen
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entrada, { toValue: 1, useNativeDriver: true, friction: 8, tension: 50 }).start();
  }, [entrada]);

  return (
    <Animated.View
      style={{
        opacity: entrada,
        transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
      }}
    >
      <Animated.FlatList
        horizontal
        data={ligas}
        keyExtractor={(o) => o.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={paso}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: lado, gap: GAP }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollEnd={(e) => setActual(Math.round(e.nativeEvent.contentOffset.x / paso))}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const rango = [(index - 1) * paso, index * paso, (index + 1) * paso];
          const scale = scrollX.interpolate({ inputRange: rango, outputRange: [0.9, 1, 0.9], extrapolate: "clamp" });
          const opacity = scrollX.interpolate({ inputRange: rango, outputRange: [0.6, 1, 0.6], extrapolate: "clamp" });
          return (
            <Animated.View style={{ width: ancho, transform: [{ scale }], opacity }}>
              <TarjetaLiga liga={item} mio={miEquipo?.orgSlug === item.slug ? miEquipo : null} />
            </Animated.View>
          );
        }}
      />
      {ligas.length > 1 &&
        (ligas.length <= 8 ? (
          <View style={styles.puntos}>
            {ligas.map((l, i) => (
              <View key={l.id} style={[styles.punto, i === actual && styles.puntoOn]} />
            ))}
          </View>
        ) : (
          <Text style={styles.contador}>
            {actual + 1} de {ligas.length}
          </Text>
        ))}
    </Animated.View>
  );
}

const ATAJOS: { tab: string; label: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { tab: "tabla", label: "Tabla", icono: "podium" },
  { tab: "calendario", label: "Calendario", icono: "calendar" },
  { tab: "goleo", label: "Goleo", icono: "football" },
];

function TarjetaLiga({ liga, mio }: { liga: Organization; mio: MiEquipo | null }) {
  const styles = useStyles();
  const s = liga.stats;
  // Tu liga entra directo a tu torneo; las demás muestran sus torneos
  const abrir = () =>
    router.push(mio ? `/torneo/${mio.tenantSlug}` : `/organizacion/${liga.slug}`);
  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [styles.liga, { backgroundColor: colorLiga(liga.name) }, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.ligaBrillo} />
      <Cancha />
      <View style={styles.ligaTop}>
        <View style={styles.ligaLogo}>
          {liga.logo ? (
            <Image source={{ uri: liga.logo }} style={{ width: 52, height: 52, borderRadius: 12 }} />
          ) : (
            <Text style={styles.ligaIniciales}>{iniciales(liga.name)}</Text>
          )}
        </View>
        {mio ? (
          <View style={styles.ligaMia}>
            <Ionicons name="star" size={11} color="#fff" />
            <Text style={styles.ligaVivoTxt}>Tu liga</Text>
          </View>
        ) : null}
        {!!s?.enVivo && (
          <View style={styles.ligaVivo}>
            <View style={styles.ligaVivoPunto} />
            <Text style={styles.ligaVivoTxt}>{s.enVivo} en vivo</Text>
          </View>
        )}
      </View>
      <View style={{ marginTop: "auto" }}>
        <Text style={styles.ligaNombre} numberOfLines={2}>{liga.name}</Text>
        {mio ? (
          <Text style={styles.ligaMeta} numberOfLines={1}>{mio.tenantName}</Text>
        ) : s ? (
          <Text style={styles.ligaMeta}>
            {s.torneos} {s.torneos === 1 ? "torneo activo" : "torneos activos"}
          </Text>
        ) : null}
        {mio ? (
          <View style={styles.atajos}>
            {ATAJOS.map((a) => (
              <Pressable
                key={a.tab}
                onPress={() => router.push(`/torneo/${mio.tenantSlug}/${a.tab}`)}
                style={({ pressed }) => [styles.atajo, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name={a.icono} size={15} color="#fff" />
                <Text style={styles.atajoTxt}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : s ? (
          <View style={styles.ligaStats}>
            <View><Text style={styles.ligaNum}>{s.equipos}</Text><Text style={styles.ligaNumTxt}>equipos</Text></View>
            <View><Text style={styles.ligaNum}>{s.partidos}</Text><Text style={styles.ligaNumTxt}>partidos</Text></View>
            <View><Text style={styles.ligaNum}>{s.goles}</Text><Text style={styles.ligaNumTxt}>goles</Text></View>
            <Ionicons name="arrow-forward-circle" size={30} color="rgba(255,255,255,.9)" style={{ marginLeft: "auto", alignSelf: "center" }} />
          </View>
        ) : (
          <View style={styles.ligaStats}>
            <Text style={styles.ligaNumTxt}>Ver torneos</Text>
            <Ionicons name="arrow-forward-circle" size={30} color="rgba(255,255,255,.9)" style={{ marginLeft: "auto" }} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  // Mi equipo
  mio: { borderRadius: 20, padding: spacing.lg, overflow: "hidden", gap: spacing.md },
  mioVelo: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.28)" },
  mioTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mioEtiqueta: { ...typography.caption, color: "rgba(255,255,255,.85)", letterSpacing: 1 },
  cambiar: { backgroundColor: "rgba(255,255,255,.18)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  cambiarTexto: { color: "#fff", fontSize: 11, fontWeight: "800" },
  vs: { flexDirection: "row", alignItems: "center" },
  vsEquipo: { flex: 1, alignItems: "center", gap: 6 },
  aro: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  aroVacio: { borderStyle: "dashed" },
  vsNombre: { color: "#fff", fontSize: 12.5, fontWeight: "800", textAlign: "center" },
  vsCentro: { alignItems: "center", minWidth: 90 },
  vsHora: { color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  vsMarcador: { color: "#fff", fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"] },
  vsDia: { color: "rgba(255,255,255,.85)", fontSize: 11.5, fontWeight: "700", textAlign: "center" },
  mioPie: { color: "rgba(255,255,255,.75)", fontSize: 11, fontWeight: "600", textAlign: "center" },
  cifras: { flexDirection: "row", gap: spacing.sm },
  cifra: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  cifraNum: { ...typography.statMedium, fontSize: 22, color: colors.text },
  cifraTxt: { ...typography.caption, color: colors.textMuted },
  goleador: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  goleadorTxt: { ...typography.body, color: colors.text, flex: 1 },
  goleadorNum: { ...typography.statMedium, color: colors.text },

  // Sigue a tu equipo
  sigue: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderStyle: "dashed",
    padding: spacing.lg,
  },
  sigueIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sigueTitulo: { ...typography.bodyStrong, fontSize: 15, color: colors.text },
  sigueTxt: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  // Mi jugador
  jug: {
    borderRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.lg + 6,
    overflow: "hidden",
    backgroundColor: "#0E1430",
    gap: spacing.md,
  },
  jugFranja: { position: "absolute", top: 0, left: 0, right: 0, height: 6 },
  jugDorsal: {
    position: "absolute",
    right: -6,
    top: -18,
    fontSize: 150,
    fontWeight: "900",
    color: "rgba(255,255,255,.07)",
    fontVariant: ["tabular-nums"],
  },
  jugFila: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  jugFotoAro: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, padding: 3 },
  jugFoto: { width: "100%", height: "100%", borderRadius: 40 },
  jugIniciales: { color: "#fff", fontSize: 24, fontWeight: "800" },
  jugEtiqueta: { ...typography.caption, color: "rgba(255,255,255,.6)", letterSpacing: 1 },
  jugNombre: { color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -0.5, lineHeight: 29 },
  jugApellido: { color: "rgba(255,255,255,.85)", fontSize: 16, fontWeight: "700" },
  jugEquipo: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  jugEquipoTxt: { color: "rgba(255,255,255,.75)", fontSize: 12, fontWeight: "700", flexShrink: 1 },
  jugGoleo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(245,185,66,.16)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  jugGoleoTxt: { color: "#F5B942", fontSize: 12, fontWeight: "800" },
  jugStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.12)",
    paddingTop: spacing.md,
  },
  jugStat: { flex: 1, alignItems: "center", gap: 2 },
  jugTarjetaFila: { flexDirection: "row", alignItems: "center", gap: 5 },
  jugNum: { color: "#fff", fontSize: 26, fontWeight: "900", fontVariant: ["tabular-nums"] },
  jugNumTxt: { color: "rgba(255,255,255,.6)", fontSize: 10.5, fontWeight: "700" },
  tarjeta: { width: 10, height: 14, borderRadius: 2 },

  // Ligas
  ligaMia: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,.2)",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginLeft: "auto",
    marginRight: 6,
  },
  atajos: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.25)",
  },
  atajo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,.16)",
    borderRadius: 10,
    paddingVertical: 9,
  },
  atajoTxt: { color: "#fff", fontSize: 12, fontWeight: "800" },
  liga: { height: 330, borderRadius: 24, padding: spacing.lg, overflow: "hidden" },
  ligaBrillo: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -170,
    right: -120,
    backgroundColor: "rgba(255,255,255,.10)",
  },
  ligaTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  ligaLogo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  ligaIniciales: { color: "#fff", fontSize: 22, fontWeight: "800" },
  ligaVivo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,.35)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ligaVivoPunto: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFB020" },
  ligaVivoTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  ligaNombre: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.6, lineHeight: 31 },
  ligaMeta: { color: "rgba(255,255,255,.8)", fontSize: 12.5, fontWeight: "600", marginTop: 4 },
  ligaStats: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xl,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,.25)",
  },
  ligaNum: { color: "#fff", fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  ligaNumTxt: { color: "rgba(255,255,255,.75)", fontSize: 11, fontWeight: "600" },
  puntos: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.md },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cardBorder },
  puntoOn: { width: 20, backgroundColor: colors.accent },
  contador: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
}));
