// src/types/api.ts
//
// Tipos basados en las respuestas REALES de los endpoints públicos
// de marcagol.site (confirmados en producción).

export interface OrganizationStats {
  torneos: number;
  equipos: number;
  partidos: number;
  goles: number;
  enVivo: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  /** Lo manda el servidor desde la versión con tarjetas; puede faltar. */
  stats?: OrganizationStats;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  bannerUrl: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface Team {
  id: string;
  name: string;
  logo: string | null;
}

export interface StandingRow {
  team: Team;
  pts: number;
  pj: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  dif: number;
}

export interface GoleadorRow {
  id: string;
  name: string;
  photo: string | null;
  team: { id: string; name: string };
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED";

export interface Match {
  id: string;
  date: string; // ISO string
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  cancha: number | null;
  homeTeam: Team;
  awayTeam: Team;
  referee: { name: string } | null;
}

export interface Membership {
  tenantId: string;
  tenantName: string;
  role: "ADMIN" | "CAPTAIN" | "VIEWER" | "SUPER_ADMIN";
  teamIds: string[];
}

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  isSuperAdmin: boolean;
  role: string | null;
  memberships?: Membership[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export interface AdminMisTorneosResponse {
  tenants: AdminTenant[];
}

export interface AdminMatch {
  id: string;
  date: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string; logo: string | null };
  awayTeam: { id: string; name: string; logo: string | null };
}

export interface AdminPartidosResponse {
  tenant: { id: string; name: string };
  matches: AdminMatch[];
}

export interface UpdateMatchResponse {
  match: AdminMatch;
}

export interface AdminTeam {
  id: string;
  name: string;
  logo: string | null;
  captain?: string | null;
  phone?: string | null;
  disqualified?: boolean;
  allowLateRegistration?: boolean;
  playerCount: number;
}

export interface Capitan {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  equipos: { teamId: string; teamName: string; tenantName: string }[];
}

export interface CapitanesResponse {
  capitanes: Capitan[];
}

export interface CaptainCredentials {
  name: string | null;
  email: string | null;
  phone: string | null;
  password: string;
}

export interface AdminEquiposResponse {
  tenant: { id: string; name: string; registrationOpen?: boolean };
  teams: AdminTeam[];
}

export interface AdminPlayer {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  photo: string | null;
  ineUrl?: string | null;
  documentoOficialUrl?: string | null;
  goals: number;
}

export interface AdminJugadoresResponse {
  team: { id: string; name: string; tenantId?: string };
  players: AdminPlayer[];
}

export interface AdminPlayerResponse {
  player: AdminPlayer;
}

export interface TeamMatch {
  id: string;
  date: string;
  isHome: boolean;
  teamScore: number | null;
  opponentScore: number | null;
  opponent: { id: string; name: string };
}

export interface TeamDetailPlayer {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  photo: string | null;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

export interface TeamDetailResponse {
  team: { id: string; name: string; logo: string | null };
  stats: { w: number; d: number; l: number; gf: number; ga: number };
  players: TeamDetailPlayer[];
  matches: TeamMatch[];
}

export interface AdminTeamResponse {
  team: {
    id: string;
    name: string;
    logo: string | null;
    captain?: string | null;
    phone?: string | null;
    playerCount?: number;
  };
  captainCredentials?: CaptainCredentials;
}

export type EventType = "GOAL" | "YELLOW_CARD" | "RED_CARD" | "ASSIST";

export interface MatchPlayer {
  id: string;
  name: string;
  number: number | null;
}

export interface MatchPlayersResponse {
  homeTeam: { id: string; name: string; players: MatchPlayer[] };
  awayTeam: { id: string; name: string; players: MatchPlayer[] };
}

export interface MatchEventRow {
  id: string;
  type: EventType;
  minute: number;
  player: { id: string; name: string };
}

export interface MatchEventsResponse {
  events: MatchEventRow[];
}

export interface PlayerMatchEvent {
  type: EventType;
  minute: number;
}

export interface PlayerMatch {
  id: string;
  date: string;
  homeScore: number | null;
  awayScore: number | null;
  isHome: boolean;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  events: PlayerMatchEvent[];
}

export interface PlayerMatchesResponse {
  matches: PlayerMatch[];
}

// ---- Respuestas de cada endpoint ----

export interface OrganizationsResponse {
  organizations: Organization[];
}

export interface OrganizationTenantsResponse {
  organization: { id: string; name: string };
  tenants: Tenant[];
}

export interface StandingsResponse {
  tenant: { id: string; name: string };
  standings: StandingRow[];
}

export interface GoleadoresResponse {
  tenant: { id: string; name: string };
  players: GoleadorRow[];
}

export interface CalendarioResponse {
  tenant: { id: string; name: string };
  matches: Match[];
}

// ---- Gestión del torneo (endpoints /api/admin compartidos con la web) ----

export type MatchDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface LandingData {
  published: boolean;
  description: string | null;
  endDate: string | null;
  maxTeams: number | null;
  inscriptionFee: number | null;
  bannerUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
}

export interface TorneoAdmin extends LandingData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  startDate: string | null;
  matchDays: MatchDay[];
  matchDuration: number;
  matchesPerDay: number;
  roundTrip: boolean;
  archived: boolean;
  registrationOpen: boolean;
  _count: { teams: number; matches: number; rounds: number };
}

export interface TorneoAdminResponse {
  torneo: TorneoAdmin;
}

export interface CalendarioTeam {
  id: string;
  name: string;
  logo: string | null;
}

export interface CalendarioMatch {
  id: string;
  date: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  cancha: number | null;
  roundId: string | null;
  bracketOrder: number | null;
  homeTeam: CalendarioTeam;
  awayTeam: CalendarioTeam;
  referee: { id: string; name: string } | null;
}

export interface CalendarioRound {
  id: string;
  number: number;
  name: string | null;
  bracketLabel: string | null;
  bracketStage: number | null;
  matches: CalendarioMatch[];
}

export interface CalendarioAdminResponse {
  rounds: CalendarioRound[];
  teams: (CalendarioTeam & { disqualified: boolean })[];
  referees: { id: string; name: string }[];
}

export interface Referee {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  payPerMatch: number;
  matches: {
    id: string;
    date: string;
    status: MatchStatus;
    homeTeam: { id: string; name: string };
    awayTeam: { id: string; name: string };
  }[];
}

export interface RefereesResponse {
  referees: Referee[];
}

export interface RefereeRanking {
  refereeId: string;
  nombre: string;
  respuestas: number;
  partidos: number;
  partidosEvaluados: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  general: number;
  comentarios: { matchId: string; texto: string }[];
}

export type FinanceType = "INCOME" | "EXPENSE";

export type FinanceCategory =
  | "CUOTA_EQUIPO"
  | "PAGO_ARBITRO"
  | "GASTO_CANCHA"
  | "GASTO_TROFEOS"
  | "GASTO_GENERAL"
  | "PREMIO"
  | "OTRO";

export interface Finance {
  id: string;
  type: FinanceType;
  category: FinanceCategory;
  amount: number;
  description: string | null;
  date: string;
  team: { id: string; name: string } | null;
}

export interface FinanzasResponse {
  finances: Finance[];
  teams: { id: string; name: string }[];
}

export interface NuevoTorneo {
  name: string;
  slug: string;
  startDate: string | null; // YYYY-MM-DD
  matchesPerDay: number;
  matchDuration: number;
  roundTrip: boolean;
  matchDays: MatchDay[];
}

export interface SubAdmin {
  user: { id: string; name: string | null; email: string | null };
  tenant: { id: string; name: string };
}

export interface SubAdminsResponse {
  subAdmins: SubAdmin[];
  torneos: { id: string; name: string }[];
}

export type TipoDocumento = "ine" | "documentoOficial";

// ---- Portal del capitán ----

export interface CapitanJugador {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  photo: string | null;
  ineUrl: string | null;
  documentoOficialUrl: string | null;
  suspendedUntil: number | null;
  /** true si la suspensión sigue vigente (alcanza la jornada actual) */
  suspendido?: boolean;
}

export interface CapitanEquipo {
  id: string;
  name: string;
  logo: string | null;
  disqualified: boolean;
  allowLateRegistration: boolean;
  players: CapitanJugador[];
}

export interface CapitanLiga {
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    registrationOpen: boolean;
  };
  teams: CapitanEquipo[];
}

export interface CapitanResponse {
  ligas: CapitanLiga[];
}
