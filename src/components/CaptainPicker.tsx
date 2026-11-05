// src/components/CaptainPicker.tsx
//
// Selector de capitán reutilizable: alterna entre "Capitán nuevo"
// (nombre + teléfono) y "Capitán existente" (buscar por nombre/tel
// y elegir de la lista). Usado en crear y editar equipo.
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Capitan } from "../types/api";
import { radius, spacing, typography } from "../theme/tokens";
import { makeStyles, useTheme } from "../theme/ThemeContext";

export type CaptainSelection =
  | { mode: "nuevo"; name: string; phone: string }
  | { mode: "existente"; capitan: Capitan | null };

export function CaptainPicker({
  value,
  onChange,
}: {
  value: CaptainSelection;
  onChange: (v: CaptainSelection) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Capitan[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (value.mode !== "existente" || !query.trim() || !token) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      setSearching(true);
      api
        .searchCapitanes(token, query.trim())
        .then((res) => setResults(res.capitanes))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350); // debounce simple

    return () => clearTimeout(timeout);
  }, [query, value.mode, token]);

  return (
    <View>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, value.mode === "nuevo" && styles.tabActive]}
          onPress={() => onChange({ mode: "nuevo", name: "", phone: "" })}
        >
          <Text
            style={[
              styles.tabText,
              value.mode === "nuevo" && styles.tabTextActive,
            ]}
          >
            Capitán nuevo
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, value.mode === "existente" && styles.tabActive]}
          onPress={() => onChange({ mode: "existente", capitan: null })}
        >
          <Text
            style={[
              styles.tabText,
              value.mode === "existente" && styles.tabTextActive,
            ]}
          >
            Capitán existente
          </Text>
        </Pressable>
      </View>

      {value.mode === "nuevo" ? (
        <View style={styles.fields}>
          <TextInput
            style={styles.input}
            value={value.name}
            onChangeText={(name) => onChange({ ...value, name })}
            placeholder="Nombre del capitán"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={value.phone}
            onChangeText={(phone) => onChange({ ...value, phone })}
            placeholder="WhatsApp / Teléfono"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>
      ) : value.capitan ? (
        <View style={styles.selectedCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedName}>{value.capitan.name}</Text>
            <Text style={styles.selectedMeta}>
              {value.capitan.phone} · {value.capitan.equipos.length} equipo
              {value.capitan.equipos.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => onChange({ mode: "existente", capitan: null })}
          >
            <Text style={styles.changeLink}>Cambiar</Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre o teléfono..."
            placeholderTextColor={colors.textMuted}
          />
          {searching && (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={{ marginTop: spacing.sm }}
            />
          )}
          {!searching && results.length > 0 && (
            <View style={styles.resultsList}>
              {results.map((cap) => (
                <Pressable
                  key={cap.id}
                  style={styles.resultRow}
                  onPress={() => onChange({ mode: "existente", capitan: cap })}
                >
                  <Text style={styles.resultName}>{cap.name}</Text>
                  <Text style={styles.resultMeta}>
                    {cap.phone} · {cap.equipos.length} equipo
                    {cap.equipos.length !== 1 ? "s" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.accent },
  tabText: { ...typography.caption, color: colors.textMuted },
  tabTextActive: { color: colors.onAccent, fontWeight: "800" },
  fields: { gap: spacing.md },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  selectedName: { ...typography.bodyStrong, color: colors.text },
  selectedMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  changeLink: { ...typography.caption, color: colors.loss },
  resultsList: { marginTop: spacing.sm, gap: spacing.xs },
  resultRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  resultName: { ...typography.bodyStrong, color: colors.text, fontSize: 13 },
  resultMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
}));
