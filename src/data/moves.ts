import type { L, TypeId } from "./types";

export type StatKey = "atk" | "def" | "spa" | "spd" | "spe" | "acc";
export type Status = "brn" | "psn" | "par" | "slp";

export type MoveEffect =
  | { kind: "stat"; target: "self" | "foe"; stat: StatKey; stages: number; chance?: number }
  | { kind: "status"; status: Status; chance?: number }
  | { kind: "drain" }
  | { kind: "flinch"; chance: number }
  | { kind: "fixedLevel" };

export interface Move {
  name: L;
  type: TypeId;
  cat: "physical" | "special" | "status";
  power: number;
  acc: number; // 0 = never misses
  pp: number;
  priority?: number;
  highCrit?: boolean;
  effect?: MoveEffect;
  desc: L;
}

export type MoveId =
  | "tackle" | "scratch" | "growl" | "tailwhip" | "quickattack" | "sandattack" | "headbutt"
  | "ember" | "smokescreen" | "flameclaw" | "flamewheel"
  | "bubble" | "withdraw" | "bite" | "waterpulse"
  | "vinewhip" | "sleeppowder" | "razorleaf" | "absorb"
  | "gust" | "wingattack"
  | "stringshot" | "bugbite" | "stunspore" | "silverwind"
  | "defensecurl" | "rockthrow" | "rockslide"
  | "sparkjolt" | "thunderwave" | "spark"
  | "peck" | "hypnosis" | "nightshade" | "shadowclaw"
  | "poisonsting" | "poisonfang"
  | "leechlife" | "screech"
  | "mudslap" | "tremor"
  | "lullaby" | "moonglow";

