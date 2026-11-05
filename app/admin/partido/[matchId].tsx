// app/admin/partido/[matchId].tsx
//
// Captura de resultado + eventos del partido (goles, asistencias,
// tarjetas por jugador). El marcador se guarda con el botón
// "Guardar resultado"; los eventos se agregan al instante, uno por
// uno, independientemente del marcador.
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type {
  EventType,
  MatchEventRow,
  MatchPlayer,
  MatchPlayersResponse,
} from "../../../src/types/api";
import { radius, spacing, typography, type ThemeColors } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

function ScoreStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable
        style={styles.stepperButton}
        onPress={() => onChange(Math.max(0, value - 1))}
        hitSlop={8}
      >
        <Ionicons name="remove" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        style={styles.stepperButton}
        onPress={() => onChange(value + 1)}
        hitSlop={8}
      >
        <Ionicons name="add" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const eventLabels = (
  colors: ThemeColors
): Record<EventType, { label: string; icon: string; color: string }> => ({
  GOAL: { label: "Gol", icon: "⚽", color: colors.accent },
  ASSIST: { label: "Asistencia", icon: "🅰️", color: colors.text },
  YELLOW_CARD: { label: "Amarilla", icon: "🟨", color: colors.yellowCard },
  RED_CARD: { label: "Roja", icon: "🟥", color: colors.loss },
});

