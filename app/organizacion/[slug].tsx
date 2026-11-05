// app/organizacion/[slug].tsx
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../src/api/client";
import type { Tenant } from "../../src/types/api";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../src/components/AsyncState";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

export default function TorneosScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .getOrganizationTenants(slug)
      .then((res) => {
        setTenants(res.tenants);
        setOrgName(res.organization.name);
      })
      .catch((err) => setError(err.message ?? "No se pudo cargar"));
  }, [slug]);

  if (error) return <ErrorState message={error} />;
  if (!tenants) return <LoadingState label="Cargando torneos..." />;
  if (tenants.length === 0) {
    return <EmptyState message="Esta liga aún no tiene torneos publicados." />;
  }

  return (
    <View style={styles.container}>
      {orgName && <Text style={styles.subtitle}>{orgName.toUpperCase()}</Text>}
      <FlatList
        data={tenants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push(`/torneo/${item.slug}`)}
          >
            {item.logo ? (
              <Image source={{ uri: item.logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Text style={styles.logoPlaceholderText}>🏆</Text>
              </View>
            )}
            <Text style={styles.cardText} numberOfLines={2}>
              {item.name}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textMuted}
            />
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
  logoPlaceholderText: { fontSize: 18 },
  cardText: { ...typography.bodyStrong, fontSize: 15, color: colors.text, flex: 1 },
}));
