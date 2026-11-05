// app/gestion/[id]/movimiento-nuevo.tsx
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { FinanceCategory, FinanceType } from "../../../src/types/api";
import { Chips, ErrorText, Field, PrimaryButton } from "../../../src/components/ui";
import { CATEGORIAS } from "../../../src/constants/finanzas";
import { spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

const SIN_EQUIPO = "__ninguno__";

function hoy() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function NuevoMovimientoScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [type, setType] = useState<FinanceType>("INCOME");
  const [category, setCategory] = useState<FinanceCategory>("CUOTA_EQUIPO");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState<string>(SIN_EQUIPO);
  const [date, setDate] = useState(hoy());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api.getFinanzas(token, id).then((res) => setTeams(res.teams)).catch(() => {});
  }, [token, id]);

  function elegirCategoria(value: FinanceCategory) {
    setCategory(value);
    const cat = CATEGORIAS.find((c) => c.value === value);
    if (cat) setType(cat.type);
  }

  async function handleSave() {
    if (!token || !id) return;
    const monto = Number(amount);
    if (!monto || monto <= 0) {
      setError("Escribe un monto válido.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("La fecha debe tener el formato AAAA-MM-DD.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.createMovimiento(token, id, {
        type,
        category,
        amount: monto,
        description: description.trim() || undefined,
        teamId: teamId === SIN_EQUIPO ? undefined : teamId,
        date,
      });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
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
        <Text style={styles.label}>TIPO</Text>
        <Chips<FinanceType>
          options={[
            { value: "INCOME", label: "Ingreso" },
            { value: "EXPENSE", label: "Egreso" },
          ]}
          value={type}
          onChange={setType}
        />

        <Text style={styles.label}>CATEGORÍA</Text>
        <Chips<FinanceCategory>
          options={CATEGORIAS.map((c) => ({ value: c.value, label: `${c.icon} ${c.label}` }))}
          value={category}
          onChange={elegirCategoria}
        />

        <Field
          label="Monto ($) *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Field label="Descripción" value={description} onChangeText={setDescription} />
        <Field
          label="Fecha (AAAA-MM-DD)"
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
        />

        {teams.length > 0 && (
          <>
            <Text style={styles.label}>EQUIPO (OPCIONAL)</Text>
            <Chips
              options={[
                { value: SIN_EQUIPO, label: "Ninguno" },
                ...teams.map((t) => ({ value: t.id, label: t.name })),
              ]}
              value={teamId}
              onChange={setTeamId}
            />
          </>
        )}

        <ErrorText message={error} />
        <PrimaryButton label="Guardar movimiento" onPress={handleSave} loading={saving} />
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
