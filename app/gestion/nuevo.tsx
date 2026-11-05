// app/gestion/nuevo.tsx
//
// Crear un torneo (equivalente a /admin/torneos/nuevo en la web).
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { api, ApiError } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { MatchDay } from "../../src/types/api";
import {
  Card,
  ErrorText,
  Field,
  PrimaryButton,
  SwitchRow,
} from "../../src/components/ui";
import { DIAS, FECHA_RE } from "../../src/utils/calendario";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

function slugify(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NuevoTorneoScreen() {
  const styles = useStyles();
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [matchesPerDay, setMatchesPerDay] = useState("2");
  const [matchDuration, setMatchDuration] = useState("90");
  const [roundTrip, setRoundTrip] = useState(false);
  const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function cambiarNombre(v: string) {
    setName(v);
    if (!slugEditado) setSlug(slugify(v));
  }

  function toggleDia(d: MatchDay) {
    setMatchDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSave() {
    if (!token) return;
    if (!name.trim() || !slug.trim()) return setError("Nombre y subdominio son obligatorios.");
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return setError("El subdominio solo puede tener minúsculas, números y guiones.");
    }
    if (startDate && !FECHA_RE.test(startDate)) {
      return setError("La fecha de inicio debe tener el formato AAAA-MM-DD.");
    }
    if (matchDays.length === 0) return setError("Selecciona al menos un día de juego.");

    setError(null);
    setSaving(true);
    try {
      const torneo = await api.crearTorneo(token, {
        name: name.trim(),
        slug,
        startDate: startDate || null,
        matchesPerDay: Number(matchesPerDay) || 2,
        matchDuration: Number(matchDuration) || 90,
        roundTrip,
        matchDays,
      });
      router.replace(`/gestion/${torneo.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el torneo");
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
        <Field label="Nombre del torneo *" value={name} onChangeText={cambiarNombre} />
        <Field
          label="Subdominio *"
          value={slug}
          onChangeText={(v) => {
            setSlugEditado(true);
            setSlug(v.toLowerCase());
          }}
          autoCapitalize="none"
        />
        {slug ? <Text style={styles.hint}>{slug}.marcagol.site</Text> : null}

        <Field
          label="Fecha de inicio (AAAA-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          autoCapitalize="none"
          placeholder="2026-11-15"
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Partidos por día"
              value={matchesPerDay}
              onChangeText={setMatchesPerDay}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Duración (min)"
              value={matchDuration}
              onChangeText={setMatchDuration}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>DÍAS DE JUEGO *</Text>
        <View style={styles.dias}>
          {DIAS.map((d) => {
            const activo = matchDays.includes(d.value as MatchDay);
            return (
              <Pressable
                key={d.value}
                onPress={() => toggleDia(d.value as MatchDay)}
                style={[styles.dia, activo && styles.diaActivo]}
              >
                <Text style={[styles.diaText, activo && styles.diaTextActivo]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <SwitchRow
            label="Ida y vuelta"
            detail="Cada equipo juega dos veces contra cada rival"
            value={roundTrip}
            onValueChange={setRoundTrip}
          />
        </Card>

        <ErrorText message={error} />
        <PrimaryButton label="Crear torneo" onPress={handleSave} loading={saving} />
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
  hint: {
    ...typography.caption,
    color: colors.accent,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  row: { flexDirection: "row", gap: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  dias: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  dia: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  diaActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  diaText: { ...typography.caption, color: colors.textSecondary },
  diaTextActivo: { color: colors.onAccent },
  cancel: { alignItems: "center", marginTop: spacing.lg },
  cancelText: { ...typography.body, color: colors.textMuted },
}));
