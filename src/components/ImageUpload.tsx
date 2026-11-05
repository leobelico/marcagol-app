// src/components/ImageUpload.tsx
//
// Elegir una imagen de la galería y subirla de inmediato (foto de
// jugador, INE, documento oficial, logo del torneo...).
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ApiError } from "../api/client";
import { radius, spacing, typography } from "../theme/tokens";
import { makeStyles, useTheme } from "../theme/ThemeContext";

export function ImageUpload({
  label,
  uri,
  square = true,
  upload,
}: {
  label: string;
  uri: string | null;
  /** true para fotos/logos (recorte 1:1); false para identificaciones */
  square?: boolean;
  /** Sube la imagen local y devuelve la URL final */
  upload: (localUri: string) => Promise<string>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [current, setCurrent] = useState(uri);
  const [uploading, setUploading] = useState(false);

  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso necesario", "Necesitamos acceso a tus fotos para elegir la imagen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: square,
      aspect: square ? [1, 1] : undefined,
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      setCurrent(await upload(result.assets[0].uri));
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Pressable style={styles.slot} onPress={pick} disabled={uploading}>
      <View style={[styles.preview, !square && styles.previewWide]}>
        {uploading ? (
          <ActivityIndicator color={colors.accent} />
        ) : current ? (
          <Image source={{ uri: current }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Ionicons name="camera" size={20} color={colors.textMuted} />
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.action}>{current ? "Cambiar" : "Subir"}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  slot: { alignItems: "center", flex: 1 },
  preview: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  previewWide: { width: 96 },
  label: { ...typography.caption, color: colors.textSecondary, textAlign: "center" },
  action: { ...typography.caption, color: colors.accent },
}));
