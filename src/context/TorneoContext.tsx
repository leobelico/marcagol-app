// src/context/TorneoContext.tsx
import { createContext, useContext } from "react";

export const TorneoContext = createContext<{ slug: string }>({ slug: "" });

export function useTorneoSlug() {
  return useContext(TorneoContext).slug;
}
