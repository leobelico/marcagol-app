// app/capitan/index.tsx
//
// Portal del capitán (equivalente a /capitan en la web): sus ligas y
// equipos, logo del equipo y plantilla con foto e identificaciones.
import { useCallback, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api, ApiError } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { CapitanJugador, CapitanLiga } from "../../src/types/api";
import { LoadingState, ErrorState, EmptyState } from "../../src/components/AsyncState";
import { ImageUpload } from "../../src/components/ImageUpload";
import { Chips, SectionLabel } from "../../src/components/ui";
import { radius, spacing, typography } from "../../src/theme/tokens";
import { makeStyles, useTheme } from "../../src/theme/ThemeContext";

export default function CapitanScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const [ligas, setLigas] = useState<CapitanLiga[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ligaId, setLigaId] = useState<string | null>(null);
  const [equipoId, setEquipoId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      api
        .getMisEquipos(token)
        .then((res) => setLigas(res.ligas))
        .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar"));
    }, [token])
  );

  if (error) return <ErrorState message={error} />;
  if (!ligas) return <LoadingState label="Cargando tu equipo..." />;
  if (ligas.length === 0) {
    return <EmptyState message="No eres capitán de ningún equipo." />;
  }

  const liga = ligas.find((l) => l.tenant.id === ligaId) ?? ligas[0];
  const equipo = liga.teams.find((t) => t.id === equipoId) ?? liga.teams[0];
  const tenant = liga.tenant;
  const inscripcionesAbiertas = tenant.registrationOpen || equipo.allowLateRegistration;

  function abrirJugador(p?: CapitanJugador) {
    const query = new URLSearchParams({
      tenantId: tenant.id,
      teamId: equipo.id,
      ...(p && {
        playerId: p.id,
        name: p.name,
        number: p.number != null ? String(p.number) : "",
        position: p.position ?? "",
        photo: p.photo ?? "",
        ineUrl: p.ineUrl ?? "",
        documentoOficialUrl: p.documentoOficialUrl ?? "",
      }),
    }).toString();
    router.push(`/capitan/jugador?${query}`);
  }

  const header = (
    <View>
      {ligas.length > 1 && (
        <>
          <SectionLabel>TUS LIGAS</SectionLabel>
          <Chips
            options={ligas.map((l) => ({ value: l.tenant.id, label: l.tenant.name }))}
            value={tenant.id}
            onChange={(id) => {
              setLigaId(id);
              setEquipoId(null);
            }}
          />
        </>
      )}
      {liga.teams.length > 1 && (
        <>
          <SectionLabel>TUS EQUIPOS EN {tenant.name.toUpperCase()}</SectionLabel>
          <Chips
            options={liga.teams.map((t) => ({ value: t.id, label: t.name }))}
            value={equipo.id}
            onChange={setEquipoId}
          />
        </>
      )}

      <View style={styles.teamCard}>
        <View style={{ width: 96 }}>
          {token && (
            <ImageUpload
              key={equipo.id}
              label="Logo"
              uri={equipo.logo}
              upload={async (uri) =>
                (await api.uploadLogoEquipo(token, tenant.id, equipo.id, uri)).logo
              }
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.teamName}>{equipo.name}</Text>
          <Text style={styles.tenantName}>{tenant.name}</Text>
          <Text style={styles.count}>
            {equipo.players.length} jugador{equipo.players.length !== 1 ? "es" : ""}
          </Text>
        </View>
      </View>

      {equipo.disqualified && (
        <View style={[styles.banner, { borderColor: colors.loss }]}>
          <Text style={[styles.bannerText, { color: colors.loss }]}>
            Este equipo fue descalificado del torneo.
          </Text>
        </View>
      )}
      {!inscripcionesAbiertas && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            🔒 Las inscripciones están cerradas. Ya no puedes agregar jugadores; habla con el
            organizador si necesitas un cambio.
          </Text>
        </View>
      )}

      <SectionLabel>PLANTILLA</SectionLabel>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={equipo.players}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no hay jugadores. Agrega el primero con el botón +.</Text>
        }
        renderItem={({ item: p }) => (
          <Pressable
            style={({ pressed }) => [styles.player, pressed && { opacity: 0.7 }]}
            onPress={() => abrirJugador(p)}
          >
            {p.photo ? (
              <Image source={{ uri: p.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Text>👤</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.playerName} numberOfLines={1}>
                {p.number != null ? `#${p.number} ` : ""}
                {p.name}
              </Text>
              <View style={styles.badges}>
                <Badge ok={!!p.photo} label="Foto" />
                <Badge ok={!!p.ineUrl} label="INE" />
                {(p.suspendido ?? p.suspendedUntil != null) && (
                  <Text style={styles.suspended}>
                    Suspendido hasta J{p.suspendedUntil}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />

      {inscripcionesAbiertas && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
          onPress={() => abrirJugador()}
        >
          <Ionicons name="add" size={26} color={colors.onAccent} />
        </Pressable>
      )}
    </View>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Text style={[styles.badge, { color: ok ? colors.win : colors.textMuted }]}>
      {ok ? "✓" : "✗"} {label}
    </Text>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.sm },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  teamName: { ...typography.title, color: colors.text },
  tenantName: { ...typography.caption, color: colors.accent, marginTop: 2 },
  count: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  banner: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: { ...typography.body, color: colors.gold },
  empty: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  avatar: { width: 40, height: 40, borderRadius: radius.full },
  avatarEmpty: {
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  playerName: { ...typography.bodyStrong, color: colors.text },
  badges: { flexDirection: "row", gap: spacing.md, marginTop: 3, flexWrap: "wrap" },
  badge: { ...typography.caption },
  suspended: { ...typography.caption, color: colors.loss },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
}));
