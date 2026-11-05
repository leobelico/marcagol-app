// app/gestion/capitanes.tsx
//
// Capitanes de todos los torneos + restablecer contraseña
// (solo super admin; equivalente a /admin/capitanes).
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, ApiError } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { Capitan } from "../../src/types/api";
import { LoadingState, ErrorState } from "../../src/components/AsyncState";
import { PrimaryButton } from "../../src/components/ui";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

export default function CapitanesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const [capitanes, setCapitanes] = useState<Capitan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .getTodosCapitanes(token)
      .then((res) => setCapitanes(res.capitanes))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar"));
  }, [token]);

  if (error) return <ErrorState message={error} />;
  if (!capitanes) return <LoadingState label="Cargando capitanes..." />;

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? capitanes.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.equipos.some((e) => e.teamName.toLowerCase().includes(q))
      )
    : capitanes;

  async function resetear(c: Capitan) {
    if (!token) return;
    if (password && password.length < 6) {
      Alert.alert("Contraseña muy corta", "Debe tener al menos 6 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.resetPasswordCapitan(token, c.id, password || undefined);
      const cr = res.credentials;
      Alert.alert(
        "Contraseña actualizada",
        `Capitán: ${cr.name ?? ""}\nEmail: ${cr.email ?? "—"}\nTeléfono: ${cr.phone ?? "—"}\nContraseña: ${cr.password}`
      );
      setAbierto(null);
      setPassword("");
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo cambiar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por nombre, teléfono o equipo"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />
      <FlatList
        data={filtrados}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Sin resultados.</Text>}
        renderItem={({ item: c }) => (
          <View style={styles.card}>
            <Pressable
              onPress={() => {
                setAbierto(abierto === c.id ? null : c.id);
                setPassword("");
              }}
            >
              <Text style={styles.name}>{c.name ?? "Sin nombre"}</Text>
              <Text style={styles.meta}>
                {[c.phone, c.email].filter(Boolean).join(" · ") || "Sin contacto"}
              </Text>
              {c.equipos.map((e) => (
                <Text key={e.teamId} style={styles.team}>
                  {e.teamName} <Text style={styles.meta}>· {e.tenantName}</Text>
                </Text>
              ))}
            </Pressable>
            {abierto === c.id && (
              <View style={styles.reset}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Nueva contraseña (vacío = automática)"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
                <Text style={styles.help}>
                  Automática: nombre + últimos 3 dígitos del teléfono.
                </Text>
                <PrimaryButton
                  label="Restablecer contraseña"
                  onPress={() => resetear(c)}
                  loading={saving}
                />
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    margin: spacing.lg,
    marginBottom: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
  },
  name: { ...typography.bodyStrong, fontSize: 15, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  team: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  reset: { marginTop: spacing.md },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  help: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  empty: { ...typography.body, color: colors.textMuted, textAlign: "center" },
}));
