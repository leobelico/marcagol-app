// src/api/client.ts
//
// Cliente único para hablar con los endpoints públicos de marcagol.site.
// Cambia BASE_URL aquí si en algún momento apuntas a otro ambiente
// (ej. localhost durante desarrollo con tu backend corriendo local).

import type {
  OrganizationsResponse,
  OrganizationTenantsResponse,
  StandingsResponse,
  GoleadoresResponse,
  CalendarioResponse,
  LoginResponse,
  MeResponse,
  AdminMisTorneosResponse,
  AdminPartidosResponse,
  UpdateMatchResponse,
  AdminEquiposResponse,
  AdminJugadoresResponse,
  AdminPlayerResponse,
  TeamDetailResponse,
  AdminTeamResponse,
  CapitanesResponse,
  MatchPlayersResponse,
  MatchEventsResponse,
  PlayerMatchesResponse,
  EventType,
  TorneoAdminResponse,
  LandingData,
  CalendarioAdminResponse,
  RefereesResponse,
  RefereeRanking,
  FinanzasResponse,
  FinanceType,
  FinanceCategory,
  NuevoTorneo,
  SubAdminsResponse,
  CapitanesResponse as CapitanesListResponse,
  CaptainCredentials,
  TipoDocumento,
  CapitanResponse,
} from "../types/api";

