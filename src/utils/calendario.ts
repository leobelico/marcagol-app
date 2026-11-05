// src/utils/calendario.ts
//
// Helpers del calendario de admin. La lógica de tabla y de cruces de
// liguilla es la misma que usa CalendarioClient en la web.
import type { CalendarioAdminResponse, CalendarioMatch, CalendarioTeam } from "../types/api";

export const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
export const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const CANCHAS = [1, 2, 3] as const;

export const DIAS = [
  { value: "MONDAY", label: "Lun" },
  { value: "TUESDAY", label: "Mar" },
  { value: "WEDNESDAY", label: "Mié" },
  { value: "THURSDAY", label: "Jue" },
  { value: "FRIDAY", label: "Vie" },
  { value: "SATURDAY", label: "Sáb" },
  { value: "SUNDAY", label: "Dom" },
];

/** Fecha + hora capturadas en hora del centro de México → ISO (igual que la web). */
export function mexicoLocalToISO(fecha: string, hora: string) {
  return new Date(`${fecha}T${hora}:00-06:00`).toISOString();
}

/** Tabla general (sin liguilla ni descalificados) para sembrar la liguilla. */
export function calcularStandings(data: CalendarioAdminResponse) {
  const stats: Record<string, { team: CalendarioTeam; pts: number; gf: number; ga: number }> = {};
  data.teams
    .filter((t) => !t.disqualified)
    .forEach((t) => {
      stats[t.id] = { team: t, pts: 0, gf: 0, ga: 0 };
    });

  data.rounds
    .filter((r) => r.bracketStage == null)
    .forEach((r) =>
      r.matches.forEach((m) => {
        if (m.status !== "FINISHED") return;
        const hs = m.homeScore ?? 0;
        const as = m.awayScore ?? 0;
        if (stats[m.homeTeam.id]) {
          stats[m.homeTeam.id].gf += hs;
          stats[m.homeTeam.id].ga += as;
          stats[m.homeTeam.id].pts += hs > as ? 3 : hs === as ? 1 : 0;
        }
        if (stats[m.awayTeam.id]) {
          stats[m.awayTeam.id].gf += as;
          stats[m.awayTeam.id].ga += hs;
          stats[m.awayTeam.id].pts += as > hs ? 3 : hs === as ? 1 : 0;
        }
      })
    );

  return Object.values(stats).sort(
    (a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf
  );
}

/** 1° vs último, 2° vs penúltimo, etc. */
export function emparejar(equipos: CalendarioTeam[]) {
  const pares: { home: CalendarioTeam; away: CalendarioTeam }[] = [];
  const mitad = Math.floor(equipos.length / 2);
  for (let i = 0; i < mitad; i++) {
    pares.push({ home: equipos[i], away: equipos[equipos.length - 1 - i] });
  }
  return pares;
}

export function nombreFase(numPartidos: number) {
  if (numPartidos === 1) return "Final";
  if (numPartidos === 2) return "Semifinal";
  if (numPartidos === 4) return "Cuartos de Final";
  return `Ronda de ${numPartidos * 2}`;
}

/** Última fase de liguilla creada (la de mayor bracketStage). */
export function ultimaFaseBracket(data: CalendarioAdminResponse) {
  const fases = data.rounds.filter((r) => r.bracketStage != null);
  if (fases.length === 0) return null;
  return fases.reduce((a, b) => ((a.bracketStage ?? 0) > (b.bracketStage ?? 0) ? a : b));
}

export function ganador(m: CalendarioMatch, desempate?: string) {
  const hs = m.homeScore ?? 0;
  const as = m.awayScore ?? 0;
  if (hs === as) return desempate === m.awayTeam.id ? m.awayTeam : m.homeTeam;
  return hs > as ? m.homeTeam : m.awayTeam;
}
