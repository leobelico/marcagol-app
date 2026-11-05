// app/gestion/[id]/finanzas.tsx
//
// Ingresos y egresos del torneo (equivalente a /admin/torneos/[id]/finanzas).
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { Finance } from "../../../src/types/api";
import { LoadingState, ErrorState } from "../../../src/components/AsyncState";
import {
  Card,
  Divider,
  PrimaryButton,
  SectionLabel,
  formatFecha,
  formatMoney,
} from "../../../src/components/ui";
import { CATEGORIAS, categoria } from "../../../src/constants/finanzas";
import { radius, spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

export default function FinanzasScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [finances, setFinances] = useState<Finance[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    if (!token || !id) return;
    api
      .getFinanzas(token, id)
      .then((res) => setFinances(res.finances))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar"));
  }, [token, id]);

  useFocusEffect(cargar);

  if (error) return <ErrorState message={error} />;
  if (!finances) return <LoadingState label="Cargando finanzas..." />;

  const ingresos = finances.filter((f) => f.type === "INCOME").reduce((s, f) => s + f.amount, 0);
  const egresos = finances.filter((f) => f.type === "EXPENSE").reduce((s, f) => s + f.amount, 0);
  const balance = ingresos - egresos;

  const porCategoria = CATEGORIAS.map((c) => {
    const items = finances.filter((f) => f.category === c.value);
    return { ...c, count: items.length, total: items.reduce((s, f) => s + f.amount, 0) };
  }).filter((c) => c.count > 0);

  function eliminar(f: Finance) {
    if (!token || !id) return;
    Alert.alert("Eliminar movimiento", `¿Eliminar ${formatMoney(f.amount)}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteMovimiento(token, id, f.id);
            cargar();
          } catch (err) {
            Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo eliminar");
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.totals}>
        <Total label="Ingresos" value={ingresos} color={colors.win} />
        <Total label="Egresos" value={egresos} color={colors.loss} />
      </View>
      <View style={[styles.balance, { borderColor: balance >= 0 ? colors.win : colors.loss }]}>
        <Text style={styles.totalLabel}>BALANCE</Text>
        <Text style={[styles.balanceValue, { color: balance >= 0 ? colors.win : colors.loss }]}>
          {formatMoney(balance)}
        </Text>
      </View>

      <PrimaryButton
        label="+ Nuevo movimiento"
        onPress={() => router.push(`/gestion/${id}/movimiento-nuevo`)}
      />
      <View style={{ height: spacing.xl }} />

      {porCategoria.length > 0 && (
        <>
          <SectionLabel>POR CATEGORÍA</SectionLabel>
          <Card>
            {porCategoria.map((c, i) => (
              <View key={c.value}>
                {i > 0 && <Divider />}
                <View style={styles.row}>
                  <Text style={styles.icon}>{c.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{c.label}</Text>
                    <Text style={styles.rowMeta}>{c.count} movimientos</Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatMoney(c.total)}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionLabel>MOVIMIENTOS</SectionLabel>
      {finances.length === 0 ? (
        <Text style={styles.empty}>Aún no hay movimientos registrados.</Text>
      ) : (
        <Card>
          {finances.map((f, i) => {
            const cat = categoria(f.category);
            const ingreso = f.type === "INCOME";
            return (
              <View key={f.id}>
                {i > 0 && <Divider />}
                <View style={styles.row}>
                  <Text style={styles.icon}>{cat.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {f.description || cat.label}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {formatFecha(f.date)}
                      {f.team ? ` · ${f.team.name}` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.rowAmount, { color: ingreso ? colors.win : colors.loss }]}>
                    {ingreso ? "+" : "-"}
                    {formatMoney(f.amount)}
                  </Text>
                  <Pressable onPress={() => eliminar(f)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

function Total({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.total}>
      <Text style={styles.totalLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.totalValue, { color }]}>{formatMoney(value)}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  totals: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  total: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  totalLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  totalValue: { ...typography.statMedium },
  balance: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  balanceValue: { ...typography.statLarge },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  icon: { fontSize: 20 },
  rowTitle: { ...typography.bodyStrong, color: colors.text },
  rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  rowAmount: { ...typography.statSmall, color: colors.text },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
}));
