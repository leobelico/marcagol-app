// app/bienvenida.tsx
//
// Bienvenida. Primero pregunta quién eres:
// - Jugador: liga → torneo (si hay más de uno) → equipo → te buscas en la
//   plantilla. El inicio muestra tu tarjeta de jugador y la de tu equipo.
// - Aficionado: liga → torneo → equipo. El inicio muestra tu equipo.
// - Capitán u organizador: va directo a iniciar sesión.
// Todo se puede saltar.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/api/client";
import type { Organization, Team, TeamDetailPlayer, Tenant } from "../src/types/api";
import { TeamCrest } from "../src/components/match";
import { radius, spacing, typography } from "../src/theme/tokens";
import { makeStyles, useTheme } from "../src/theme/ThemeContext";
import {
  guardarMiEquipo,
  marcarBienvenidaVista,
  type RolAficionado,
} from "../src/utils/miEquipo";

type Paso = "rol" | "liga" | "torneo" | "equipo" | "jugador";
type Rol = RolAficionado | "capitan";

const ROLES: { value: Rol; icono: keyof typeof Ionicons.glyphMap; titulo: string; detalle: string }[] = [
  { value: "jugador", icono: "shirt", titulo: "Soy jugador", detalle: "Ve tus goles, tarjetas y el próximo partido de tu equipo." },
  { value: "aficionado", icono: "heart", titulo: "Soy aficionado", detalle: "Sigue a un equipo y su lugar en la tabla." },
  { value: "capitan", icono: "shield-checkmark", titulo: "Soy capitán u organizador", detalle: "Inicia sesión para administrar tu equipo o tu liga." },
];

