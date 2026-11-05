// app/admin-equipos/jugador/[playerId].tsx
//
// Formulario de EDITAR un jugador existente. Recibe sus datos
// actuales por parámetros (para no hacer otro fetch) y los precarga.
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
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import { ImageUpload } from "../../../src/components/ImageUpload";
import { radius, spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

export default function EditarJugadorScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    playerId,
    name,
    number,
    position,
    teamId,
    tenantId,
    photo,
    ineUrl,
    documentoOficialUrl,
  } = useLocalSearchParams<{
    playerId: string;
    name?: string;
    number?: string;
    position?: string;
    teamId?: string;
    tenantId?: string;
    photo?: string;
    ineUrl?: string;
    documentoOficialUrl?: string;
  }>();
  const { token } = useAuth();

  const [nameValue, setNameValue] = useState(name ?? "");
  const [numberValue, setNumberValue] = useState(number ?? "");
  const [positionValue, setPositionValue] = useState(position ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!token || !playerId) return;
    if (!nameValue.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.updateJugador(token, playerId, {
        name: nameValue.trim(),
        number: numberValue.trim() ? Number(numberValue.trim()) : null,
        position: positionValue.trim() || null,
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
        {token && tenantId && teamId ? (
          <View style={styles.images}>
            <ImageUpload
              label="Foto"
              uri={photo || null}
              upload={async (uri) =>
                (await api.uploadFotoJugador(token, tenantId, teamId, playerId, uri)).photo
              }
            />
            <ImageUpload
              label="INE"
              uri={ineUrl || null}
              square={false}
              upload={async (uri) =>
                (await api.uploadDocumentoJugador(token, tenantId, teamId, playerId, "ine", uri))
                  .url
              }
            />
            <ImageUpload
              label="Doc. oficial"
              uri={documentoOficialUrl || null}
              square={false}
              upload={async (uri) =>
                (
                  await api.uploadDocumentoJugador(
                    token,
                    tenantId,
                    teamId,
                    playerId,
                    "documentoOficial",
                    uri
                  )
                ).url
              }
            />
          </View>
        ) : null}

        <Field label="Nombre" value={nameValue} onChangeText={setNameValue} />
        <Field
          label="Número"
          value={numberValue}
          onChangeText={setNumberValue}
          keyboardType="number-pad"
        />
        <Field
          label="Posición"
          value={positionValue}
          onChangeText={setPositionValue}
          placeholder="Ej. Delantero"
        />

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
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  images: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
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
    marginBottom: spacing.md,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveButtonPressed: { opacity: 0.85 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { ...typography.bodyStrong, fontSize: 15, color: colors.onAccent },
  cancelButton: { alignItems: "center", marginTop: spacing.lg },
  cancelButtonText: { ...typography.body, color: colors.textMuted },
}));
