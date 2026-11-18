import { createContext, useContext, useState, type ReactNode } from "react";
import { useApi } from "../lib/api";
import type { City } from "../lib/types";

interface CityState {
  cities: City[];
  city: City | null;
  setCitySlug: (slug: string) => void;
}

const CityContext = createContext<CityState | null>(null);
const KEY = "flixbooking_city";

export function CityProvider({ children }: { children: ReactNode }) {
  const { data } = useApi<City[]>("/cities");
  const [slug, setSlug] = useState(() => localStorage.getItem(KEY) ?? "mumbai");
  const cities = data ?? [];
  const city = cities.find((c) => c.slug === slug) ?? cities[0] ?? null;

  const setCitySlug = (s: string) => {
    localStorage.setItem(KEY, s);
    setSlug(s);
  };

  return <CityContext.Provider value={{ cities, city, setCitySlug }}>{children}</CityContext.Provider>;
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used inside <CityProvider>");
  return ctx;
}
