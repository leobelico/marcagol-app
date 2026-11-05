// app/gestion/index.tsx
//
// Lista de torneos que el usuario administra. Desde aquí entra al
// panel completo de cada torneo (lo mismo que /admin en la web).
import { useCallback, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { AdminTenant } from "../../src/types/api";
import { LoadingState, ErrorState } from "../../src/components/AsyncState";
import { Card, Divider, MenuRow } from "../../src/components/ui";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

export default function GestionTorneosScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const [tenants, setTenants] = useState<AdminTenant[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      api
        .getMisTorneos(token)
        .then((res) => setTenants(res.tenants))
        .catch((err) => setError(err.message ?? "No se pudo cargar"));
    }, [token])
  );

  if (error) return <ErrorState message={error} />;
  if (!tenants) return <LoadingState label="Cargando tus torneos..." />;

  const header = (
    <Card style={{ marginBottom: spacing.sm }}>
      <MenuRow
        icon="add-circle"
        label="Nuevo torneo"
        onPress={() => router.push("/gestion/nuevo")}
      />
      {user?.isSuperAdmin && (
        <>
          <Divider />
          <MenuRow
            icon="shield-half"
            label="Sub admins"
            detail="Quién administra cada torneo"
            color="#60A5FA"
            onPress={() => router.push("/gestion/subadmins")}
          />
          <Divider />
          <MenuRow
            icon="key"
            label="Capitanes"
            detail="Ver todos y restablecer contraseñas"
            color={colors.gold}
            onPress={() => router.push("/gestion/capitanes")}
          />
        </>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tenants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {header}
            <Text style={styles.subtitle}>
              {tenants.length === 0 ? "NO TIENES TORNEOS ACTIVOS" : "TUS TORNEOS"}
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/gestion/${item.id}`)}
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
