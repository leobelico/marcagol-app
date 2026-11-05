// app/admin-equipos/editar/[teamId].tsx
//
// Edita nombre, logo y opcionalmente reasigna el capitán de un
// equipo existente. El logo se sube de inmediato al elegirlo.
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import {
  CaptainPicker,
  type CaptainSelection,
} from "../../../src/components/CaptainPicker";
import { Card, Divider, SwitchRow } from "../../../src/components/ui";
import { radius, spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

export default function EditarEquipoScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    teamId,
    name: initialName,
    logo: initialLogo,
    captain,
    tenantId,
    disqualified: initialDisqualified,
    late: initialLate,
  } = useLocalSearchParams<{
    teamId: string;
    name?: string;
    logo?: string;
    captain?: string;
    tenantId?: string;
    disqualified?: string;
    late?: string;
  }>();
  const { token } = useAuth();

  const [name, setName] = useState(initialName ?? "");
  const [logo, setLogo] = useState(initialLogo || null);
  const [reassignCaptain, setReassignCaptain] = useState(false);
  const [captainSelection, setCaptainSelection] = useState<CaptainSelection>({
    mode: "existente",
    capitan: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [disqualified, setDisqualified] = useState(initialDisqualified === "1");
  const [allowLate, setAllowLate] = useState(initialLate === "1");
  const [savingFlag, setSavingFlag] = useState(false);

  async function toggleLate(value: boolean) {
    if (!token || !teamId || !tenantId) return;
    setSavingFlag(true);
    try {
      const res = await api.setPermitirTardio(token, tenantId, teamId, value);
      setAllowLate(res.allowLateRegistration);
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSavingFlag(false);
    }
  }

  function toggleDisqualified(value: boolean) {
    if (!token || !teamId || !tenantId) return;
    const aplicar = async () => {
      setSavingFlag(true);
      try {
        await api.setDescalificado(token, tenantId, teamId, value);
        setDisqualified(value);
      } catch (err) {
        Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo guardar");
      } finally {
        setSavingFlag(false);
      }
    };
    if (!value) return aplicar();
    Alert.alert(
      "Descalificar equipo",
      "Se cancelarán sus partidos pendientes. Los partidos ya jugados no se modifican.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Descalificar", style: "destructive", onPress: aplicar },
      ]
    );
  }

  async function handlePickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permiso necesario",
        "Necesitamos acceso a tus fotos para elegir el logo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !token || !teamId) return;

    setUploadingLogo(true);
    try {
      const res = await api.uploadEquipoLogo(token, teamId, result.assets[0].uri);
      setLogo(res.team.logo);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo subir el logo";
      Alert.alert("Error", message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    if (!token || !teamId) return;
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (
      reassignCaptain &&
      captainSelection.mode === "existente" &&
      !captainSelection.capitan
    ) {
      setError("Selecciona el capitán al que quieres reasignar el equipo.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const payload: { name: string; capitanUserId?: string } = {
        name: name.trim(),
      };
      if (reassignCaptain && captainSelection.mode === "existente" && captainSelection.capitan) {
        payload.capitanUserId = captainSelection.capitan.id;
      }
      await api.updateEquipo(token, teamId, payload);
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
        <Text style={styles.title}>Editar equipo</Text>

        <Pressable
          style={styles.logoPicker}
          onPress={handlePickLogo}
          disabled={uploadingLogo}
        >
          {uploadingLogo ? (
            <ActivityIndicator color={colors.accent} />
          ) : logo ? (
            <Image source={{ uri: logo }} style={styles.logoImage} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="camera" size={22} color={colors.textMuted} />
            </View>
          )}
          <Text style={styles.logoPickerLabel}>
            {logo ? "Cambiar logo" : "Agregar logo"}
          </Text>
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.label}>Nombre del equipo</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del equipo"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {captain ? (
          <View style={styles.field}>
            <Text style={styles.label}>Capitán actual</Text>
            <Text style={styles.currentCaptain}>{captain}</Text>
          </View>
        ) : null}

        {!reassignCaptain ? (
          <Pressable
            onPress={() => setReassignCaptain(true)}
            style={styles.reassignLink}
          >
            <Text style={styles.reassignLinkText}>Reasignar a otro capitán</Text>
          </Pressable>
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>Nuevo capitán</Text>
            <CaptainPicker
              value={captainSelection}
              onChange={setCaptainSelection}
            />
            <Pressable
              onPress={() => setReassignCaptain(false)}
              style={styles.cancelReassign}
            >
              <Text style={styles.reassignLinkText}>
                Cancelar reasignación
              </Text>
            </Pressable>
          </View>
        )}

        {tenantId ? (
          <Card>
            <SwitchRow
              label="Permitir registro tardío"
              detail="Puede registrar jugadores aunque las inscripciones estén cerradas"
              value={allowLate}
              onValueChange={toggleLate}
              disabled={savingFlag}
            />
            <Divider />
            <SwitchRow
              label="Descalificado"
              detail="Cancela sus partidos pendientes"
              value={disqualified}
              onValueChange={toggleDisqualified}
              disabled={savingFlag}
            />
          </Card>
        ) : null}

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

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: {
    ...typography.title,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  logoPicker: { alignItems: "center", marginBottom: spacing.xl },
  logoImage: { width: 88, height: 88, borderRadius: radius.lg, marginBottom: spacing.sm },
  logoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logoPickerLabel: { ...typography.caption, color: colors.accent },
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
  currentCaptain: { ...typography.bodyStrong, color: colors.text },
  reassignLink: { marginBottom: spacing.lg },
  reassignLinkText: { ...typography.caption, color: colors.accent },
  cancelReassign: { marginTop: spacing.sm },
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
