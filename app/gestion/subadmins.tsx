// app/gestion/subadmins.tsx
//
// Sub admins por torneo (solo super admin; equivalente a /admin/subadmins).
import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ApiError } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { SubAdminsResponse } from "../../src/types/api";
import { LoadingState, ErrorState } from "../../src/components/AsyncState";
import {
  Card,
  Chips,
  Divider,
  ErrorText,
  Field,
  PrimaryButton,
  SectionLabel,
} from "../../src/components/ui";
import { spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

export default function SubAdminsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const [data, setData] = useState<SubAdminsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(() => {
    if (!token) return;
    api
      .getSubAdmins(token)
      .then(setData)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar"));
  }, [token]);

  useFocusEffect(cargar);

  if (loadError) return <ErrorState message={loadError} />;
  if (!data) return <LoadingState />;

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  async function crear() {
    if (!token) return;
    if (!form.name.trim() || !form.email.trim() || !form.password || !tenantId) {
      return setError("Completa todos los campos y elige un torneo.");
    }
    if (form.password.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres.");
    }
    setError(null);
    setSaving(true);
    try {
      await api.createSubAdmin(token, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        tenantId,
      });
      setForm({ name: "", email: "", password: "" });
      setTenantId(null);
      cargar();
      Alert.alert(
        "Sub admin agregado",
        "Si el email ya tenía cuenta, conserva su contraseña anterior."
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  function quitar(userId: string, tenant: { id: string; name: string }, nombre: string) {
    if (!token) return;
    Alert.alert("Quitar acceso", `¿Quitar a ${nombre} como admin de ${tenant.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteSubAdmin(token, userId, tenant.id);
            cargar();
          } catch (err) {
            Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo quitar");
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel>AGREGAR SUB ADMIN</SectionLabel>
        <Field label="Nombre" value={form.name} onChangeText={set("name")} />
        <Field
          label="Email"
          value={form.email}
          onChangeText={set("email")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Contraseña"
          value={form.password}
          onChangeText={set("password")}
          autoCapitalize="none"
          secureTextEntry
        />
        <Text style={styles.label}>TORNEO</Text>
        <Chips
          options={data.torneos.map((t) => ({ value: t.id, label: t.name }))}
          value={tenantId}
          onChange={setTenantId}
        />
        <ErrorText message={error} />
        <PrimaryButton label="Agregar" onPress={crear} loading={saving} />

        <View style={{ height: spacing.xl }} />
        <SectionLabel>SUB ADMINS ({data.subAdmins.length})</SectionLabel>
        {data.subAdmins.length === 0 ? (
          <Text style={styles.empty}>Aún no hay sub admins.</Text>
        ) : (
          <Card>
            {data.subAdmins.map((s, i) => (
              <View key={`${s.user.id}-${s.tenant.id}`}>
                {i > 0 && <Divider />}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{s.user.name ?? "Sin nombre"}</Text>
                    <Text style={styles.meta}>{s.user.email}</Text>
                    <Text style={styles.tenant}>{s.tenant.name}</Text>
                  </View>
                  <Pressable
                    hitSlop={10}
                    onPress={() => quitar(s.user.id, s.tenant, s.user.name ?? "este usuario")}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.loss} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  name: { ...typography.bodyStrong, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  tenant: { ...typography.caption, color: colors.accent, marginTop: 2 },
  empty: { ...typography.body, color: colors.textMuted, textAlign: "center" },
}));
