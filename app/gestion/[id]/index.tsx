// app/gestion/[id]/index.tsx
//
// Panel de un torneo: resumen, configuración y accesos a cada módulo
// (equivalente a /admin/torneos/[id] en la web).
import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api, ApiError } from "../../../src/api/client";
import { useAuth } from "../../../src/context/AuthContext";
import type { TorneoAdmin } from "../../../src/types/api";
import { LoadingState, ErrorState } from "../../../src/components/AsyncState";
import { ImageUpload } from "../../../src/components/ImageUpload";
import {
  Card,
  Divider,
  MenuRow,
  SectionLabel,
  SwitchRow,
} from "../../../src/components/ui";
import { radius, spacing, typography } from "../../../src/theme/tokens";
import { makeStyles, useTheme } from "../../../src/theme/ThemeContext";

const DIAS: Record<string, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mié",
  THURSDAY: "Jue",
  FRIDAY: "Vie",
  SATURDAY: "Sáb",
  SUNDAY: "Dom",
};

export default function TorneoPanelScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [torneo, setTorneo] = useState<TorneoAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingRegistro, setSavingRegistro] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token || !id) return;
      api
        .getTorneoAdmin(token, id)
        .then((res) => setTorneo(res.torneo))
        .catch((err) => setError(err.message ?? "No se pudo cargar"));
    }, [token, id])
  );

  if (error) return <ErrorState message={error} />;
  if (!torneo || !token) return <LoadingState label="Cargando torneo..." />;

  async function toggleRegistro(value: boolean) {
    if (!torneo || !token) return;
    setSavingRegistro(true);
    try {
      const res = await api.setRegistroAbierto(token, torneo.id, value);
      setTorneo({ ...torneo, registrationOpen: res.registrationOpen });
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSavingRegistro(false);
    }
  }

  function notificar() {
    if (!torneo || !token) return;
    Alert.alert(
      "Notificar calendario",
      "Se enviará el calendario por WhatsApp a los capitanes de todos los equipos. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          onPress: async () => {
            try {
              const res = await api.notificarCalendario(token, torneo.id);
              Alert.alert("Listo", `Notificaciones enviadas: ${res.resultados.length}`);
            } catch (err) {
              Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo enviar");
            }
          },
        },
      ]
    );
  }

  function archivar() {
    if (!torneo || !token) return;
    const archivar = !torneo.archived;
    Alert.alert(
      archivar ? "Archivar torneo" : "Restaurar torneo",
      archivar
        ? "El torneo dejará de aparecer en tu lista de torneos activos."
        : "El torneo volverá a aparecer en tu lista de torneos activos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: archivar ? "Archivar" : "Restaurar",
          style: archivar ? "destructive" : "default",
          onPress: async () => {
            try {
              await api.setArchivado(token, torneo.id, archivar);
              if (archivar) router.back();
              else setTorneo({ ...torneo, archived: false });
            } catch (err) {
              Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo guardar");
            }
          },
        },
      ]
    );
  }

  const base = `/gestion/${torneo.id}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: torneo.name }} />

      <View style={styles.header}>
        <View style={{ width: 96 }}>
          <ImageUpload
            label="Logo"
            uri={torneo.logo}
            upload={async (uri) => (await api.uploadTorneoLogo(token, torneo.id, uri)).url}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{torneo.name}</Text>
          <Text style={styles.slug}>{torneo.slug}.marcagol.site</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Equipos" value={String(torneo._count.teams)} color={colors.win} />
        <Stat label="Partidos" value={String(torneo._count.matches)} color="#60A5FA" />
        <Stat label="Jornadas" value={String(torneo._count.rounds)} color="#C084FC" />
      </View>

      <SectionLabel>CONFIGURACIÓN</SectionLabel>
      <Card style={{ padding: spacing.lg }}>
        <ConfigRow
          label="Inicio"
          value={
            torneo.startDate
              ? new Date(torneo.startDate).toLocaleDateString("es-MX")
              : "Sin definir"
          }
        />
        <ConfigRow label="Formato" value={torneo.roundTrip ? "Ida y vuelta" : "Solo ida"} />
        <ConfigRow label="Partidos por día" value={String(torneo.matchesPerDay)} />
        <ConfigRow label="Duración" value={`${torneo.matchDuration} min`} />
        <ConfigRow
          label="Días de juego"
          value={
            torneo.matchDays.length > 0
              ? torneo.matchDays.map((d) => DIAS[d]).join(", ")
              : "Sin definir"
          }
        />
      </Card>

      <Card>
        <SwitchRow
          label="Inscripciones abiertas"
          detail="Si las cierras, los capitanes ya no pueden registrar equipos ni jugadores"
          value={torneo.registrationOpen}
          onValueChange={toggleRegistro}
          disabled={savingRegistro}
        />
      </Card>

      <SectionLabel>GESTIÓN</SectionLabel>
      <Card>
        <MenuRow
          icon="people"
          label="Equipos"
          detail={`${torneo._count.teams} equipos registrados`}
          onPress={() => router.push(`/admin-equipos/${torneo.slug}`)}
        />
        <Divider />
        <MenuRow
          icon="calendar"
          label="Calendario"
          detail={
            torneo._count.rounds > 0
              ? `${torneo._count.rounds} jornadas`
              : "Sin calendario aún"
          }
          color="#60A5FA"
          onPress={() => router.push(`${base}/calendario`)}
        />
        <Divider />
        <MenuRow
          icon="football"
          label="Resultados"
          detail={`${torneo._count.matches} partidos`}
          color="#C084FC"
          onPress={() => router.push(`/admin/${torneo.slug}`)}
        />
        <Divider />
        <MenuRow
          icon="flag"
          label="Árbitros"
          detail="Registrar, asignar y ver evaluaciones"
          color={colors.gold}
          onPress={() => router.push(`${base}/arbitros`)}
        />
        <Divider />
        <MenuRow
          icon="cash"
          label="Finanzas"
          detail="Ingresos y egresos"
          color="#34D399"
          onPress={() => router.push(`${base}/finanzas`)}
        />
        <Divider />
        <MenuRow
          icon="color-palette"
          label="Flyer / Landing"
          detail={torneo.published ? "✓ Publicado" : "No publicado"}
          color="#F472B6"
          onPress={() => router.push(`${base}/landing`)}
        />
      </Card>

      <SectionLabel>MÁS</SectionLabel>
      <Card>
        <MenuRow
          icon="logo-whatsapp"
          label="Notificar calendario"
          detail="Enviar por WhatsApp a los capitanes"
          color={colors.win}
          onPress={notificar}
        />
        <Divider />
        <MenuRow
          icon="globe-outline"
          label="Ver sitio público"
          detail={`${torneo.slug}.marcagol.site`}
          color={colors.textSecondary}
          onPress={() => Linking.openURL(`https://${torneo.slug}.marcagol.site`)}
        />
        <Divider />
        <MenuRow
          icon="archive-outline"
          label={torneo.archived ? "Restaurar torneo" : "Archivar torneo"}
          color={colors.loss}
          onPress={archivar}
        />
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.configRow}>
      <Text style={styles.configLabel}>{label}</Text>
      <Text style={styles.configValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  name: { ...typography.title, color: colors.text },
  slug: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  stats: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  statLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  statValue: { ...typography.statLarge },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs + 2,
  },
  configLabel: { ...typography.body, color: colors.textMuted },
  configValue: { ...typography.bodyStrong, color: colors.text },
}));
