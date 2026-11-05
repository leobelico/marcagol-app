// src/components/AsyncState.tsx
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { spacing, typography } from "../theme/tokens";
import { makeStyles, useTheme } from "../theme/ThemeContext";

export function LoadingState({ label }: { label?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.accent} />
      {label && <Text style={styles.loadingText}>{label}</Text>}
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  const styles = useStyles();
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>Ocurrió un error</Text>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  const styles = useStyles();
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    ...typography.body,
  },
  errorTitle: {
    ...typography.title,
    color: colors.loss,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
}));
