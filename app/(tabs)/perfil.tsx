// app/(tabs)/perfil.tsx
//
// Pestaña "Perfil": estado de sesión + accesos a funciones de admin.
// Reemplaza el Alert.alert genérico que antes vivía en la pantalla
// de Ligas — ahora es una pantalla propia, estilo SofaScore.
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";
import { AparienciaPicker } from "../../src/components/ui";

export default function PerfilScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: logout },
    ]);
  }

  if (!user) {
    return (
      <View style={[styles.loggedOutContainer, { paddingTop: insets.top }]}>
        <View style={styles.loggedOutIcon}>
          <Ionicons name="shield-outline" size={36} color={colors.textMuted} />
        </View>
        <Text style={styles.loggedOutTitle}>Acceso de administrador</Text>
        <Text style={styles.loggedOutSubtitle}>
          Inicia sesión para administrar tus torneos o, si eres capitán, tu equipo.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.loginButtonPressed,
          ]}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.loginButtonText}>Iniciar sesión</Text>
        </Pressable>
        <View style={styles.loggedOutTheme}>
          <Text style={styles.sectionLabel}>APARIENCIA</Text>
          <AparienciaPicker />
        </View>
      </View>
    );
  }

  const memberships = user.memberships ?? [];
  const esAdmin =
    user.isSuperAdmin ||
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    memberships.some((m) => m.role === "ADMIN");
  const esCapitan = user.role === "CAPTAIN" || memberships.some((m) => m.role === "CAPTAIN");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>
            {user.name ?? (esAdmin ? "Administrador" : "Capitán")}
          </Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>
      </View>

      {esCapitan && (
        <>
          <Text style={styles.sectionLabel}>CAPITÁN</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="shirt"
              label="Mi equipo"
              onPress={() => router.push("/capitan")}
            />
          </View>
        </>
      )}

      {esAdmin && (
        <>
          <Text style={styles.sectionLabel}>ADMINISTRACIÓN</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="trophy"
              label="Gestionar torneos"
              onPress={() => router.push("/gestion")}
            />
            <View style={styles.menuDivider} />
            <MenuRow
              icon="football"
              label="Capturar resultados"
              onPress={() => router.push("/admin")}
            />
            <View style={styles.menuDivider} />
            <MenuRow
              icon="people"
              label="Gestionar equipos"
              onPress={() => router.push("/admin-equipos")}
            />
          </View>
        </>
      )}

      <Text style={styles.sectionLabel}>APARIENCIA</Text>
      <View style={{ marginBottom: spacing.xl }}>
        <AparienciaPicker />
      </View>

      <Pressable style={styles.logoutRow} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.loss} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
      onPress={onPress}
    >
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Estado sin sesión
  loggedOutContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  loggedOutIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  loggedOutTitle: {
    ...typography.title,
    fontSize: 19,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  loggedOutSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  loginButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  loginButtonPressed: { opacity: 0.85 },
  loginButtonText: { ...typography.bodyStrong, fontSize: 15, color: colors.onAccent },

  // Estado con sesión
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { ...typography.title, fontSize: 17, color: colors.text },
  profileEmail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  sectionLabel: {
    ...typography.subtitle,
    color: colors.textMuted,
    marginBottom: spacing.sm + 2,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  menuRowPressed: { backgroundColor: colors.bgElevated },
  menuDivider: { height: 1, backgroundColor: colors.cardBorder },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { ...typography.bodyStrong, color: colors.text, flex: 1 },

  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  logoutText: { ...typography.bodyStrong, color: colors.loss },
  loggedOutTheme: { alignSelf: "stretch", marginTop: spacing.xxl },
}));
