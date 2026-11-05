// app/capitan/jugador.tsx
//
// Alta / edición de un jugador desde el portal del capitán. Al crear,
// la pantalla pasa a modo edición para subir foto e identificaciones.
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api, ApiError } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import { ImageUpload } from "../../src/components/ImageUpload";
import { ErrorText, Field, PrimaryButton } from "../../src/components/ui";
import { spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

export default function CapitanJugadorScreen() {
  const styles = useStyles();
  const params = useLocalSearchParams<{
    tenantId: string;
    teamId: string;
    playerId?: string;
    name?: string;
    number?: string;
    position?: string;
    photo?: string;
    ineUrl?: string;
    documentoOficialUrl?: string;
  }>();
  const { tenantId, teamId } = params;
  const { token } = useAuth();
  const [playerId, setPlayerId] = useState(params.playerId || null);
  const [name, setName] = useState(params.name ?? "");
  const [number, setNumber] = useState(params.number ?? "");
  const [position, setPosition] = useState(params.position ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function guardar() {
    if (!token) return;
    if (!name.trim()) return setError("El nombre es obligatorio.");
    const data = {
      name: name.trim(),
      number: number.trim() ? Number(number.trim()) : null,
      position: position.trim() || null,
    };
    setError(null);
    setSaving(true);
    try {
      if (playerId) {
        await api.updateJugadorEquipo(token, tenantId, teamId, playerId, data);
        router.back();
      } else {
        const player = await api.crearJugadorEquipo(token, tenantId, teamId, data);
        setPlayerId(player.id);
        Alert.alert("Jugador agregado", "Ahora puedes subir su foto e identificación.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  function eliminar() {
    if (!token || !playerId) return;
    Alert.alert("Eliminar jugador", `¿Eliminar a ${name}? No se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteJugadorEquipo(token, tenantId, teamId, playerId);
            router.back();
          } catch (err) {
            Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo eliminar");
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
      <Stack.Screen options={{ title: playerId ? "Jugador" : "Nuevo jugador" }} />
      <ScrollView contentContainerStyle={styles.content}>
        {token && playerId ? (
          <View style={styles.images}>
            <ImageUpload
              label="Foto"
              uri={params.photo || null}
              upload={async (uri) =>
                (await api.uploadFotoJugador(token, tenantId, teamId, playerId, uri)).photo
              }
            />
            <ImageUpload
              label="INE"
              uri={params.ineUrl || null}
              square={false}
              upload={async (uri) =>
                (await api.uploadDocumentoJugador(token, tenantId, teamId, playerId, "ine", uri))
                  .url
              }
            />
            <ImageUpload
              label="Doc. oficial"
              uri={params.documentoOficialUrl || null}
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

        <Field label="Nombre *" value={name} onChangeText={setName} />
        <Field
          label="Número"
          value={number}
          onChangeText={setNumber}
          keyboardType="number-pad"
        />
        <Field
          label="Posición"
          value={position}
          onChangeText={setPosition}
          placeholder="Ej. Delantero"
        />

        <ErrorText message={error} />
        <PrimaryButton
          label={playerId ? "Guardar cambios" : "Agregar jugador"}
          onPress={guardar}
          loading={saving}
        />
        {playerId && !params.playerId ? (
          <Pressable onPress={() => router.back()} style={styles.secondary}>
            <Text style={styles.done}>Listo</Text>
          </Pressable>
        ) : null}
        {params.playerId ? (
          <Pressable onPress={eliminar} style={styles.secondary}>
            <Text style={styles.delete}>Eliminar jugador</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  images: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  secondary: { alignItems: "center", marginTop: spacing.lg },
  done: { ...typography.bodyStrong, color: colors.accent },
  delete: { ...typography.bodyStrong, color: colors.loss },
}));