const BASE_URL = "https://marcagol.site/api/public";
// Endpoints de administración que comparte con la web (aceptan el
// mismo token Bearer que los de /api/public/admin).
const ADMIN_URL = "https://marcagol.site/api/admin";

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchJson<T>(
  path: string,
  options?: RequestInit,
  baseUrl: string = BASE_URL
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, options);

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // respuesta no era JSON, nos quedamos con el mensaje genérico
    }
    throw new ApiError(message, res.status);
  }

  return res.json();
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Sube una imagen (multipart) a un endpoint de /api/admin.
async function adminUpload<T>(
  token: string,
  path: string,
  field: string,
  imageUri: string,
  extra?: Record<string, string>
): Promise<T> {
  const formData = new FormData();
  // @ts-expect-error React Native's FormData accepts this shape for file uploads
  formData.append(field, { uri: imageUri, name: `${field}.jpg`, type: "image/jpeg" });
  Object.entries(extra ?? {}).forEach(([k, v]) => formData.append(k, v));

  const res = await fetch(`${ADMIN_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // no-op
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

function adminFetch<T = unknown>(
  token: string,
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown
): Promise<T> {
  return fetchJson<T>(
    path,
    {
      method,
      headers: authHeaders(token),
      ...(body !== undefined && { body: JSON.stringify(body) }),
    },
    ADMIN_URL
  );
}

export const api = {
  getOrganizations: () => fetchJson<OrganizationsResponse>("/organizations"),

  getOrganizationTenants: (orgSlug: string) =>
    fetchJson<OrganizationTenantsResponse>(`/tenant/${orgSlug}`),

  getStandings: (tenantSlug: string) =>
    fetchJson<StandingsResponse>(`/tenant/${tenantSlug}/standings`),

  getGoleadores: (tenantSlug: string) =>
    fetchJson<GoleadoresResponse>(`/tenant/${tenantSlug}/goleadores`),

  getCalendario: (tenantSlug: string) =>
    fetchJson<CalendarioResponse>(`/tenant/${tenantSlug}/calendario`),

  login: (identifier: string, password: string) =>
    fetchJson<LoginResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    }),

  me: (token: string) =>
    fetchJson<MeResponse>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  // ---- Admin (requieren token) ----

  getMisTorneos: (token: string) =>
    fetchJson<AdminMisTorneosResponse>("/admin/mis-torneos", {
      headers: authHeaders(token),
    }),

  getPartidosAdmin: (token: string, tenantSlug: string) =>
    fetchJson<AdminPartidosResponse>(`/admin/tenant/${tenantSlug}/partidos`, {
      headers: authHeaders(token),
    }),

  updateMatchResult: (
    token: string,
    matchId: string,
    data: { homeScore: number; awayScore: number; status?: string }
  ) =>
    fetchJson<UpdateMatchResponse>(`/admin/partidos/${matchId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  getMatchPlayers: (token: string, matchId: string) =>
    fetchJson<MatchPlayersResponse>(`/admin/partido/${matchId}/jugadores`, {
      headers: authHeaders(token),
    }),

  getMatchEvents: (token: string, matchId: string) =>
    fetchJson<MatchEventsResponse>(`/admin/partido/${matchId}/eventos`, {
      headers: authHeaders(token),
    }),

  addMatchEvent: (
    token: string,
    matchId: string,
    data: { playerId: string; type: EventType; minute?: number; suspensionGames?: number }
  ) =>
    fetchJson(`/admin/partido/${matchId}/eventos`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  deleteEvent: (token: string, eventId: string) =>
    fetchJson<{ success: boolean }>(`/admin/evento/${eventId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),

  getPlayerMatches: (playerId: string) =>
    fetchJson<PlayerMatchesResponse>(`/jugador/${playerId}/partidos`),

  getTeamDetail: (teamId: string) =>
    fetchJson<TeamDetailResponse>(`/equipo/${teamId}`),

  getEquiposAdmin: (token: string, tenantSlug: string) =>
    fetchJson<AdminEquiposResponse>(`/admin/tenant/${tenantSlug}/equipos`, {
      headers: authHeaders(token),
    }),

  searchCapitanes: (token: string, query: string) =>
    fetchJson<CapitanesResponse>(
      `/admin/capitanes?q=${encodeURIComponent(query)}`,
      { headers: authHeaders(token) }
    ),

  createEquipo: (
    token: string,
    tenantSlug: string,
    data:
      | { name: string; captain: string; phone: string }
      | { name: string; capitanUserId: string }
  ) =>
    fetchJson<AdminTeamResponse>(`/admin/tenant/${tenantSlug}/equipos`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  updateEquipo: (
    token: string,
    teamId: string,
    data: { name: string; capitanUserId?: string }
  ) =>
    fetchJson<AdminTeamResponse>(`/admin/equipo/${teamId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  uploadEquipoLogo: async (token: string, teamId: string, imageUri: string) => {
    const formData = new FormData();
    // @ts-expect-error React Native's FormData accepts this shape for file uploads
    formData.append("logo", {
      uri: imageUri,
      name: "logo.jpg",
      type: "image/jpeg",
    });

    const res = await fetch(`${BASE_URL}/admin/equipo/${teamId}/logo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      let message = `Error ${res.status}`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        // no-op
      }
      throw new ApiError(message, res.status);
    }

    return res.json() as Promise<AdminTeamResponse>;
  },

  getJugadoresAdmin: (token: string, teamId: string) =>
    fetchJson<AdminJugadoresResponse>(`/admin/equipo/${teamId}/jugadores`, {
      headers: authHeaders(token),
    }),

  createJugador: (
    token: string,
    teamId: string,
    data: { name: string; number?: number | null; position?: string | null }
  ) =>
    fetchJson<AdminPlayerResponse>(`/admin/equipo/${teamId}/jugadores`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  updateJugador: (
    token: string,
    playerId: string,
    data: { name?: string; number?: number | null; position?: string | null }
  ) =>
    fetchJson<AdminPlayerResponse>(`/admin/jugador/${playerId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }),

  deleteJugador: (token: string, playerId: string) =>
    fetchJson<{ success: boolean }>(`/admin/jugador/${playerId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    }),

  // ---- Gestión del torneo (mismos endpoints que usa la web) ----

  getTorneoAdmin: (token: string, tenantId: string) =>
    adminFetch<TorneoAdminResponse>(token, `/torneos/${tenantId}`),

  setRegistroAbierto: (token: string, tenantId: string, registrationOpen: boolean) =>
    adminFetch<{ registrationOpen: boolean }>(
      token,
      `/torneos/${tenantId}/registro`,
      "PATCH",
      { registrationOpen }
    ),

  setArchivado: (token: string, tenantId: string, archived: boolean) =>
    adminFetch(token, "/torneos", "PATCH", { id: tenantId, archived }),

  updateLanding: (token: string, tenantId: string, data: LandingData) =>
    adminFetch(token, `/torneos/${tenantId}/landing`, "PATCH", data),

  notificarCalendario: (token: string, tenantId: string) =>
    adminFetch<{ ok: boolean; resultados: unknown[] }>(
      token,
      `/torneos/${tenantId}/notificar`,
      "POST",
      { tipo: "calendario" }
    ),

  // Equipos
  setDescalificado: (
    token: string,
    tenantId: string,
    teamId: string,
    disqualified: boolean
  ) =>
    adminFetch(token, `/torneos/${tenantId}/equipos/${teamId}/descalificar`, "PATCH", {
      disqualified,
    }),

  setPermitirTardio: (
    token: string,
    tenantId: string,
    teamId: string,
    allowLateRegistration: boolean
  ) =>
    adminFetch<{ allowLateRegistration: boolean }>(
      token,
      `/torneos/${tenantId}/equipos/${teamId}/permitir-tardio`,
      "PATCH",
      { allowLateRegistration }
    ),

  // Calendario
  getCalendarioAdmin: (token: string, tenantId: string) =>
    adminFetch<CalendarioAdminResponse>(token, `/torneos/${tenantId}/calendario`),

  deletePartido: (token: string, tenantId: string, matchId: string) =>
    adminFetch(token, `/torneos/${tenantId}/calendario/${matchId}`, "DELETE"),

  moverPartido: (token: string, tenantId: string, matchId: string, targetRoundId: string) =>
    adminFetch(token, `/torneos/${tenantId}/calendario/${matchId}`, "PATCH", {
      targetRoundId,
    }),

  generarCalendario: (
    token: string,
    tenantId: string,
    data: { horaInicio: string; preferencias: { teamId: string; day: string }[] }
  ) =>
    adminFetch<{
      ok: boolean;
      rounds: number;
      conflictos: { homeTeam: string; awayTeam: string; motivo: string }[];
    }>(token, `/torneos/${tenantId}/calendario/generar`, "POST", data),

  eliminarCalendario: (token: string, tenantId: string) =>
    adminFetch(token, `/torneos/${tenantId}/calendario/generar`, "DELETE"),

  // Si los equipos ya se enfrentaron responde 409: vuelve a llamar con
  // confirmarRepetido: true si el usuario confirma.
  crearPartidoManual: (
    token: string,
    tenantId: string,
    data: {
      homeTeamId: string;
      awayTeamId: string;
      date: string; // ISO
      cancha: number;
      roundId: string | null;
      confirmarRepetido?: boolean;
    }
  ) => adminFetch(token, `/torneos/${tenantId}/calendario/manual`, "POST", data),

  crearFaseBracket: (
    token: string,
    tenantId: string,
    data: {
      bracketLabel: string;
      pares: {
        homeTeamId: string;
        awayTeamId: string;
        fecha: string; // YYYY-MM-DD
        hora: string; // HH:MM
        cancha: number;
      }[];
    }
  ) => adminFetch(token, `/torneos/${tenantId}/calendario/bracket`, "POST", data),

  // Árbitros
  getArbitros: (token: string, tenantId: string) =>
    adminFetch<RefereesResponse>(token, `/torneos/${tenantId}/arbitros`),

  createArbitro: (
    token: string,
    tenantId: string,
    data: {
      name: string;
      phone?: string;
      email?: string;
      payPerMatch?: number;
      notes?: string;
    }
  ) => adminFetch(token, `/torneos/${tenantId}/arbitros`, "POST", data),

  deleteArbitro: (token: string, tenantId: string, refereeId: string) =>
    adminFetch(token, `/torneos/${tenantId}/arbitros/${refereeId}`, "DELETE"),

  asignarArbitro: (token: string, matchId: string, refereeId: string | null) =>
    adminFetch(token, `/partidos/${matchId}/arbitro`, "PATCH", { refereeId }),

  getRankingArbitros: (token: string, tenantId: string) =>
    adminFetch<{ ranking: RefereeRanking[] }>(
      token,
      `/torneos/${tenantId}/arbitros/ranking`
    ),

  // Finanzas
  getFinanzas: (token: string, tenantId: string) =>
    adminFetch<FinanzasResponse>(token, `/torneos/${tenantId}/finanzas`),

  createMovimiento: (
    token: string,
    tenantId: string,
    data: {
      type: FinanceType;
      category: FinanceCategory;
      amount: number;
      description?: string;
      teamId?: string;
      date: string; // YYYY-MM-DD
    }
  ) => adminFetch(token, `/torneos/${tenantId}/finanzas`, "POST", data),

  deleteMovimiento: (token: string, tenantId: string, financeId: string) =>
    adminFetch(token, `/torneos/${tenantId}/finanzas/${financeId}`, "DELETE"),

  // Torneos
  crearTorneo: (token: string, data: NuevoTorneo) =>
    adminFetch<{ id: string; slug: string }>(token, "/torneos", "POST", data),

  uploadTorneoLogo: (token: string, tenantId: string, imageUri: string) =>
    adminUpload<{ url: string }>(token, `/torneos/${tenantId}/logo`, "file", imageUri),

  // Portal del capitán (estas rutas también las puede usar un admin)
  getMisEquipos: (token: string) => adminFetch<CapitanResponse>(token, "/capitan"),

  crearJugadorEquipo: (
    token: string,
    tenantId: string,
    teamId: string,
    data: { name: string; number: number | null; position: string | null }
  ) =>
    adminFetch<{ id: string }>(
      token,
      `/torneos/${tenantId}/equipos/${teamId}/jugadores`,
      "POST",
      data
    ),

  updateJugadorEquipo: (
    token: string,
    tenantId: string,
    teamId: string,
    playerId: string,
    data: { name: string; number: number | null; position: string | null }
  ) =>
    adminFetch(
      token,
      `/torneos/${tenantId}/equipos/${teamId}/jugadores/${playerId}`,
      "PATCH",
      data
    ),

  deleteJugadorEquipo: (token: string, tenantId: string, teamId: string, playerId: string) =>
    adminFetch(token, `/torneos/${tenantId}/equipos/${teamId}/jugadores/${playerId}`, "DELETE"),

  uploadLogoEquipo: (token: string, tenantId: string, teamId: string, imageUri: string) =>
    adminUpload<{ logo: string }>(
      token,
      `/torneos/${tenantId}/equipos/${teamId}/logo`,
      "logo",
      imageUri
    ),

  // Jugadores: foto e identificaciones
  uploadFotoJugador: (
    token: string,
    tenantId: string,
    teamId: string,
    playerId: string,
    imageUri: string
  ) =>
    adminUpload<{ photo: string }>(
      token,
      `/torneos/${tenantId}/equipos/${teamId}/jugadores/${playerId}/foto`,
      "foto",
      imageUri
    ),

  uploadDocumentoJugador: (
    token: string,
    tenantId: string,
    teamId: string,
    playerId: string,
    tipo: TipoDocumento,
    imageUri: string
  ) =>
    adminUpload<{ tipo: TipoDocumento; url: string }>(
      token,
      `/torneos/${tenantId}/equipos/${teamId}/jugadores/${playerId}/documento`,
      "documento",
      imageUri,
      { tipo }
    ),

  // Super admin
  getSubAdmins: (token: string) => adminFetch<SubAdminsResponse>(token, "/subadmins"),

  createSubAdmin: (
    token: string,
    data: { name: string; email: string; password: string; tenantId: string }
  ) => adminFetch(token, "/subadmins", "POST", data),

  deleteSubAdmin: (token: string, userId: string, tenantId: string) =>
    adminFetch(token, "/subadmins", "DELETE", { userId, tenantId }),

  getTodosCapitanes: (token: string) =>
    adminFetch<CapitanesListResponse>(token, "/capitanes"),

  // Sin password: genera nombre + últimos 3 dígitos del teléfono
  resetPasswordCapitan: (token: string, userId: string, password?: string) =>
    adminFetch<{ ok: boolean; credentials: CaptainCredentials }>(
      token,
      `/capitanes/${userId}`,
      "POST",
      password ? { password } : {}
    ),
};

export { ApiError };