export default function CapturarResultadoScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const EVENT_LABELS = eventLabels(colors);
  const { matchId, homeTeam, awayTeam, homeScore, awayScore } =
    useLocalSearchParams<{
      matchId: string;
      homeTeam?: string;
      awayTeam?: string;
      homeScore?: string;
      awayScore?: string;
    }>();
  const { token } = useAuth();

  const [home, setHome] = useState(Number(homeScore ?? 0));
  const [away, setAway] = useState(Number(awayScore ?? 0));
  const [saving, setSaving] = useState(false);

  const [players, setPlayers] = useState<MatchPlayersResponse | null>(null);
  const [events, setEvents] = useState<MatchEventRow[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<"player" | "type" | "castigo">("player");
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token || !matchId) return;
      api.getMatchPlayers(token, matchId).then(setPlayers).catch(() => {});
      api
        .getMatchEvents(token, matchId)
        .then((res) => setEvents(res.events))
        .catch(() => setEvents([]));
    }, [token, matchId])
  );

  async function handleSave() {
    if (!token || !matchId) return;
    setSaving(true);
    try {
      await api.updateMatchResult(token, matchId, {
        homeScore: home,
        awayScore: away,
        status: "FINISHED",
      });
      router.back();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo guardar";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  }

  function openPicker() {
    setSelectedPlayer(null);
    setPickerStep("player");
    setPickerOpen(true);
  }

  function pickPlayer(player: MatchPlayer) {
    setSelectedPlayer(player);
    setPickerStep("type");
  }

  async function pickType(type: EventType, suspensionGames?: number) {
    if (!token || !matchId || !selectedPlayer) return;
    // En una roja, primero se eligen los partidos de suspensión
    if (type === "RED_CARD" && suspensionGames === undefined) {
      setPickerStep("castigo");
      return;
    }
    setPickerOpen(false);
    try {
      await api.addMatchEvent(token, matchId, {
        playerId: selectedPlayer.id,
        type,
        ...(suspensionGames !== undefined && { suspensionGames }),
      });
      const res = await api.getMatchEvents(token, matchId);
      setEvents(res.events);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo registrar el evento";
      Alert.alert("Error", message);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!token) return;
    try {
      await api.deleteEvent(token, eventId);
      setEvents((prev) => (prev ? prev.filter((e) => e.id !== eventId) : prev));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo eliminar";
      Alert.alert("Error", message);
    }
  }

  const allPlayers: MatchPlayer[] = players
    ? [...players.homeTeam.players, ...players.awayTeam.players]
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Capturar resultado</Text>

      <View style={styles.matchRow}>
        <View style={styles.teamCol}>
          <Text style={styles.teamName} numberOfLines={2}>
            {homeTeam ?? "Local"}
          </Text>
          <ScoreStepper value={home} onChange={setHome} />
        </View>

        <Text style={styles.vs}>VS</Text>

        <View style={styles.teamCol}>
          <Text style={styles.teamName} numberOfLines={2}>
            {awayTeam ?? "Visitante"}
          </Text>
          <ScoreStepper value={away} onChange={setAway} />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          pressed && styles.saveButtonPressed,
          saving && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.saveButtonText}>Guardar resultado</Text>
        )}
      </Pressable>

      <View style={styles.eventsHeader}>
        <Text style={styles.sectionTitle}>EVENTOS DEL PARTIDO</Text>
        <Pressable style={styles.addEventButton} onPress={openPicker}>
          <Ionicons name="add-circle" size={16} color={colors.accent} />
          <Text style={styles.addEventText}>Agregar</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {!events || events.length === 0 ? (
          <Text style={styles.emptyText}>Sin eventos capturados aún.</Text>
        ) : (
          events.map((e, i) => (
            <View
              key={e.id}
              style={[
                styles.eventRow,
                i < events.length - 1 && styles.rowDivider,
              ]}
            >
              <Text style={styles.eventIcon}>{EVENT_LABELS[e.type].icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventPlayer}>{e.player.name}</Text>
                <Text style={styles.eventType}>{EVENT_LABELS[e.type].label}</Text>
              </View>
              <Pressable onPress={() => handleDeleteEvent(e.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Pressable onPress={() => router.back()} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cerrar</Text>
      </Pressable>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPickerOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            {pickerStep === "player" ? (
              <>
                <Text style={styles.modalTitle}>¿Quién?</Text>
                <ScrollView style={{ maxHeight: 360 }}>
                  {players && (
                    <>
                      <Text style={styles.modalGroupLabel}>
                        {players.homeTeam.name}
                      </Text>
                      {players.homeTeam.players.map((p) => (
                        <Pressable
                          key={p.id}
                          style={styles.modalRow}
                          onPress={() => pickPlayer(p)}
                        >
                          <Text style={styles.modalRowText}>
                            {p.number != null ? `#${p.number} ` : ""}
                            {p.name}
                          </Text>
                        </Pressable>
                      ))}
                      <Text style={styles.modalGroupLabel}>
                        {players.awayTeam.name}
                      </Text>
                      {players.awayTeam.players.map((p) => (
                        <Pressable
                          key={p.id}
                          style={styles.modalRow}
                          onPress={() => pickPlayer(p)}
                        >
                          <Text style={styles.modalRowText}>
                            {p.number != null ? `#${p.number} ` : ""}
                            {p.name}
                          </Text>
                        </Pressable>
                      ))}
                    </>
                  )}
                </ScrollView>
              </>
            ) : pickerStep === "castigo" ? (
              <>
                <Text style={styles.modalTitle}>🟥 {selectedPlayer?.name}</Text>
                <Text style={styles.modalSubtitle}>¿Cuántos partidos de suspensión?</Text>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    style={styles.modalRow}
                    onPress={() => pickType("RED_CARD", n)}
                  >
                    <Text style={styles.modalRowText}>
                      {n} partido{n > 1 ? "s" : ""}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{selectedPlayer?.name}</Text>
                <Text style={styles.modalSubtitle}>¿Qué evento?</Text>
                {(Object.keys(EVENT_LABELS) as EventType[]).map((type) => (
                  <Pressable
                    key={type}
                    style={styles.modalRow}
                    onPress={() => pickType(type)}
                  >
                    <Text style={styles.modalEventIcon}>
                      {EVENT_LABELS[type].icon}
                    </Text>
                    <Text style={styles.modalRowText}>
                      {EVENT_LABELS[type].label}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  title: {
    ...typography.title,
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  teamCol: { flex: 1, alignItems: "center", gap: spacing.md },
  teamName: {
    ...typography.bodyStrong,
    color: colors.text,
    textAlign: "center",
    minHeight: 36,
  },
  vs: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    ...typography.statLarge,
    color: colors.text,
    minWidth: 32,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  saveButtonPressed: { opacity: 0.85 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { ...typography.bodyStrong, fontSize: 15, color: colors.onAccent },
  eventsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
  },
  sectionTitle: { ...typography.subtitle, color: colors.textSecondary },
  addEventButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  addEventText: { ...typography.caption, color: colors.accent },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    padding: spacing.lg,
    textAlign: "center",
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  eventIcon: { fontSize: 18 },
  eventPlayer: { ...typography.bodyStrong, color: colors.text },
  eventType: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  cancelButton: { alignItems: "center" },
  cancelButtonText: { ...typography.body, color: colors.textMuted },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.title,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  modalGroupLabel: {
    ...typography.subtitle,
    color: colors.accent,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  modalRowText: { ...typography.body, color: colors.text },
  modalEventIcon: { fontSize: 18 },
}));
