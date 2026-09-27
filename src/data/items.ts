import type { L } from "./types";
import type { Status } from "./moves";

export type ItemId =
  | "amuleto" | "superamuleto"
  | "pocao" | "superpocao"
  | "antidoto" | "pomada" | "desparalisante" | "despertador" | "curatotal"
  | "reviver";

export interface Item {
  name: L;
  desc: L;
  price: number;
  pocket: "items" | "amulets";
  heal?: number; // HP restored (9999 = full)
  cures?: Status[] | "all";
  revive?: boolean;
  ball?: number; // catch multiplier
}

export const ITEMS: Record<ItemId, Item> = {
  amuleto: { name: { en: "Amulet", pt: "Amuleto" }, desc: { en: "A charm for catching wild creatures.", pt: "Um amuleto para capturar criaturas selvagens." }, price: 200, pocket: "amulets", ball: 1 },
  superamuleto: { name: { en: "Great Amulet", pt: "Super Amuleto" }, desc: { en: "A stronger charm with a better catch rate.", pt: "Um amuleto mais forte, com mais chance de captura." }, price: 600, pocket: "amulets", ball: 1.5 },
  pocao: { name: { en: "Potion", pt: "Poção" }, desc: { en: "Restores 20 HP.", pt: "Restaura 20 PV." }, price: 300, pocket: "items", heal: 20 },
  superpocao: { name: { en: "Super Potion", pt: "Super Poção" }, desc: { en: "Restores 50 HP.", pt: "Restaura 50 PV." }, price: 700, pocket: "items", heal: 50 },
  antidoto: { name: { en: "Antidote", pt: "Antídoto" }, desc: { en: "Cures poison.", pt: "Cura envenenamento." }, price: 100, pocket: "items", cures: ["psn"] },
  pomada: { name: { en: "Burn Salve", pt: "Pomada" }, desc: { en: "Heals a burn.", pt: "Cura queimaduras." }, price: 250, pocket: "items", cures: ["brn"] },
  desparalisante: { name: { en: "Unstiffener", pt: "Desparalisante" }, desc: { en: "Cures paralysis.", pt: "Cura paralisia." }, price: 200, pocket: "items", cures: ["par"] },
  despertador: { name: { en: "Wake Bell", pt: "Despertador" }, desc: { en: "Wakes a sleeping creature.", pt: "Acorda uma criatura adormecida." }, price: 250, pocket: "items", cures: ["slp"] },
  curatotal: { name: { en: "Full Cure", pt: "Cura Total" }, desc: { en: "Cures any status problem.", pt: "Cura qualquer problema de status." }, price: 600, pocket: "items", cures: "all" },
  reviver: { name: { en: "Revive", pt: "Reviver" }, desc: { en: "Revives a fainted creature with half HP.", pt: "Revive uma criatura desmaiada com metade dos PV." }, price: 1500, pocket: "items", revive: true },
};

export const SHOP_TOWN: ItemId[] = ["amuleto", "pocao", "antidoto", "desparalisante", "despertador", "pomada"];
export const SHOP_CITY: ItemId[] = ["amuleto", "superamuleto", "pocao", "superpocao", "antidoto", "desparalisante", "despertador", "pomada", "curatotal", "reviver"];
