// app/admin-equipos/nuevo.tsx
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api, ApiError } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import {
  CaptainPicker,
  type CaptainSelection,
} from "../../src/components/CaptainPicker";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

export default function NuevoEquipoScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [captainSelection, setCaptainSelection] = useState<CaptainSelection>({
    mode: "nuevo",
    name: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!token || !slug) return;
    if (!name.trim()) {
      setError("El nombre del equipo es obligatorio.");
      return;
    }

    let payload;
    if (captainSelection.mode === "existente") {
      if (!captainSelection.capitan) {
        setError("Selecciona un capitán existente.");
        return;
      }
      payload = { name: name.trim(), capitanUserId: captainSelection.capitan.id };
    } else {
      if (!captainSelection.name.trim() || !captainSelection.phone.trim()) {
        setError("El nombre y teléfono del capitán son obligatorios.");
        return;
      }
      payload = {
        name: name.trim(),
        captain: captainSelection.name.trim(),
        phone: captainSelection.phone.trim(),
      };
    }

    setError(null);
    setSaving(true);
    try {
      const res = await api.createEquipo(token, slug, payload);
      if (res.captainCredentials) {
        const c = res.captainCredentials;
        Alert.alert(
          "Equipo creado",
          `Capitán: ${c.name}\nEmail: ${c.email}\nTeléfono: ${c.phone}\nContraseña: ${c.password}`,
          [{ text: "Entendido", onPress: () => router.back() }]
        );
      } else {
        router.back();
      }
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
        <Text style={styles.title}>Nuevo equipo</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Nombre del equipo</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej. Rayados FC"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Text style={styles.label}>Capitán</Text>
        <CaptainPicker value={captainSelection} onChange={setCaptainSelection} />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            saving && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.saveButtonText}>Crear equipo</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: {
    ...typography.title,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  field: { marginBottom: spacing.lg },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  error: {
    ...typography.body,
    color: colors.loss,
    marginTop: spacing.md,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  saveButtonPressed: { opacity: 0.85 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { ...typography.bodyStrong, fontSize: 15, color: colors.onAccent },
  cancelButton: { alignItems: "center", marginTop: spacing.lg },
  cancelButtonText: { ...typography.body, color: colors.textMuted },
}));
