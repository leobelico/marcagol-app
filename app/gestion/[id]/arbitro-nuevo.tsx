// app/gestion/[id]/arbitro-nuevo.tsx
import { useState } from "react";
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
import { ErrorText, Field, PrimaryButton } from "../../../src/components/ui";
import { spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

export default function NuevoArbitroScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    payPerMatch: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSave() {
    if (!token || !id) return;
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.createArbitro(token, id, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        payPerMatch: Number(form.payPerMatch) || 0,
        notes: form.notes.trim() || undefined,
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
        <Field label="Nombre *" value={form.name} onChangeText={set("name")} />
        <Field
          label="Teléfono / WhatsApp"
          value={form.phone}
          onChangeText={set("phone")}
          keyboardType="phone-pad"
        />
        <Field
          label="Email"
          value={form.email}
          onChangeText={set("email")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Pago por partido ($)"
          value={form.payPerMatch}
          onChangeText={set("payPerMatch")}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Field label="Notas" value={form.notes} onChangeText={set("notes")} multiline />

        <ErrorText message={error} />
        <PrimaryButton label="Guardar árbitro" onPress={handleSave} loading={saving} />
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
  cancel: { alignItems: "center", marginTop: spacing.lg },
  cancelText: { ...typography.body, color: colors.textMuted },
}));
