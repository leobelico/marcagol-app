// app/gestion/[id]/partido-nuevo.tsx
//
// Agrega un partido manual al calendario (mismo endpoint que
// "Agregar partido" en la web). Avisa si los equipos ya se enfrentaron.
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { CalendarioAdminResponse } from "../../../src/types/api";
import { LoadingState, ErrorState } from "../../../src/components/AsyncState";
import { Chips, ErrorText, Field, PrimaryButton } from "../../../src/components/ui";
import { CANCHAS, FECHA_RE, HORA_RE, mexicoLocalToISO } from "../../../src/utils/calendario";
import { spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

const NUEVA = "__nueva__";

export default function NuevoPartidoScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<CalendarioAdminResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [cancha, setCancha] = useState("1");
  const [roundId, setRoundId] = useState(NUEVA);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api
      .getCalendarioAdmin(token, id)
      .then(setData)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar"));
  }, [token, id]);

  if (loadError) return <ErrorState message={loadError} />;
  if (!data) return <LoadingState />;

  const equipos = data.teams
    .filter((t) => !t.disqualified)
    .map((t) => ({ value: t.id, label: t.name }));

  async function guardar(confirmarRepetido = false) {
    if (!token || !id) return;
    if (!homeTeamId || !awayTeamId) return setError("Selecciona ambos equipos.");
    if (homeTeamId === awayTeamId) return setError("Selecciona dos equipos diferentes.");
    if (!FECHA_RE.test(fecha)) return setError("La fecha debe tener el formato AAAA-MM-DD.");
    if (!HORA_RE.test(hora)) return setError("La hora debe tener el formato HH:MM (24 horas).");

    setError(null);
    setSaving(true);
    try {
      await api.crearPartidoManual(token, id, {
        homeTeamId,
        awayTeamId,
        date: mexicoLocalToISO(fecha, hora),
        cancha: Number(cancha),
        roundId: roundId === NUEVA ? null : roundId,
        confirmarRepetido,
      });
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        Alert.alert("Partido repetido", `${err.message}. ¿Agregarlo de todos modos?`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Agregar", onPress: () => guardar(true) },
        ]);
      } else {
        setError(err instanceof ApiError ? err.message : "No se pudo guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>LOCAL</Text>
        <Chips options={equipos} value={homeTeamId} onChange={setHomeTeamId} />
        <Text style={styles.label}>VISITANTE</Text>
        <Chips
          options={equipos.filter((e) => e.value !== homeTeamId)}
          value={awayTeamId}
          onChange={setAwayTeamId}
        />

        <Field
          label="Fecha (AAAA-MM-DD)"
          value={fecha}
          onChangeText={setFecha}
          placeholder="2026-11-15"
          autoCapitalize="none"
        />
        <Field
          label="Hora (HH:MM, 24 horas)"
          value={hora}
          onChangeText={setHora}
          placeholder="19:00"
          autoCapitalize="none"
        />

        <Text style={styles.label}>CANCHA</Text>
        <Chips
          options={CANCHAS.map((c) => ({ value: String(c), label: `Cancha ${c}` }))}
          value={cancha}
          onChange={setCancha}
        />

        <Text style={styles.label}>JORNADA</Text>
        <Chips
          options={[
            { value: NUEVA, label: "Nueva jornada" },
            ...data.rounds.map((r) => ({
              value: r.id,
              label: r.bracketLabel ?? r.name ?? `Jornada ${r.number}`,
            })),
          ]}
          value={roundId}
          onChange={setRoundId}
        />

        <ErrorText message={error} />
        <PrimaryButton label="Agregar partido" onPress={() => guardar()} loading={saving} />
        <Pressable onPress={() => router.back()} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  cancel: { alignItems: "center", marginTop: spacing.lg },
  cancelText: { ...typography.body, color: colors.textMuted },
}));
