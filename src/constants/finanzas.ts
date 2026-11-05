// src/constants/finanzas.ts
// Mismas categorías que FinanzasClient de la web.
import type { FinanceCategory, FinanceType } from "../types/api";

export const CATEGORIAS: {
  value: FinanceCategory;
  label: string;
  icon: string;
  type: FinanceType;
}[] = [
  { value: "CUOTA_EQUIPO", label: "Cuota de equipo", icon: "👥", type: "INCOME" },
  { value: "PREMIO", label: "Premio", icon: "🏆", type: "EXPENSE" },
  { value: "PAGO_ARBITRO", label: "Pago árbitro", icon: "🟨", type: "EXPENSE" },
  { value: "GASTO_CANCHA", label: "Renta de cancha", icon: "🏟️", type: "EXPENSE" },
  { value: "GASTO_TROFEOS", label: "Trofeos/medallas", icon: "🥇", type: "EXPENSE" },
  { value: "GASTO_GENERAL", label: "Gasto general", icon: "📦", type: "EXPENSE" },
  { value: "OTRO", label: "Otro", icon: "💰", type: "INCOME" },
];

export const categoria = (value: FinanceCategory) =>
  CATEGORIAS.find((c) => c.value === value) ?? CATEGORIAS[CATEGORIAS.length - 1];