export default function BienvenidaScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [paso, setPaso] = useState<Paso>("rol");
  const [rol, setRol] = useState<Rol | null>(null);
  const [ligas, setLigas] = useState<Organization[] | null>(null);
  const [torneos, setTorneos] = useState<Tenant[] | null>(null);
  const [equipos, setEquipos] = useState<Team[] | null>(null);
  const [jugadores, setJugadores] = useState<TeamDetailPlayer[] | null>(null);
  const [liga, setLiga] = useState<Organization | null>(null);
  const [torneo, setTorneo] = useState<Tenant | null>(null);
  const [equipo, setEquipo] = useState<Team | null>(null);
  const [jugador, setJugador] = useState<TeamDetailPlayer | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Animación de entrada de cada paso
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    entrada.setValue(0);
    Animated.timing(entrada, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [paso, entrada]);

  useEffect(() => {
    api
      .getOrganizations()
      .then((r) => setLigas(r.organizations))
      .catch((e) => setError(e.message ?? "No se pudieron cargar las ligas"));
  }, []);

  const jugadoresFiltrados = useMemo(() => {
    if (!jugadores) return [];
    const q = busqueda.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const lista = [...jugadores].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return lista;
    return lista.filter(
      (p) =>
        p.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q) ||
        String(p.number ?? "") === q
    );
  }, [jugadores, busqueda]);

  function salir() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function saltar() {
    await marcarBienvenidaVista();
    salir();
  }

  async function cargarEquipos(t: Tenant) {
    setEquipos(null);
    setPaso("equipo");
    try {
      const { standings } = await api.getStandings(t.slug);
      let lista = standings.map((s) => s.team);
      if (lista.length === 0) {
        // Torneo sin partidos jugados: sacar los equipos del calendario
        const { matches } = await api.getCalendario(t.slug);
        const vistos = new Map<string, Team>();
        matches.forEach((m) => {
          vistos.set(m.homeTeam.id, m.homeTeam);
          vistos.set(m.awayTeam.id, m.awayTeam);
        });
        lista = [...vistos.values()].sort((a, b) => a.name.localeCompare(b.name));
      }
      setEquipos(lista);
    } catch (e: any) {
      setError(e.message ?? "No se pudieron cargar los equipos");
    }
  }

  async function guardar(conJugador: TeamDetailPlayer | null) {
    if (!liga || !torneo || !equipo) return;
    setGuardando(true);
    await guardarMiEquipo({
      rol: conJugador ? "jugador" : "aficionado",
      jugador: conJugador
        ? { id: conJugador.id, name: conJugador.name, photo: conJugador.photo, number: conJugador.number }
        : null,
      orgSlug: liga.slug,
      orgName: liga.name,
      tenantSlug: torneo.slug,
      tenantName: torneo.name,
      teamId: equipo.id,
      teamName: equipo.name,
      teamLogo: equipo.logo,
    });
    salir();
  }

  async function continuar() {
    setError(null);
    if (paso === "rol" && rol) {
      if (rol === "capitan") {
        await marcarBienvenidaVista();
        router.replace("/login");
      } else {
        setPaso("liga");
      }
      return;
    }
    if (paso === "liga" && liga) {
      setTorneo(null);
      setTorneos(null);
      try {
        const { tenants } = await api.getOrganizationTenants(liga.slug);
        setTorneos(tenants);
        if (tenants.length === 1) {
          setTorneo(tenants[0]);
          await cargarEquipos(tenants[0]);
        } else {
          setPaso("torneo");
        }
      } catch (e: any) {
        setError(e.message ?? "No se pudieron cargar los torneos");
      }
      return;
    }
    if (paso === "torneo" && torneo) {
      setEquipo(null);
      await cargarEquipos(torneo);
      return;
    }
    if (paso === "equipo" && equipo) {
      if (rol === "jugador") {
        setJugador(null);
        setJugadores(null);
        setBusqueda("");
        setPaso("jugador");
        try {
          const { players } = await api.getTeamDetail(equipo.id);
          setJugadores(players);
        } catch (e: any) {
          setError(e.message ?? "No se pudo cargar la plantilla");
        }
      } else {
        await guardar(null);
      }
      return;
    }
    if (paso === "jugador" && jugador) {
      await guardar(jugador);
    }
  }

  function atras() {
    setError(null);
    if (paso === "jugador") setPaso("equipo");
    else if (paso === "equipo") setPaso(torneos && torneos.length > 1 ? "torneo" : "liga");
    else if (paso === "torneo") setPaso("liga");
    else if (paso === "liga") setPaso("rol");
  }

  // Pasos visibles según el rol y el número de torneos
  const pasos: Paso[] = ["rol", "liga"];
  if (torneos && torneos.length > 1) pasos.push("torneo");
  pasos.push("equipo");
  if (rol === "jugador") pasos.push("jugador");
  const numPaso = pasos.indexOf(paso) + 1;
  const totalPasos = rol === "capitan" ? 1 : pasos.length;

  const listo =
    (paso === "rol" && !!rol) ||
    (paso === "liga" && !!liga) ||
    (paso === "torneo" && !!torneo) ||
    (paso === "equipo" && !!equipo) ||
    (paso === "jugador" && !!jugador);

  const titulo = {
    rol: "¡Bienvenido a MarcaGol! ¿Quién eres?",
    liga: rol === "jugador" ? "¿En qué liga juegas?" : "¿A qué liga le vas?",
    torneo: "¿Qué torneo?",
    equipo: rol === "jugador" ? "¿En qué equipo juegas?" : "Elige a tu equipo",
    jugador: "Búscate en la plantilla",
  }[paso];
  const ayuda = {
    rol: "Así te mostramos lo que te importa al abrir la app.",
    liga: "Puedes cambiarla cuando quieras.",
    torneo: liga?.name ?? "",
    equipo: torneo?.name ?? "",
    jugador: equipo?.name ?? "",
  }[paso];

  const textoBoton =
    paso === "rol" && rol === "capitan"
      ? "Iniciar sesión"
      : paso === "jugador" || (paso === "equipo" && rol !== "jugador")
      ? "Listo"
      : "Continuar";

  const cargando =
    (paso === "liga" && !ligas) ||
    (paso === "torneo" && !torneos) ||
    (paso === "equipo" && !equipos) ||
    (paso === "jugador" && !jugadores);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.topBar}>
        {paso !== "rol" ? (
          <Pressable onPress={atras} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <View style={styles.progreso}>
          {Array.from({ length: totalPasos }).map((_, i) => (
            <View key={i} style={[styles.barra, i < numPaso && styles.barraOn]} />
          ))}
        </View>
        <Pressable onPress={saltar} hitSlop={12}>
          <Text style={styles.saltar}>Saltar</Text>
        </Pressable>
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: entrada,
          transform: [
            { translateX: entrada.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
          ],
        }}
      >
        <View style={styles.encabezado}>
          {totalPasos > 1 && (
            <Text style={styles.paso}>
              PASO {numPaso} DE {totalPasos}
            </Text>
          )}
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.ayuda}>{ayuda}</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {paso === "rol" ? (
          <View style={styles.lista}>
            {ROLES.map((r) => {
              const on = rol === r.value;
              return (
                <Pressable key={r.value} onPress={() => setRol(r.value)} style={[styles.rol, on && styles.activa]}>
                  <View style={[styles.rolIcono, on && { backgroundColor: colors.accent }]}>
                    <Ionicons name={r.icono} size={22} color={on ? colors.onAccent : colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.opcionTitulo}>{r.titulo}</Text>
                    <Text style={styles.opcionDetalle}>{r.detalle}</Text>
                  </View>
                  <View style={[styles.check, on && styles.checkOn]}>
                    {on && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : cargando && !error ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.accent} size="large" />
        ) : paso === "liga" ? (
          <FlatList
            data={ligas ?? []}
            keyExtractor={(o) => o.id}
            contentContainerStyle={styles.lista}
            renderItem={({ item }) => (
              <Opcion
                activa={liga?.id === item.id}
                onPress={() => setLiga(item)}
                icono={<TeamCrest name={item.name} logo={item.logo} size={36} />}
                titulo={item.name}
                detalle={
                  item.stats
                    ? `${item.stats.torneos} ${item.stats.torneos === 1 ? "torneo" : "torneos"} · ${item.stats.equipos} equipos`
                    : undefined
                }
              />
            )}
          />
        ) : paso === "torneo" ? (
          <FlatList
            data={torneos ?? []}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.lista}
            renderItem={({ item }) => (
              <Opcion
                activa={torneo?.id === item.id}
                onPress={() => setTorneo(item)}
                icono={<TeamCrest name={item.name} logo={item.logo} size={36} />}
                titulo={item.name}
              />
            )}
          />
        ) : paso === "equipo" ? (
          <FlatList
            data={equipos ?? []}
            key="equipos"
            numColumns={3}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.lista}
            columnWrapperStyle={{ gap: spacing.sm }}
            ListEmptyComponent={
              <Text style={styles.ayuda}>Este torneo todavía no tiene equipos.</Text>
            }
            renderItem={({ item }) => {
              const on = equipo?.id === item.id;
              return (
                <Pressable
                  onPress={() => setEquipo(item)}
                  style={[styles.equipo, on && styles.activa]}
                >
                  <TeamCrest name={item.name} logo={item.logo} size={40} />
                  <Text style={styles.equipoNombre} numberOfLines={2}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.buscar}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Tu nombre o tu número"
                placeholderTextColor={colors.textMuted}
                style={styles.buscarInput}
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={jugadoresFiltrados}
              key="jugadores"
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.lista}
              ListEmptyComponent={
                <Text style={styles.ayuda}>
                  {jugadores?.length
                    ? "No encontramos a nadie con ese nombre."
                    : "Este equipo todavía no tiene jugadores registrados."}
                </Text>
              }
              ListFooterComponent={
                <Pressable onPress={() => guardar(null)} style={styles.noEstoy} disabled={guardando}>
                  <Text style={styles.noEstoyTitulo}>No aparezco</Text>
                  <Text style={styles.opcionDetalle}>
                    Pídele a tu capitán que te registre. Mientras, te mostramos tu equipo.
                  </Text>
                </Pressable>
              }
              renderItem={({ item }) => (
                <Opcion
                  activa={jugador?.id === item.id}
                  onPress={() => setJugador(item)}
                  icono={<FotoJugador nombre={item.name} foto={item.photo} />}
                  titulo={item.name}
                  detalle={[
                    item.number != null ? `#${item.number}` : null,
                    item.position,
                    item.goals ? `${item.goals} ${item.goals === 1 ? "gol" : "goles"}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined}
                />
              )}
            />
          </View>
        )}
      </Animated.View>

      <View style={[styles.pie, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          onPress={continuar}
          disabled={!listo || guardando}
          style={({ pressed }) => [
            styles.boton,
            (!listo || guardando) && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
        >
          {guardando ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.botonTexto}>{textoBoton}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function FotoJugador({ nombre, foto }: { nombre: string; foto: string | null }) {
  const styles = useStyles();
  if (foto) return <Image source={{ uri: foto }} style={styles.foto} />;
  return <TeamCrest name={nombre} size={36} />;
}

function Opcion({
  activa,
  onPress,
  icono,
  titulo,
  detalle,
}: {
  activa: boolean;
  onPress: () => void;
  icono: React.ReactNode;
  titulo: string;
  detalle?: string;
}) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={[styles.opcion, activa && styles.activa]}>
      {icono}
      <View style={{ flex: 1 }}>
        <Text style={styles.opcionTitulo}>{titulo}</Text>
        {detalle && <Text style={styles.opcionDetalle}>{detalle}</Text>}
      </View>
      <View style={[styles.check, activa && styles.checkOn]}>
        {activa && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  iconBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  progreso: { flex: 1, flexDirection: "row", gap: 6 },
  barra: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder },
  barraOn: { backgroundColor: colors.accent },
  saltar: { ...typography.bodyStrong, color: colors.textMuted },
  encabezado: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 6 },
  paso: { ...typography.caption, color: colors.accent, letterSpacing: 1 },
  titulo: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, color: colors.text, lineHeight: 30 },
  ayuda: { ...typography.body, color: colors.textMuted, paddingHorizontal: 2 },
  error: { ...typography.body, color: colors.loss, paddingHorizontal: spacing.lg },
  lista: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  rol: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
  },
  rolIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  opcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  activa: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  opcionTitulo: { ...typography.bodyStrong, fontSize: 15, color: colors.text },
  opcionDetalle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  equipo: {
    flex: 1,
    maxWidth: "32%",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  equipoNombre: { ...typography.caption, fontSize: 11.5, color: colors.text, textAlign: "center" },
  buscar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  buscarInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  foto: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.soft },
  noEstoy: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.cardBorder,
  },
  noEstoyTitulo: { ...typography.bodyStrong, color: colors.text },
  pie: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.bgElevated,
  },
  boton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
  },
  botonTexto: { color: colors.onAccent, fontSize: 16, fontWeight: "800" },
}));