export const MOVES: Record<MoveId, Move> = {
  tackle: { name: { en: "Tackle", pt: "Investida" }, type: "normal", cat: "physical", power: 40, acc: 100, pp: 35, desc: { en: "A full-body charge.", pt: "Um ataque com o corpo todo." } },
  scratch: { name: { en: "Scratch", pt: "Arranhão" }, type: "normal", cat: "physical", power: 40, acc: 100, pp: 35, desc: { en: "Rakes the foe with sharp claws.", pt: "Arranha o alvo com garras afiadas." } },
  growl: { name: { en: "Growl", pt: "Rosnado" }, type: "normal", cat: "status", power: 0, acc: 100, pp: 40, effect: { kind: "stat", target: "foe", stat: "atk", stages: -1 }, desc: { en: "Lowers the foe's Attack.", pt: "Reduz o Ataque do alvo." } },
  tailwhip: { name: { en: "Tail Wag", pt: "Abana-Rabo" }, type: "normal", cat: "status", power: 0, acc: 100, pp: 30, effect: { kind: "stat", target: "foe", stat: "def", stages: -1 }, desc: { en: "Lowers the foe's Defense.", pt: "Reduz a Defesa do alvo." } },
  quickattack: { name: { en: "Quick Strike", pt: "Golpe Ligeiro" }, type: "normal", cat: "physical", power: 40, acc: 100, pp: 30, priority: 1, desc: { en: "Always strikes first.", pt: "Sempre ataca primeiro." } },
  sandattack: { name: { en: "Sand Toss", pt: "Areia nos Olhos" }, type: "normal", cat: "status", power: 0, acc: 100, pp: 15, effect: { kind: "stat", target: "foe", stat: "acc", stages: -1 }, desc: { en: "Lowers the foe's accuracy.", pt: "Reduz a precisão do alvo." } },
  headbutt: { name: { en: "Headbutt", pt: "Cabeçada" }, type: "normal", cat: "physical", power: 70, acc: 100, pp: 15, effect: { kind: "flinch", chance: 30 }, desc: { en: "May make the foe flinch.", pt: "Pode fazer o alvo hesitar." } },

  ember: { name: { en: "Cinders", pt: "Fagulhas" }, type: "fire", cat: "special", power: 40, acc: 100, pp: 25, effect: { kind: "status", status: "brn", chance: 10 }, desc: { en: "May burn the foe.", pt: "Pode queimar o alvo." } },
  smokescreen: { name: { en: "Smoke Puff", pt: "Fumaceira" }, type: "normal", cat: "status", power: 0, acc: 100, pp: 20, effect: { kind: "stat", target: "foe", stat: "acc", stages: -1 }, desc: { en: "Lowers the foe's accuracy.", pt: "Reduz a precisão do alvo." } },
  flameclaw: { name: { en: "Flame Claw", pt: "Garra de Brasa" }, type: "fire", cat: "physical", power: 60, acc: 100, pp: 20, effect: { kind: "status", status: "brn", chance: 10 }, desc: { en: "Burning claws. May burn.", pt: "Garras em brasa. Pode queimar." } },
  flamewheel: { name: { en: "Blaze Burst", pt: "Explosão de Chamas" }, type: "fire", cat: "special", power: 80, acc: 100, pp: 15, effect: { kind: "status", status: "brn", chance: 10 }, desc: { en: "A roaring burst of fire.", pt: "Uma rajada de fogo." } },

  bubble: { name: { en: "Bubbles", pt: "Bolhas" }, type: "water", cat: "special", power: 40, acc: 100, pp: 30, effect: { kind: "stat", target: "foe", stat: "spe", stages: -1, chance: 10 }, desc: { en: "May lower Speed.", pt: "Pode reduzir a Velocidade." } },
  withdraw: { name: { en: "Shell Up", pt: "Encascar" }, type: "water", cat: "status", power: 0, acc: 0, pp: 40, effect: { kind: "stat", target: "self", stat: "def", stages: 1 }, desc: { en: "Raises Defense.", pt: "Aumenta a Defesa." } },
  bite: { name: { en: "Bite", pt: "Mordida" }, type: "dark", cat: "physical", power: 60, acc: 100, pp: 25, effect: { kind: "flinch", chance: 30 }, desc: { en: "May make the foe flinch.", pt: "Pode fazer o alvo hesitar." } },
  waterpulse: { name: { en: "River Pulse", pt: "Pulso do Rio" }, type: "water", cat: "special", power: 65, acc: 100, pp: 20, desc: { en: "A pulse of river water.", pt: "Um pulso de água do rio." } },

  vinewhip: { name: { en: "Vine Lash", pt: "Chicote de Cipó" }, type: "grass", cat: "physical", power: 45, acc: 100, pp: 25, desc: { en: "Whips with thin vines.", pt: "Chicoteia com cipós." } },
  sleeppowder: { name: { en: "Drowsy Dust", pt: "Pó do Sono" }, type: "grass", cat: "status", power: 0, acc: 75, pp: 15, effect: { kind: "status", status: "slp" }, desc: { en: "Puts the foe to sleep.", pt: "Faz o alvo dormir." } },
  razorleaf: { name: { en: "Leaf Blade", pt: "Folha Navalha" }, type: "grass", cat: "physical", power: 55, acc: 95, pp: 25, highCrit: true, desc: { en: "High critical-hit ratio.", pt: "Alta chance de crítico." } },
  absorb: { name: { en: "Sap Sip", pt: "Beber Seiva" }, type: "grass", cat: "special", power: 30, acc: 100, pp: 25, effect: { kind: "drain" }, desc: { en: "Restores half the damage dealt.", pt: "Recupera metade do dano causado." } },

  gust: { name: { en: "Gust", pt: "Rajada" }, type: "flying", cat: "special", power: 40, acc: 100, pp: 35, desc: { en: "Whips up a gust of wind.", pt: "Levanta uma rajada de vento." } },
  wingattack: { name: { en: "Wing Slap", pt: "Tapa de Asa" }, type: "flying", cat: "physical", power: 60, acc: 100, pp: 35, desc: { en: "Strikes with wide wings.", pt: "Golpeia com as asas." } },

  stringshot: { name: { en: "Silk Spray", pt: "Fio de Seda" }, type: "bug", cat: "status", power: 0, acc: 95, pp: 40, effect: { kind: "stat", target: "foe", stat: "spe", stages: -1 }, desc: { en: "Lowers the foe's Speed.", pt: "Reduz a Velocidade do alvo." } },
  bugbite: { name: { en: "Nibble", pt: "Beliscada" }, type: "bug", cat: "physical", power: 60, acc: 100, pp: 20, desc: { en: "A quick bug bite.", pt: "Uma picada rápida." } },
  stunspore: { name: { en: "Numb Dust", pt: "Pó Paralisante" }, type: "grass", cat: "status", power: 0, acc: 75, pp: 30, effect: { kind: "status", status: "par" }, desc: { en: "Paralyzes the foe.", pt: "Paralisa o alvo." } },
  silverwind: { name: { en: "Glow Wind", pt: "Vento Luminoso" }, type: "bug", cat: "special", power: 60, acc: 100, pp: 5, desc: { en: "A shimmering, glowing wind.", pt: "Um vento brilhante." } },

  defensecurl: { name: { en: "Curl Up", pt: "Enrolar" }, type: "normal", cat: "status", power: 0, acc: 0, pp: 40, effect: { kind: "stat", target: "self", stat: "def", stages: 1 }, desc: { en: "Raises Defense.", pt: "Aumenta a Defesa." } },
  rockthrow: { name: { en: "Pebble Toss", pt: "Arremesso de Pedra" }, type: "rock", cat: "physical", power: 50, acc: 90, pp: 15, desc: { en: "Hurls small rocks.", pt: "Arremessa pedrinhas." } },
  rockslide: { name: { en: "Landslide", pt: "Deslizamento" }, type: "rock", cat: "physical", power: 75, acc: 90, pp: 10, effect: { kind: "flinch", chance: 30 }, desc: { en: "May make the foe flinch.", pt: "Pode fazer o alvo hesitar." } },

  sparkjolt: { name: { en: "Zap", pt: "Choquinho" }, type: "electric", cat: "special", power: 40, acc: 100, pp: 30, effect: { kind: "status", status: "par", chance: 10 }, desc: { en: "May paralyze the foe.", pt: "Pode paralisar o alvo." } },
  thunderwave: { name: { en: "Static Wave", pt: "Onda Estática" }, type: "electric", cat: "status", power: 0, acc: 90, pp: 20, effect: { kind: "status", status: "par" }, desc: { en: "Paralyzes the foe.", pt: "Paralisa o alvo." } },
  spark: { name: { en: "Crackle Dash", pt: "Arrancada Elétrica" }, type: "electric", cat: "physical", power: 65, acc: 100, pp: 20, effect: { kind: "status", status: "par", chance: 30 }, desc: { en: "May paralyze the foe.", pt: "Pode paralisar o alvo." } },

  peck: { name: { en: "Peck", pt: "Bicada" }, type: "flying", cat: "physical", power: 35, acc: 100, pp: 35, desc: { en: "Jabs with a sharp beak.", pt: "Bica com o bico afiado." } },
  hypnosis: { name: { en: "Hypnotic Stare", pt: "Olhar Hipnótico" }, type: "dark", cat: "status", power: 0, acc: 60, pp: 20, effect: { kind: "status", status: "slp" }, desc: { en: "Puts the foe to sleep.", pt: "Faz o alvo dormir." } },
  nightshade: { name: { en: "Night Veil", pt: "Véu Noturno" }, type: "dark", cat: "special", power: 1, acc: 100, pp: 15, effect: { kind: "fixedLevel" }, desc: { en: "Damage equals the user's level.", pt: "Dano igual ao nível do usuário." } },
  shadowclaw: { name: { en: "Dusk Talon", pt: "Garra do Crepúsculo" }, type: "dark", cat: "physical", power: 70, acc: 100, pp: 15, highCrit: true, desc: { en: "High critical-hit ratio.", pt: "Alta chance de crítico." } },

  poisonsting: { name: { en: "Sting", pt: "Ferroada" }, type: "poison", cat: "physical", power: 15, acc: 100, pp: 35, effect: { kind: "status", status: "psn", chance: 30 }, desc: { en: "May poison the foe.", pt: "Pode envenenar o alvo." } },
  poisonfang: { name: { en: "Venom Fang", pt: "Presa Venenosa" }, type: "poison", cat: "physical", power: 50, acc: 100, pp: 15, effect: { kind: "status", status: "psn", chance: 30 }, desc: { en: "Toxic fangs. May poison.", pt: "Presas tóxicas. Pode envenenar." } },

  leechlife: { name: { en: "Blood Sip", pt: "Chupa-Sangue" }, type: "bug", cat: "physical", power: 20, acc: 100, pp: 15, effect: { kind: "drain" }, desc: { en: "Restores half the damage dealt.", pt: "Recupera metade do dano causado." } },
  screech: { name: { en: "Cave Screech", pt: "Guincho" }, type: "normal", cat: "status", power: 0, acc: 85, pp: 40, effect: { kind: "stat", target: "foe", stat: "def", stages: -2 }, desc: { en: "Sharply lowers the foe's Defense.", pt: "Reduz muito a Defesa do alvo." } },

  mudslap: { name: { en: "Mud Slap", pt: "Tapa de Lama" }, type: "ground", cat: "special", power: 20, acc: 100, pp: 10, effect: { kind: "stat", target: "foe", stat: "acc", stages: -1 }, desc: { en: "Lowers the foe's accuracy.", pt: "Reduz a precisão do alvo." } },
  tremor: { name: { en: "Tremor", pt: "Tremor" }, type: "ground", cat: "physical", power: 70, acc: 100, pp: 15, desc: { en: "Shakes the ground under the foe.", pt: "Sacode o chão sob o alvo." } },

  lullaby: { name: { en: "Lullaby", pt: "Cantiga de Ninar" }, type: "normal", cat: "status", power: 0, acc: 55, pp: 15, effect: { kind: "status", status: "slp" }, desc: { en: "Sings the foe to sleep.", pt: "Canta até o alvo dormir." } },
  moonglow: { name: { en: "Moonglow", pt: "Luar" }, type: "normal", cat: "special", power: 60, acc: 100, pp: 15, desc: { en: "A soft beam of moonlight.", pt: "Um raio suave de luar." } },
};
