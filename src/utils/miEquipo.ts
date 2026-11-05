// src/utils/miEquipo.ts
//
// "Mi equipo": la liga, el torneo y el equipo que el usuario eligió en la
// bienvenida y, si es jugador, quién es en la plantilla. Se guarda solo
// en el teléfono (sin cuenta).
import * as SecureStore from "expo-secure-store";

export type RolAficionado = "aficionado" | "jugador";

export interface MiJugador {
  id: string;
  name: string;
  photo: string | null;
  number: number | null;
}

export interface MiEquipo {
  /** Falta en lo guardado antes de existir los roles: se toma como aficionado. */
  rol?: RolAficionado;
  /** Solo si rol === "jugador" */
  jugador?: MiJugador | null;
  orgSlug: string;
  orgName: string;
  tenantSlug: string;
  tenantName: string;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
}

const KEY = "marcagol_mi_equipo";
const VISTA_KEY = "marcagol_bienvenida_vista";

export async function leerMiEquipo(): Promise<MiEquipo | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v ? (JSON.parse(v) as MiEquipo) : null;
  } catch {
    return null;
  }
}

export async function guardarMiEquipo(eq: MiEquipo) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(eq)).catch(() => {});
  await marcarBienvenidaVista();
}

export async function borrarMiEquipo() {
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
}

export async function bienvenidaVista(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(VISTA_KEY)) === "1";
  } catch {
    return true; // si falla el almacenamiento, no insistir con la bienvenida
  }
}

export async function marcarBienvenidaVista() {
  await SecureStore.setItemAsync(VISTA_KEY, "1").catch(() => {});
}
