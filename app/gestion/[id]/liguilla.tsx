// app/gestion/[id]/liguilla.tsx
//
// Liguilla / bracket (misma lógica que CalendarioClient en la web):
// - Sin fases: toma los primeros N de la tabla y arma 1° vs último, etc.
// - Con fases: cuando la última fase terminó, arma la siguiente con los
//   ganadores (en empates el admin elige quién avanza).
import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { CalendarioAdminResponse, CalendarioTeam } from "../../../src/types/api";
import { LoadingState, ErrorState } from "../../../src/components/AsyncState";
import {
  Card,
  Chips,
  ErrorText,
  Field,
  PrimaryButton,
  SectionLabel,
} from "../../../src/components/ui";
import {
  CANCHAS,
  FECHA_RE,
  HORA_RE,
  calcularStandings,
  emparejar,
  ganador,
  nombreFase,
  ultimaFaseBracket,
} from "../../../src/utils/calendario";
import { radius, spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

type Par = {
  home: CalendarioTeam;
  away: CalendarioTeam;
  fecha: string;
  hora: string;
  cancha: string;
};

export default function LiguillaScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<CalendarioAdminResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numClasificados, setNumClasificados] = useState("8");
  const [label, setLabel] = useState("");
  const [desempates, setDesempates] = useState<Record<string, string>>({});
  const [pares, setPares] = useState<Par[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token || !id) return;
      api
        .getCalendarioAdmin(token, id)
        .then(setData)
        .catch((err) => setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar"));
    }, [token, id])
  );

  if (loadError) return <ErrorState message={loadError} />;
  if (!data) return <LoadingState />;

  const ultima = ultimaFaseBracket(data);
  const ultimaTerminada =
    !!ultima && ultima.matches.length > 0 && ultima.matches.every((m) => m.status === "FINISHED");
  const esFinal = !!ultima && ultima.matches.length === 1;
  const empates = ultima
    ? ultima.matches.filter((m) => (m.homeScore ?? 0) === (m.awayScore ?? 0))
    : [];

  function armarPares(equipos: CalendarioTeam[]) {
    const nuevos = emparejar(equipos).map((p) => ({
      ...p,
      fecha: "",
      hora: "",
      cancha: "1",
    }));
    setPares(nuevos);
    if (!label) setLabel(nombreFase(nuevos.length));
  }

  function calcularPrimeraFase() {
    if (!data) return;
    setError(null);
    const n = Number(numClasificados);
    const clasificados = calcularStandings(data)
      .slice(0, n)
      .map((s) => s.team);
    if (clasificados.length < 2) {
      setError("Necesitas al menos 2 equipos clasificados (los descalificados no cuentan).");
      return;
    }
    armarPares(clasificados);
  }

  function calcularSiguienteFase() {
    if (!data || !ultima) return;
    const faltan = empates.filter((m) => !desempates[m.id]);
    if (faltan.length > 0) {
      setError("Selecciona quién avanza en todos los empates.");
      return;
    }
    setError(null);
    const ordenados = [...ultima.matches].sort(
      (a, b) => (a.bracketOrder ?? 0) - (b.bracketOrder ?? 0)
    );
    const ganadores = ordenados.map((m) => ganador(m, desempates[m.id]));
    // Reordena según la tabla general: mejor sembrado vs peor sembrado
    const posicion: Record<string, number> = {};
    calcularStandings(data).forEach((s, i) => {
      posicion[s.team.id] = i;
    });
    ganadores.sort((a, b) => (posicion[a.id] ?? 999) - (posicion[b.id] ?? 999));
    setLabel("");
    armarPares(ganadores);
  }

  function actualizarPar(i: number, campo: "fecha" | "hora" | "cancha", valor: string) {
    setPares((prev) => prev && prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  async function crear() {
    if (!token || !id || !pares) return;
    if (!label.trim()) return setError("Escribe el nombre de la fase.");
    const malos = pares.filter((p) => !FECHA_RE.test(p.fecha) || !HORA_RE.test(p.hora));
    if (malos.length > 0) {
      return setError("Completa fecha (AAAA-MM-DD) y hora (HH:MM) de todos los cruces.");
    }
    setError(null);
    setSaving(true);
    try {
      await api.crearFaseBracket(token, id, {
        bracketLabel: label.trim(),
        pares: pares.map((p) => ({
          homeTeamId: p.home.id,
          awayTeamId: p.away.id,
          fecha: p.fecha,
          hora: p.hora,
          cancha: Number(p.cancha),
        })),
      });
      Alert.alert("Listo", `${label.trim()} creada con ${pares.length} partidos.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear");
    } finally {
      setSaving(false);
    }
  }

  // ---------- Editor de cruces (común a ambas fases) ----------
  if (pares) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Field label="Nombre de la fase" value={label} onChangeText={setLabel} />
          {pares.map((p, i) => (
            <Card key={`${p.home.id}-${p.away.id}`} style={styles.parCard}>
              <Text style={styles.parTitle}>
                {p.home.name} vs {p.away.name}
              </Text>
              <View style={styles.parInputs}>
                <TextInput
                  style={[styles.input, { flex: 3 }]}
                  value={p.fecha}
                  onChangeText={(v) => actualizarPar(i, "fecha", v)}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={p.hora}
                  onChangeText={(v) => actualizarPar(i, "hora", v)}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
              <Chips
                options={CANCHAS.map((c) => ({ value: String(c), label: `Cancha ${c}` }))}
                value={p.cancha}
                onChange={(v) => actualizarPar(i, "cancha", v)}
              />
            </Card>
          ))}
          <ErrorText message={error} />
          <PrimaryButton label={`Crear ${label || "fase"}`} onPress={crear} loading={saving} />
          <Text style={styles.link} onPress={() => setPares(null)}>
            ← Volver
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ---------- Sin liguilla todavía ----------
  if (!ultima) {
    const tabla = calcularStandings(data);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.help}>
          Se tomarán los primeros lugares de la tabla actual y se enfrentarán 1° vs último,
          2° vs penúltimo, etc.
        </Text>
        <Field
          label="Equipos clasificados"
          value={numClasificados}
          onChangeText={setNumClasificados}
          keyboardType="number-pad"
        />
        <SectionLabel>TABLA ACTUAL</SectionLabel>
        <Card style={{ padding: spacing.md }}>
          {tabla.map((s, i) => (
            <Text
              key={s.team.id}
              style={[
                styles.tablaRow,
                i < Number(numClasificados) && { color: colors.text },
              ]}
            >
              {i + 1}. {s.team.name} · {s.pts} pts · {s.gf - s.ga >= 0 ? "+" : ""}
              {s.gf - s.ga}
            </Text>
          ))}
        </Card>
        <ErrorText message={error} />
        <PrimaryButton label="Calcular cruces" onPress={calcularPrimeraFase} />
      </ScrollView>
    );
  }

  // ---------- Ya hay liguilla ----------
  const etiqueta = ultima.bracketLabel ?? ultima.name ?? "Fase actual";

  if (!ultimaTerminada) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.help}>
          Para generar la siguiente ronda, primero captura el resultado de todos los partidos de{" "}
          {etiqueta}.
        </Text>
      </View>
    );
  }

  if (esFinal) {
    const campeon = ganador(ultima.matches[0]);
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={styles.champion}>{campeon.name}</Text>
        <Text style={styles.help}>
          La final ya se jugó.
          {(ultima.matches[0].homeScore ?? 0) === (ultima.matches[0].awayScore ?? 0)
            ? " Terminó empatada; el campeón mostrado es el local."
            : ""}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.help}>{etiqueta} terminó. Arma la siguiente ronda con los ganadores.</Text>
      {empates.length > 0 && (
        <>
          <SectionLabel>EMPATES: ¿QUIÉN AVANZA?</SectionLabel>
          {empates.map((m) => (
            <Card key={m.id} style={styles.parCard}>
              <Text style={styles.parTitle}>
                {m.homeTeam.name} {m.homeScore} - {m.awayScore} {m.awayTeam.name}
              </Text>
              <Chips
                options={[
                  { value: m.homeTeam.id, label: m.homeTeam.name },
                  { value: m.awayTeam.id, label: m.awayTeam.name },
                ]}
                value={desempates[m.id] ?? null}
                onChange={(v) => setDesempates((d) => ({ ...d, [m.id]: v }))}
              />
            </Card>
          ))}
        </>
      )}
      <ErrorText message={error} />
      <PrimaryButton label="Calcular siguiente ronda" onPress={calcularSiguienteFase} />
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  help: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  tablaRow: { ...typography.body, color: colors.textMuted, paddingVertical: 3 },
  parCard: { padding: spacing.md, marginBottom: spacing.md },
  parTitle: { ...typography.bodyStrong, color: colors.text, marginBottom: spacing.sm },
  parInputs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  link: {
    ...typography.bodyStrong,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  trophy: { fontSize: 56, marginBottom: spacing.md },
  champion: { ...typography.title, fontSize: 24, color: colors.gold, marginBottom: spacing.sm },
}));
