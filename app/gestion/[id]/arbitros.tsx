// app/gestion/[id]/arbitros.tsx
//
// Árbitros del torneo: lista (con pago acumulado), asignación a
// partidos pendientes y ranking por encuestas de los capitanes
// (equivalente a /admin/torneos/[id]/arbitros + ranking de la web).
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type {
  CalendarioMatch,
  Referee,
  RefereeRanking,
} from "../../../src/types/api";
import { LoadingState, ErrorState } from "../../../src/components/AsyncState";
import {
  Card,
  Chips,
  Divider,
  PrimaryButton,
  SectionLabel,
  formatFecha,
  formatMoney,
} from "../../../src/components/ui";
import { spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

type Tab = "lista" | "asignar" | "ranking";

export default function ArbitrosScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("lista");
  const [referees, setReferees] = useState<Referee[] | null>(null);
  const [sinArbitro, setSinArbitro] = useState<CalendarioMatch[]>([]);
  const [ranking, setRanking] = useState<RefereeRanking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [asignando, setAsignando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [refs, cal] = await Promise.all([
        api.getArbitros(token, id),
        api.getCalendarioAdmin(token, id),
      ]);
      setReferees(refs.referees);
      setSinArbitro(
        cal.rounds
          .flatMap((r) => r.matches)
          .filter((m) => !m.referee && (m.status === "SCHEDULED" || m.status === "LIVE"))
          .sort((a, b) => a.date.localeCompare(b.date))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar");
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function cargarRanking() {
    if (!token || !id) return;
    try {
      const res = await api.getRankingArbitros(token, id);
      setRanking(res.ranking);
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo cargar");
    }
  }

  function eliminar(ref: Referee) {
    if (!token || !id) return;
    Alert.alert(
      "Eliminar árbitro",
      `¿Eliminar a ${ref.name}? Se quitará de los partidos que tenga asignados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteArbitro(token, id, ref.id);
              cargar();
            } catch (err) {
              Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo eliminar");
            }
          },
        },
      ]
    );
  }

  async function asignar(matchId: string, refereeId: string | null) {
    if (!token) return;
    try {
      await api.asignarArbitro(token, matchId, refereeId);
      setAsignando(null);
      cargar();
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo asignar");
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!referees) return <LoadingState label="Cargando árbitros..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Chips<Tab>
        options={[
          { value: "lista", label: `Árbitros (${referees.length})` },
          { value: "asignar", label: `Sin árbitro (${sinArbitro.length})` },
          { value: "ranking", label: "Ranking" },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          if (t === "ranking" && !ranking) cargarRanking();
        }}
      />

      {tab === "lista" && (
        <>
          <PrimaryButton
            label="+ Nuevo árbitro"
            onPress={() => router.push(`/gestion/${id}/arbitro-nuevo`)}
          />
          <View style={{ height: spacing.lg }} />
          {referees.length === 0 ? (
            <Text style={styles.empty}>Aún no hay árbitros registrados.</Text>
          ) : (
            referees.map((ref) => {
              const abierto = expandido === ref.id;
              return (
                <Card key={ref.id} style={{ marginBottom: spacing.md }}>
                  <Pressable
                    style={styles.refRow}
                    onPress={() => setExpandido(abierto ? null : ref.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.refName}>{ref.name}</Text>
                      <Text style={styles.refMeta}>
                        {ref.matches.length} partidos
                        {ref.payPerMatch > 0 &&
                          ` · ${formatMoney(ref.payPerMatch)}/partido · Total ${formatMoney(
                            ref.matches.length * ref.payPerMatch
                          )}`}
                      </Text>
                      {ref.phone ? <Text style={styles.refMeta}>📞 {ref.phone}</Text> : null}
                    </View>
                    <Ionicons
                      name={abierto ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                  {abierto && (
                    <>
                      <Divider />
                      {ref.notes ? <Text style={styles.notes}>{ref.notes}</Text> : null}
                      {ref.matches.map((m) => (
                        <View key={m.id} style={styles.matchRow}>
                          <Text style={styles.matchTeams} numberOfLines={1}>
                            {m.homeTeam.name} vs {m.awayTeam.name}
                          </Text>
                          <Text style={styles.matchDate}>{formatFecha(m.date)}</Text>
                        </View>
                      ))}
                      <Pressable style={styles.deleteRow} onPress={() => eliminar(ref)}>
                        <Ionicons name="trash-outline" size={16} color={colors.loss} />
                        <Text style={styles.deleteText}>Eliminar árbitro</Text>
                      </Pressable>
                    </>
                  )}
                </Card>
              );
            })
          )}
        </>
      )}

      {tab === "asignar" && (
        <>
          {sinArbitro.length === 0 ? (
            <Text style={styles.empty}>Todos los partidos pendientes tienen árbitro.</Text>
          ) : referees.length === 0 ? (
            <Text style={styles.empty}>Primero registra al menos un árbitro.</Text>
          ) : (
            sinArbitro.map((m) => (
              <Card key={m.id} style={{ marginBottom: spacing.md }}>
                <Pressable
                  style={styles.refRow}
                  onPress={() => setAsignando(asignando === m.id ? null : m.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refName} numberOfLines={1}>
                      {m.homeTeam.name} vs {m.awayTeam.name}
                    </Text>
                    <Text style={styles.refMeta}>
                      {formatFecha(m.date, true)}
                      {m.cancha ? ` · Cancha ${m.cancha}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.assignLink}>Asignar</Text>
                </Pressable>
                {asignando === m.id && (
                  <View style={styles.assignBox}>
                    <Chips
                      options={referees.map((r) => ({ value: r.id, label: r.name }))}
                      value={null}
                      onChange={(refereeId) => asignar(m.id, refereeId)}
                    />
                  </View>
                )}
              </Card>
            ))
          )}
        </>
      )}

      {tab === "ranking" && (
        <>
          {!ranking ? (
            <LoadingState />
          ) : ranking.length === 0 ? (
            <Text style={styles.empty}>
              Aún no hay encuestas respondidas por los capitanes.
            </Text>
          ) : (
            ranking.map((r, i) => (
              <Card key={r.refereeId} style={{ marginBottom: spacing.md, padding: spacing.lg }}>
                <View style={styles.rankHeader}>
                  <Text style={styles.rankPos}>#{i + 1}</Text>
                  <Text style={[styles.refName, { flex: 1 }]}>{r.nombre}</Text>
                  <Text style={styles.rankScore}>{r.general.toFixed(1)}</Text>
                </View>
                <Text style={styles.refMeta}>
                  {r.respuestas} respuestas · {r.partidosEvaluados}/{r.partidos} partidos evaluados
                </Text>
                <Text style={styles.refMeta}>
                  P1 {r.p1} · P2 {r.p2} · P3 {r.p3} · P4 {r.p4} · P5 {r.p5}
                </Text>
                {r.comentarios.length > 0 && (
                  <>
                    <SectionLabel>COMENTARIOS</SectionLabel>
                    {r.comentarios.map((c, j) => (
                      <Text key={j} style={styles.notes}>
                        “{c.texto}”
                      </Text>
                    ))}
                  </>
                )}
              </Card>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  refName: { ...typography.bodyStrong, fontSize: 15, color: colors.text },
  refMeta: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  notes: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  matchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  matchTeams: { ...typography.body, color: colors.text, flex: 1 },
  matchDate: { ...typography.caption, color: colors.textMuted },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  deleteText: { ...typography.bodyStrong, color: colors.loss },
  assignLink: { ...typography.bodyStrong, color: colors.accent },
  assignBox: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  rankHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rankPos: { ...typography.statSmall, color: colors.textMuted },
  rankScore: { ...typography.statMedium, color: colors.gold },
}));
