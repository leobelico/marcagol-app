// app/gestion/[id]/calendario.tsx
//
// Jornadas y partidos del torneo (equivalente a /admin/torneos/[id]/calendario):
// generar/eliminar calendario, partido manual, liguilla, mover y borrar partidos.
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { CalendarioMatch, CalendarioRound } from "../../../src/types/api";
import { LoadingState, ErrorState, EmptyState } from "../../../src/components/AsyncState";
import {
  Card,
  Chips,
  Divider,
  MenuRow,
  SectionLabel,
  formatFecha,
} from "../../../src/components/ui";
import { spacing, typography, type ThemeColors } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

const estados = (
  colors: ThemeColors
): Record<CalendarioMatch["status"], { label: string; color: string }> => ({
  SCHEDULED: { label: "Programado", color: colors.textMuted },
  LIVE: { label: "En vivo", color: colors.live },
  FINISHED: { label: "Final", color: colors.textSecondary },
  CANCELLED: { label: "Cancelado", color: colors.loss },
});

export default function CalendarioAdminScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [rounds, setRounds] = useState<CalendarioRound[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moviendo, setMoviendo] = useState<string | null>(null);

  const cargar = useCallback(() => {
    if (!token || !id) return;
    api
      .getCalendarioAdmin(token, id)
      .then((res) => setRounds(res.rounds))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar"));
  }, [token, id]);

  useFocusEffect(cargar);

  function opciones(m: CalendarioMatch) {
    Alert.alert(`${m.homeTeam.name} vs ${m.awayTeam.name}`, undefined, [
      { text: "Mover a otra jornada", onPress: () => setMoviendo(m.id) },
      { text: "Eliminar partido", style: "destructive", onPress: () => eliminar(m) },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function mover(matchId: string, targetRoundId: string) {
    if (!token || !id) return;
    try {
      await api.moverPartido(token, id, matchId, targetRoundId);
      setMoviendo(null);
      cargar();
    } catch (err) {
      Alert.alert("No se pudo mover", err instanceof ApiError ? err.message : "Intenta de nuevo");
    }
  }

  function eliminarCalendario() {
    if (!token || !id) return;
    Alert.alert(
      "Eliminar calendario",
      "Se borrarán TODAS las jornadas, partidos, goles y tarjetas del torneo. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar todo",
          style: "destructive",
          onPress: async () => {
            try {
              await api.eliminarCalendario(token, id);
              cargar();
            } catch (err) {
              Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo eliminar");
            }
          },
        },
      ]
    );
  }

  function eliminar(m: CalendarioMatch) {
    if (!token || !id) return;
    Alert.alert(
      "Eliminar partido",
      `¿Eliminar ${m.homeTeam.name} vs ${m.awayTeam.name}? También se borrarán sus goles y tarjetas.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deletePartido(token, id, m.id);
              cargar();
            } catch (err) {
              Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo eliminar");
            }
          },
        },
      ]
    );
  }

  if (error) return <ErrorState message={error} />;
  if (!rounds) return <LoadingState label="Cargando calendario..." />;
  const acciones = (
    <Card>
      {rounds.length === 0 && (
        <>
          <MenuRow
            icon="sparkles"
            label="Generar calendario"
            detail="Todos contra todos, automático"
            onPress={() => router.push(`/gestion/${id}/calendario-generar`)}
          />
          <Divider />
        </>
      )}
      <MenuRow
        icon="add-circle"
        label="Agregar partido"
        detail="Partido manual en una jornada"
        color="#60A5FA"
        onPress={() => router.push(`/gestion/${id}/partido-nuevo`)}
      />
      <Divider />
      <MenuRow
        icon="git-network"
        label="Liguilla"
        detail="Crear fase o siguiente ronda"
        color={colors.gold}
        onPress={() => router.push(`/gestion/${id}/liguilla`)}
      />
      {rounds.length > 0 && (
        <>
          <Divider />
          <MenuRow
            icon="trash"
            label="Eliminar calendario"
            color={colors.loss}
            onPress={eliminarCalendario}
          />
        </>
      )}
    </Card>
  );

  if (rounds.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {acciones}
        <EmptyState message="Este torneo aún no tiene calendario." />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {acciones}
      {rounds.map((r) => (
        <View key={r.id}>
          <SectionLabel>
            {(r.bracketLabel ?? r.name ?? `Jornada ${r.number}`).toUpperCase()}
          </SectionLabel>
          <Card>
            {r.matches.length === 0 ? (
              <Text style={styles.empty}>Sin partidos</Text>
            ) : (
              r.matches.map((m, i) => {
                const estado = estados(colors)[m.status];
                const jugado = m.homeScore != null && m.awayScore != null;
                return (
                  <View key={m.id}>
                    {i > 0 && <Divider />}
                    <View style={styles.match}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.teamsRow}>
                          <Text style={styles.team} numberOfLines={1}>
                            {m.homeTeam.name}
                          </Text>
                          <Text style={styles.score}>
                            {jugado ? `${m.homeScore} - ${m.awayScore}` : "vs"}
                          </Text>
                          <Text style={[styles.team, styles.teamAway]} numberOfLines={1}>
                            {m.awayTeam.name}
                          </Text>
                        </View>
                        <Text style={styles.meta}>
                          {formatFecha(m.date, true)}
                          {m.cancha ? ` · Cancha ${m.cancha}` : ""}
                          {` · 🟨 ${m.referee?.name ?? "Sin árbitro"}`}
                        </Text>
                        <Text style={[styles.estado, { color: estado.color }]}>
                          {estado.label}
                        </Text>
                      </View>
                      <Pressable onPress={() => opciones(m)} hitSlop={10}>
                        <Ionicons
                          name="ellipsis-vertical"
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                    {moviendo === m.id && (
                      <View style={styles.mover}>
                        <Text style={styles.moverLabel}>Mover a:</Text>
                        <Chips
                          options={rounds
                            .filter((x) => x.id !== r.id)
                            .map((x) => ({
                              value: x.id,
                              label: x.bracketLabel ?? x.name ?? `Jornada ${x.number}`,
                            }))}
                          value={null}
                          onChange={(roundId) => mover(m.id, roundId)}
                        />
                        <Text style={styles.moverCancel} onPress={() => setMoviendo(null)}>
                          Cancelar
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  empty: { ...typography.body, color: colors.textMuted, padding: spacing.lg },
  match: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  teamsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  team: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  teamAway: { textAlign: "right" },
  score: { ...typography.statSmall, color: colors.text, minWidth: 44, textAlign: "center" },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  estado: { ...typography.caption, marginTop: 2 },
  mover: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  moverLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  moverCancel: { ...typography.caption, color: colors.textMuted },
}));
