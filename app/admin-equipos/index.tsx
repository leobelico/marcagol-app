// app/admin-equipos/index.tsx
import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { AdminTenant } from "../../src/types/api";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../src/components/AsyncState";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

export default function AdminEquiposTorneosScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const [tenants, setTenants] = useState<AdminTenant[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getMisTorneos(token)
      .then((res) => setTenants(res.tenants))
      .catch((err) => setError(err.message ?? "No se pudo cargar"));
  }, [token]);

  if (error) return <ErrorState message={error} />;
  if (!tenants) return <LoadingState label="Cargando tus torneos..." />;
  if (tenants.length === 0) {
    return <EmptyState message="No tienes torneos asignados para administrar." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>SELECCIONA UN TORNEO</Text>
      <FlatList
        data={tenants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/admin-equipos/${item.slug}`)}
          >
            {item.logo ? (
              <Image source={{ uri: item.logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Text style={{ fontSize: 18 }}>🏆</Text>
              </View>
            )}
            <Text style={styles.cardText} numberOfLines={2}>
              {item.name}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  subtitle: {
    ...typography.subtitle,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardPressed: { opacity: 0.7 },
  logo: { width: 40, height: 40, borderRadius: radius.sm },
  logoPlaceholder: {
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { ...typography.bodyStrong, fontSize: 15, color: colors.text, flex: 1 },
}));
