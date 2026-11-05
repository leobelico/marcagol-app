// app/gestion/[id]/calendario-generar.tsx
//
// Genera el calendario round-robin completo (mismo endpoint que el
// botón "Generar calendario" de la web).
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { TorneoAdmin } from "../../../src/types/api";
import { LoadingState, ErrorState } from "../../../src/components/AsyncState";
import {
  Card,
  Chips,
  Divider,
  ErrorText,
  Field,
  PrimaryButton,
  SectionLabel,
} from "../../../src/components/ui";
import { DIAS, HORA_RE } from "../../../src/utils/calendario";
import { spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

type Preferencia = { teamId: string; day: string };

export default function GenerarCalendarioScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [torneo, setTorneo] = useState<TorneoAdmin | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [horaInicio, setHoraInicio] = useState("18:00");
  const [preferencias, setPreferencias] = useState<Preferencia[]>([]);
  const [prefTeam, setPrefTeam] = useState<string | null>(null);
  const [prefDay, setPrefDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([api.getTorneoAdmin(token, id), api.getCalendarioAdmin(token, id)])
      .then(([t, cal]) => {
        setTorneo(t.torneo);
        setTeams(cal.teams.filter((x) => !x.disqualified));
        setPrefDay(t.torneo.matchDays[0] ?? null);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar"));
  }, [token, id]);

  if (loadError) return <ErrorState message={loadError} />;
  if (!torneo) return <LoadingState />;

  const n = teams.length;
  const numJornadas = torneo.roundTrip
    ? n % 2 === 0 ? (n - 1) * 2 : n * 2
    : n % 2 === 0 ? n - 1 : n;
  const totalPartidos = numJornadas * Math.floor(n / 2);
  const diasJuego = DIAS.filter((d) => (torneo.matchDays as string[]).includes(d.value));
  const nombreEquipo = (teamId: string) => teams.find((t) => t.id === teamId)?.name ?? "";

  function agregarPreferencia() {
    if (!prefTeam || !prefDay) return;
    setPreferencias((p) => [...p.filter((x) => x.teamId !== prefTeam), { teamId: prefTeam, day: prefDay }]);
    setPrefTeam(null);
  }

  async function generar() {
    if (!token || !id) return;
    if (!HORA_RE.test(horaInicio)) {
      setError("La hora debe tener el formato HH:MM (24 horas).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await api.generarCalendario(token, id, { horaInicio, preferencias });
      const conflictos = res.conflictos ?? [];
      Alert.alert(
        "Calendario generado",
        `Se crearon ${res.rounds} jornadas.` +
          (conflictos.length
            ? `\n\n⚠️ Partidos con conflicto:\n${conflictos
                .map((c) => `• ${c.homeTeam} vs ${c.awayTeam}: ${c.motivo}`)
                .join("\n")}`
            : ""),
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar");
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
        <Card style={{ padding: spacing.lg }}>
          <Text style={styles.summary}>
            {n} equipos · {torneo.roundTrip ? "ida y vuelta" : "solo ida"}
          </Text>
          <Text style={styles.summaryBig}>
            {numJornadas} jornadas · {totalPartidos} partidos
          </Text>
          <Text style={styles.summary}>
            {torneo.matchesPerDay} partidos por día · {torneo.matchDuration} min ·{" "}
            {diasJuego.map((d) => d.label).join(", ") || "sin días de juego"}
          </Text>
        </Card>

        <Field
          label="Hora del primer partido (HH:MM)"
          value={horaInicio}
          onChangeText={setHoraInicio}
          placeholder="18:00"
          autoCapitalize="none"
        />

        {diasJuego.length > 1 && (
          <>
            <SectionLabel>DÍA PREFERIDO POR EQUIPO (OPCIONAL)</SectionLabel>
            {preferencias.length > 0 && (
              <Card>
                {preferencias.map((p, i) => (
                  <View key={p.teamId}>
                    {i > 0 && <Divider />}
                    <View style={styles.prefRow}>
                      <Text style={styles.prefText}>
                        {nombreEquipo(p.teamId)} →{" "}
                        {DIAS.find((d) => d.value === p.day)?.label}
                      </Text>
                      <Pressable
                        hitSlop={10}
                        onPress={() =>
                          setPreferencias((all) => all.filter((x) => x.teamId !== p.teamId))
                        }
                      >
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </Card>
            )}
            <Text style={styles.label}>Equipo</Text>
            <Chips
              options={teams.map((t) => ({ value: t.id, label: t.name }))}
              value={prefTeam}
              onChange={setPrefTeam}
            />
            <Text style={styles.label}>Día</Text>
            <Chips options={diasJuego} value={prefDay} onChange={setPrefDay} />
            <Pressable
              onPress={agregarPreferencia}
              disabled={!prefTeam}
              style={[styles.addPref, !prefTeam && { opacity: 0.4 }]}
            >
              <Text style={styles.addPrefText}>+ Agregar preferencia</Text>
            </Pressable>
          </>
        )}

        <ErrorText message={error} />
        <PrimaryButton label="Generar calendario" onPress={generar} loading={saving} />
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
  summary: { ...typography.caption, color: colors.textMuted },
  summaryBig: { ...typography.statMedium, color: colors.text, marginVertical: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  prefText: { ...typography.body, color: colors.text },
  addPref: { marginBottom: spacing.lg },
  addPrefText: { ...typography.bodyStrong, color: colors.accent },
  cancel: { alignItems: "center", marginTop: spacing.lg },
  cancelText: { ...typography.body, color: colors.textMuted },
}));
