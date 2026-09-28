// Elemental types and the effectiveness chart.
// Follows the classic handheld chart (Gen 2 values) for the 11 types we use (anything not listed is 1×).

export type TypeId = "normal" | "fire" | "water" | "grass" | "electric" | "flying" | "bug" | "rock" | "dark" | "poison" | "ground";

export interface L {
  en: string;
  pt: string;
}

export const TYPES: Record<TypeId, { name: L; color: string }> = {
  normal: { name: { en: "Normal", pt: "Normal" }, color: "#a8a77a" },
  fire: { name: { en: "Fire", pt: "Fogo" }, color: "#ee8130" },
  water: { name: { en: "Water", pt: "Água" }, color: "#6390f0" },
  grass: { name: { en: "Grass", pt: "Planta" }, color: "#7ac74c" },
  electric: { name: { en: "Electric", pt: "Elétrico" }, color: "#f7c52c" },
  flying: { name: { en: "Flying", pt: "Voador" }, color: "#a98ff3" },
  bug: { name: { en: "Bug", pt: "Inseto" }, color: "#a6b91a" },
  rock: { name: { en: "Rock", pt: "Pedra" }, color: "#b6a136" },
  dark: { name: { en: "Dark", pt: "Sombrio" }, color: "#705746" },
  poison: { name: { en: "Poison", pt: "Veneno" }, color: "#a33ea1" },
  ground: { name: { en: "Ground", pt: "Terra" }, color: "#e2bf65" },
};

// attacker → defender → multiplier
const CHART: Partial<Record<TypeId, Partial<Record<TypeId, number>>>> = {
  normal: { rock: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, bug: 2, rock: 0.5 },
  water: { fire: 2, water: 0.5, grass: 0.5, rock: 2, ground: 2 },
  grass: { fire: 0.5, water: 2, grass: 0.5, flying: 0.5, bug: 0.5, rock: 2, poison: 0.5, ground: 2 },
  electric: { water: 2, grass: 0.5, electric: 0.5, flying: 2, ground: 0 },
  flying: { grass: 2, electric: 0.5, bug: 2, rock: 0.5 },
  bug: { fire: 0.5, grass: 2, flying: 0.5, dark: 2, poison: 0.5 },
  rock: { fire: 2, flying: 2, bug: 2, ground: 0.5 },
  dark: { dark: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2 },
};

export function effectiveness(atk: TypeId, def: TypeId[]): number {
  let m = 1;
  for (const d of def) m *= CHART[atk]?.[d] ?? 1;
  return m;
}
