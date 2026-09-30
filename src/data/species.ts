import type { L, TypeId } from "./types";
import type { MoveId } from "./moves";

export type SpeciesId =
  | "fagulho" | "labaredo"
  | "bolhuga" | "cascabolha"
  | "brotapo" | "floresapo"
  | "pardalito" | "gavionte"
  | "ratico" | "ratazao"
  | "lagartix" | "borbolux"
  | "pedrudo" | "rochedao"
  | "chispito" | "chispao"
  | "corujita" | "rasgamorte"
  | "morceguinho" | "morcegao"
  | "luazinha"
  | "jararaca" | "jararacucu"
  | "lontrinha" | "ariranha"
  | "canelinha" | "canelao"
  | "piabinha" | "pirarucao";

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface Species {
  id: SpeciesId;
  dex: number;
  name: string;
  types: TypeId[];
  base: BaseStats;
  catchRate: number;
  baseExp: number;
  learnset: [number, MoveId][];
  evolves?: { to: SpeciesId; level: number };
  kind: L;
  height: number;
  weight: number;
  lore: L;
  color: string; // used for menu icons
}

const S = (s: Species) => s;

export const SPECIES: Record<SpeciesId, Species> = {
  fagulho: S({
    id: "fagulho", dex: 1, name: "Fagulho", types: ["fire"],
    base: { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 }, catchRate: 45, baseExp: 62,
    learnset: [[1, "scratch"], [1, "growl"], [7, "ember"], [10, "smokescreen"], [13, "flameclaw"]],
    evolves: { to: "labaredo", level: 12 },
    kind: { en: "Ember Lizard", pt: "Lagarto Brasa" }, height: 0.6, weight: 8.5, color: "#f08a3c",
    lore: {
      en: "The flame on its tail shows how it feels. Old folks say the first one hatched from a spark dropped by the Boitatá.",
      pt: "A chama na cauda mostra como ele se sente. Os antigos dizem que o primeiro nasceu de uma fagulha do Boitatá.",
    },
  }),
  labaredo: S({
    id: "labaredo", dex: 2, name: "Labaredo", types: ["fire"],
    base: { hp: 58, atk: 64, def: 58, spa: 80, spd: 65, spe: 80 }, catchRate: 45, baseExp: 142,
    learnset: [[1, "scratch"], [1, "growl"], [7, "ember"], [10, "smokescreen"], [13, "flameclaw"], [17, "flamewheel"], [22, "shadowclaw"]],
    kind: { en: "Blaze Lizard", pt: "Lagarto Labareda" }, height: 1.1, weight: 19, color: "#d9492b",
    lore: {
      en: "It swings its blazing tail to scorch the tall grass of the cerrado. When angry, its flame turns almost white.",
      pt: "Balança a cauda em chamas e chamusca o capim do cerrado. Quando irritado, a chama fica quase branca.",
    },
  }),
  bolhuga: S({
    id: "bolhuga", dex: 3, name: "Bolhuga", types: ["water"],
    base: { hp: 44, atk: 48, def: 65, spa: 50, spd: 64, spe: 43 }, catchRate: 45, baseExp: 63,
    learnset: [[1, "tackle"], [1, "tailwhip"], [7, "bubble"], [10, "withdraw"], [13, "bite"]],
    evolves: { to: "cascabolha", level: 12 },
    kind: { en: "Pond Turtle", pt: "Tartaruga do Lago" }, height: 0.5, weight: 9, color: "#5aaee8",
    lore: {
      en: "It hides in its shell by the riverbank and blows bubbles at anyone who comes too close. Iara is said to sing it to sleep.",
      pt: "Se esconde no casco à beira do rio e sopra bolhas em quem chega perto. Dizem que a Iara canta para ele dormir.",
    },
  }),
  cascabolha: S({
    id: "cascabolha", dex: 4, name: "Cascabolha", types: ["water"],
    base: { hp: 59, atk: 63, def: 80, spa: 65, spd: 80, spe: 58 }, catchRate: 45, baseExp: 142,
    learnset: [[1, "tackle"], [1, "tailwhip"], [7, "bubble"], [10, "withdraw"], [13, "bite"], [17, "waterpulse"]],
    kind: { en: "River Turtle", pt: "Tartaruga do Rio" }, height: 1.0, weight: 22.5, color: "#3b7fd1",
    lore: {
      en: "Its fluffy ears steer it through fast rivers. Moss growing on its shell is a sign of a long, peaceful life.",
      pt: "As orelhas felpudas o guiam em rios velozes. Musgo no casco é sinal de uma vida longa e tranquila.",
    },
  }),
  brotapo: S({
    id: "brotapo", dex: 5, name: "Brotapo", types: ["grass"],
    base: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 }, catchRate: 45, baseExp: 64,
    learnset: [[1, "tackle"], [1, "growl"], [7, "vinewhip"], [10, "sleeppowder"], [13, "razorleaf"]],
    evolves: { to: "floresapo", level: 12 },
    kind: { en: "Sprout Toad", pt: "Sapo Broto" }, height: 0.7, weight: 6.9, color: "#58b88a",
    lore: {
      en: "The bud on its back drinks sunlight. Curupira is said to plant one in every forest he protects.",
      pt: "O broto nas costas bebe a luz do sol. Dizem que o Curupira planta um em cada mata que protege.",
    },
  }),
  floresapo: S({
    id: "floresapo", dex: 6, name: "Floresapo", types: ["grass"],
    base: { hp: 60, atk: 62, def: 63, spa: 80, spd: 80, spe: 60 }, catchRate: 45, baseExp: 142,
    learnset: [[1, "tackle"], [1, "growl"], [7, "vinewhip"], [10, "sleeppowder"], [13, "razorleaf"], [17, "stunspore"], [21, "absorb"]],
    kind: { en: "Blossom Toad", pt: "Sapo Flor" }, height: 1.0, weight: 13, color: "#3e9a6c",
    lore: {
      en: "When the bud on its back opens into a flower, a sweet smell fills the air and wild creatures gather around.",
      pt: "Quando o broto nas costas vira flor, um perfume doce enche o ar e criaturas selvagens se reúnem.",
    },
  }),
  pardalito: S({
    id: "pardalito", dex: 7, name: "Pardalito", types: ["normal", "flying"],
    base: { hp: 40, atk: 45, def: 40, spa: 35, spd: 35, spe: 56 }, catchRate: 255, baseExp: 50,
    learnset: [[1, "tackle"], [5, "sandattack"], [9, "gust"], [13, "quickattack"], [18, "wingattack"]],
    evolves: { to: "gavionte", level: 16 },
    kind: { en: "Tiny Bird", pt: "Passarinho" }, height: 0.3, weight: 1.8, color: "#b8845a",
    lore: {
      en: "Very common on country roads. It kicks up sand to blind anyone who steps on its favorite patch of grass.",
      pt: "Muito comum nas estradas de terra. Joga areia em quem pisa na sua moita favorita.",
    },
  }),
  gavionte: S({
    id: "gavionte", dex: 8, name: "Gavionte", types: ["normal", "flying"],
    base: { hp: 63, atk: 60, def: 55, spa: 50, spd: 50, spe: 71 }, catchRate: 120, baseExp: 122,
    learnset: [[1, "tackle"], [5, "sandattack"], [9, "gust"], [13, "quickattack"], [18, "wingattack"]],
    kind: { en: "Hawk", pt: "Gavião" }, height: 1.1, weight: 30, color: "#9a6a44",
    lore: {
      en: "It circles high above the hills, guarding a wide territory. Its red crest stands up when it dives.",
      pt: "Voa em círculos sobre os morros guardando seu território. A crista vermelha se ergue quando mergulha.",
    },
  }),
  ratico: S({
    id: "ratico", dex: 9, name: "Ratiço", types: ["normal"],
    base: { hp: 30, atk: 56, def: 35, spa: 25, spd: 35, spe: 72 }, catchRate: 255, baseExp: 51,
    learnset: [[1, "tackle"], [1, "tailwhip"], [4, "quickattack"], [10, "bite"], [15, "headbutt"]],
    evolves: { to: "ratazao", level: 16 },
    kind: { en: "Rat", pt: "Rato" }, height: 0.3, weight: 3.5, color: "#9a73c4",
    lore: {
      en: "Its front teeth never stop growing, so it gnaws on fence posts all day long. Farmers are not amused.",
      pt: "Os dentes da frente nunca param de crescer, então rói mourões de cerca o dia todo. Os fazendeiros não gostam.",
    },
  }),
  ratazao: S({
    id: "ratazao", dex: 10, name: "Ratazão", types: ["normal"],
    base: { hp: 55, atk: 81, def: 60, spa: 50, spd: 70, spe: 97 }, catchRate: 127, baseExp: 145,
    learnset: [[1, "tackle"], [1, "tailwhip"], [4, "quickattack"], [10, "bite"], [15, "headbutt"]],
    kind: { en: "Big Rat", pt: "Ratazana" }, height: 0.7, weight: 18.5, color: "#a07a4c",
    lore: {
      en: "Its whiskers keep its balance. It can swim across rivers to raid corn fields on the other side.",
      pt: "Os bigodes mantêm seu equilíbrio. Atravessa rios a nado para atacar milharais do outro lado.",
    },
  }),
  lagartix: S({
    id: "lagartix", dex: 11, name: "Lagartix", types: ["bug"],
    base: { hp: 45, atk: 30, def: 35, spa: 20, spd: 20, spe: 45 }, catchRate: 255, baseExp: 39,
    learnset: [[1, "tackle"], [1, "stringshot"], [6, "poisonsting"], [9, "bugbite"]],
    evolves: { to: "borbolux", level: 10 },
    kind: { en: "Caterpillar", pt: "Lagarta" }, height: 0.3, weight: 2.9, color: "#8cc84b",
    lore: {
      en: "It eats its own weight in leaves every day. The glowing tips of its antennae scare off birds at night.",
      pt: "Come o próprio peso em folhas todo dia. As pontas brilhantes das antenas espantam pássaros à noite.",
    },
  }),
  borbolux: S({
    id: "borbolux", dex: 12, name: "Borbolux", types: ["bug", "flying"],
    base: { hp: 60, atk: 45, def: 50, spa: 90, spd: 80, spe: 70 }, catchRate: 45, baseExp: 160,
    learnset: [[1, "tackle"], [1, "stringshot"], [6, "poisonsting"], [9, "bugbite"], [10, "gust"], [12, "stunspore"], [14, "sleeppowder"], [16, "silverwind"]],
    kind: { en: "Glow Moth", pt: "Mariposa Luz" }, height: 1.1, weight: 32, color: "#c9b3f0",
    lore: {
      en: "On summer nights, swarms of Borbolux light up the fields like floating lanterns. Its wing dust glitters.",
      pt: "Nas noites de verão, bandos de Borbolux iluminam os campos como lanternas. O pó das asas brilha.",
    },
  }),
  pedrudo: S({
    id: "pedrudo", dex: 13, name: "Pedrudo", types: ["rock"],
    base: { hp: 40, atk: 80, def: 100, spa: 30, spd: 30, spe: 20 }, catchRate: 255, baseExp: 60,
    learnset: [[1, "tackle"], [1, "defensecurl"], [6, "rockthrow"], [11, "headbutt"], [14, "mudslap"], [17, "rockslide"]],
    evolves: { to: "rochedao", level: 16 },
    kind: { en: "Pebble", pt: "Pedregulho" }, height: 0.4, weight: 20, color: "#9a938a",
    lore: {
      en: "Often mistaken for an ordinary rock by the river. Anyone who steps on it gets a punch for their trouble.",
      pt: "Muitas vezes confundido com uma pedra comum à beira do rio. Quem pisa nele leva um soco.",
    },
  }),
  rochedao: S({
    id: "rochedao", dex: 14, name: "Rochedão", types: ["rock"],
    base: { hp: 55, atk: 95, def: 115, spa: 45, spd: 45, spe: 35 }, catchRate: 120, baseExp: 137,
    learnset: [[1, "tackle"], [1, "defensecurl"], [6, "rockthrow"], [11, "headbutt"], [14, "mudslap"], [17, "rockslide"], [24, "tremor"]],
    kind: { en: "Boulder", pt: "Rochedo" }, height: 1.0, weight: 105, color: "#7d766c",
    lore: {
      en: "It rolls down mountain slopes to travel. Miners in Minas say finding one means gold is nearby.",
      pt: "Rola morro abaixo para viajar. Mineiros dizem que encontrar um significa ouro por perto.",
    },
  }),
  chispito: S({
    id: "chispito", dex: 15, name: "Chispito", types: ["electric"],
    base: { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 }, catchRate: 190, baseExp: 82,
    learnset: [[1, "sparkjolt"], [1, "growl"], [5, "tailwhip"], [8, "thunderwave"], [11, "quickattack"], [15, "spark"]],
    evolves: { to: "chispao", level: 16 },
    kind: { en: "Spark Mouse", pt: "Rato Faísca" }, height: 0.4, weight: 6, color: "#f5d23a",
    lore: {
      en: "It stores electricity in its cheeks. During thunderstorms whole families gather on hilltops to recharge.",
      pt: "Guarda eletricidade nas bochechas. Em tempestades, famílias inteiras sobem os morros para recarregar.",
    },
  }),
  chispao: S({
    id: "chispao", dex: 16, name: "Chispão", types: ["electric"],
    base: { hp: 60, atk: 90, def: 55, spa: 90, spd: 80, spe: 110 }, catchRate: 75, baseExp: 150,
    learnset: [[1, "sparkjolt"], [1, "growl"], [5, "tailwhip"], [8, "thunderwave"], [11, "quickattack"], [15, "spark"]],
    kind: { en: "Thunder Mouse", pt: "Rato Trovão" }, height: 0.8, weight: 30, color: "#f0a030",
    lore: {
      en: "Its long tail works as a lightning rod. When it's overcharged, the fur on its back crackles and glows.",
      pt: "A cauda longa funciona como para-raios. Quando está sobrecarregado, o pelo das costas estala e brilha.",
    },
  }),
  corujita: S({
    id: "corujita", dex: 17, name: "Corujita", types: ["dark", "flying"],
    base: { hp: 60, atk: 30, def: 30, spa: 36, spd: 56, spe: 50 }, catchRate: 255, baseExp: 58,
    learnset: [[1, "peck"], [1, "growl"], [6, "hypnosis"], [10, "nightshade"], [14, "bite"]],
    evolves: { to: "rasgamorte", level: 16 },
    kind: { en: "Owlet", pt: "Corujinha" }, height: 0.4, weight: 4, color: "#6a5a8a",
    lore: {
      en: "It turns its head all the way around to keep watch. Its big eyes can hypnotize anyone who stares back.",
      pt: "Gira a cabeça inteira para vigiar. Seus olhos grandes hipnotizam quem os encara de volta.",
    },
  }),
  rasgamorte: S({
    id: "rasgamorte", dex: 18, name: "Rasgamorte", types: ["dark", "flying"],
    base: { hp: 80, atk: 55, def: 50, spa: 76, spd: 96, spe: 70 }, catchRate: 90, baseExp: 155,
    learnset: [[1, "peck"], [1, "growl"], [6, "hypnosis"], [10, "nightshade"], [14, "bite"], [18, "shadowclaw"]],
    kind: { en: "Barn Owl", pt: "Suindara" }, height: 1.4, weight: 40, color: "#e8dcc4",
    lore: {
      en: "Named after the Rasga-Mortalha, whose screech sounds like tearing cloth. Despite the legend, it is gentle and loyal.",
      pt: "Recebeu o nome da Rasga-Mortalha, cujo grito lembra pano rasgando. Apesar da lenda, é gentil e leal.",
    },
  }),
  morceguinho: S({
    id: "morceguinho", dex: 19, name: "Morceguinho", types: ["poison", "flying"],
    base: { hp: 40, atk: 45, def: 35, spa: 30, spd: 40, spe: 55 }, catchRate: 255, baseExp: 54,
    learnset: [[1, "leechlife"], [6, "screech"], [10, "bite"], [15, "wingattack"], [19, "poisonfang"]],
    evolves: { to: "morcegao", level: 22 },
    kind: { en: "Cave Bat", pt: "Morcego da Gruta" }, height: 0.8, weight: 7.5, color: "#5a78c8",
    lore: {
      en: "Thousands roost in the limestone caves of Lagoa Santa. It has no eyes and finds its way by squeaking.",
      pt: "Milhares vivem nas grutas de calcário de Lagoa Santa. Não tem olhos e se guia pelos próprios guinchos.",
    },
  }),
  morcegao: S({
    id: "morcegao", dex: 20, name: "Morcegão", types: ["poison", "flying"],
    base: { hp: 75, atk: 80, def: 70, spa: 65, spd: 75, spe: 90 }, catchRate: 90, baseExp: 159,
    learnset: [[1, "leechlife"], [6, "screech"], [10, "bite"], [15, "wingattack"], [19, "poisonfang"], [26, "shadowclaw"]],
    kind: { en: "Big Bat", pt: "Morcegão" }, height: 1.6, weight: 55, color: "#3f5aa8",
    lore: {
      en: "Its mouth opens wider than its whole head. Cavers in Minas hang garlic at the cave mouth, which it completely ignores.",
      pt: "A boca abre mais que a cabeça inteira. Espeleólogos de Minas penduram alho na entrada da gruta, e ele nem liga.",
    },
  }),
  luazinha: S({
    id: "luazinha", dex: 21, name: "Luazinha", types: ["normal"],
    base: { hp: 70, atk: 45, def: 48, spa: 60, spd: 65, spe: 35 }, catchRate: 150, baseExp: 68,
    learnset: [[1, "tackle"], [1, "growl"], [5, "lullaby"], [9, "defensecurl"], [13, "moonglow"], [17, "headbutt"]],
    kind: { en: "Moon Sprite", pt: "Fada da Lua" }, height: 0.6, weight: 7.5, color: "#f3c6d8",
    lore: {
      en: "Rarely seen outside the deepest caves. On full-moon nights it climbs out to dance, and sings the same lullaby every time.",
      pt: "Raramente vista fora das grutas mais fundas. Em noites de lua cheia sobe para dançar e canta sempre a mesma cantiga.",
    },
  }),
  jararaca: S({
    id: "jararaca", dex: 22, name: "Jararaca", types: ["poison"],
    base: { hp: 35, atk: 60, def: 44, spa: 40, spd: 54, spe: 55 }, catchRate: 255, baseExp: 58,
    learnset: [[1, "poisonsting"], [1, "sandattack"], [9, "bite"], [13, "screech"], [17, "poisonfang"]],
    evolves: { to: "jararacucu", level: 22 },
    kind: { en: "Pit Viper", pt: "Víbora" }, height: 1.2, weight: 4.5, color: "#9a7a4a",
    lore: {
      en: "Its zigzag markings vanish among dry leaves. It feels body heat through two little pits on its snout, even in the dark.",
      pt: "As manchas em zigue-zague somem no meio das folhas secas. Sente o calor do corpo por duas fossetas no focinho, mesmo no escuro.",
    },
  }),
  jararacucu: S({
    id: "jararacucu", dex: 23, name: "Jararacuçu", types: ["poison"],
    base: { hp: 60, atk: 85, def: 69, spa: 65, spd: 79, spe: 80 }, catchRate: 90, baseExp: 147,
    learnset: [[1, "poisonsting"], [1, "sandattack"], [9, "bite"], [13, "screech"], [17, "poisonfang"], [26, "headbutt"], [31, "tremor"]],
    kind: { en: "Great Viper", pt: "Víbora Grande" }, height: 2.2, weight: 18, color: "#6a5a2a",
    lore: {
      en: "Its black and gold scales shine like old coins. Farmers walk the trails in tall boots when one is about.",
      pt: "As escamas pretas e douradas brilham como moedas antigas. Quando ela anda por perto, a roça só sai de botina.",
    },
  }),
  lontrinha: S({
    id: "lontrinha", dex: 24, name: "Lontrinha", types: ["water"],
    base: { hp: 50, atk: 55, def: 45, spa: 55, spd: 50, spe: 60 }, catchRate: 150, baseExp: 66,
    learnset: [[1, "scratch"], [1, "tailwhip"], [5, "bubble"], [9, "aquajet"], [14, "bite"], [18, "waterpulse"], [24, "headbutt"]],
    evolves: { to: "ariranha", level: 28 },
    kind: { en: "River Otter", pt: "Lontra do Rio" }, height: 0.8, weight: 8, color: "#8a5a3a",
    lore: {
      en: "It slides down the mossy rocks of the Serra do Cipó waterfalls for fun, then climbs back up and does it again.",
      pt: "Escorrega pelas pedras cheias de musgo das cachoeiras da Serra do Cipó só por diversão, depois sobe e faz tudo de novo.",
    },
  }),
  ariranha: S({
    id: "ariranha", dex: 25, name: "Ariranha", types: ["water"],
    base: { hp: 75, atk: 85, def: 65, spa: 75, spd: 70, spe: 90 }, catchRate: 75, baseExp: 160,
    learnset: [[1, "scratch"], [1, "tailwhip"], [5, "bubble"], [9, "aquajet"], [14, "bite"], [18, "waterpulse"], [24, "headbutt"], [28, "waterfall"], [33, "screech"]],
    kind: { en: "Giant Otter", pt: "Lontra Gigante" }, height: 1.7, weight: 32, color: "#6a3f28",
    lore: {
      en: "Families hunt together and scream so loudly that jaguars back away. The pale patch on its throat is different on every one.",
      pt: "As famílias caçam juntas e gritam tão alto que até a onça recua. A mancha clara no pescoço é diferente em cada uma.",
    },
  }),
  canelinha: S({
    id: "canelinha", dex: 26, name: "Canelinha", types: ["grass"],
    base: { hp: 45, atk: 45, def: 55, spa: 70, spd: 60, spe: 30 }, catchRate: 190, baseExp: 64,
    learnset: [[1, "absorb"], [1, "growl"], [8, "stunspore"], [12, "sleeppowder"], [16, "megadrain"], [19, "razorleaf"]],
    evolves: { to: "canelao", level: 21 },
    kind: { en: "Stilt Plant", pt: "Planta Canela" }, height: 0.5, weight: 5, color: "#7a9a5a",
    lore: {
      en: "A little canela-de-ema that walks on its stiff black stem. When a fire sweeps the serra, it curls up its leaves and waits it out.",
      pt: "Uma canela-de-ema pequenina que anda no caule preto e duro. Quando o fogo passa pela serra, fecha as folhas e espera.",
    },
  }),
  canelao: S({
    id: "canelao", dex: 27, name: "Canelão", types: ["grass"],
    base: { hp: 65, atk: 60, def: 75, spa: 90, spd: 80, spe: 40 }, catchRate: 75, baseExp: 150,
    learnset: [[1, "absorb"], [1, "growl"], [8, "stunspore"], [12, "sleeppowder"], [16, "megadrain"], [19, "razorleaf"], [26, "moonglow"]],
    kind: { en: "Bloom Plant", pt: "Planta Florida" }, height: 1.3, weight: 21, color: "#b07ad0",
    lore: {
      en: "It can live for five hundred years on bare quartz rock. After the first rain of spring, a violet flower opens on its crown.",
      pt: "Vive quinhentos anos em cima de rocha de quartzo pelada. Depois da primeira chuva da primavera, uma flor violeta abre na copa.",
    },
  }),
  piabinha: S({
    id: "piabinha", dex: 28, name: "Piabinha", types: ["water"],
    base: { hp: 30, atk: 40, def: 40, spa: 30, spd: 30, spe: 70 }, catchRate: 255, baseExp: 40,
    learnset: [[1, "tackle"], [1, "bubble"], [8, "aquajet"], [15, "bite"]],
    evolves: { to: "pirarucao", level: 20 },
    kind: { en: "Minnow", pt: "Peixinho" }, height: 0.3, weight: 0.4, color: "#c0c8d0",
    lore: {
      en: "Every stream in Minas is full of them. It nibbles toes, steals bait, and is easy to catch. Nobody expects much from it.",
      pt: "Todo córrego de Minas está cheio delas. Belisca o dedo, rouba a isca e é fácil de pegar. Ninguém espera muito dela.",
    },
  }),
  pirarucao: S({
    id: "pirarucao", dex: 29, name: "Pirarucão", types: ["water", "dark"],
    base: { hp: 95, atk: 115, def: 79, spa: 60, spd: 90, spe: 81 }, catchRate: 45, baseExp: 189,
    learnset: [[1, "tackle"], [1, "bubble"], [8, "aquajet"], [15, "bite"], [20, "waterfall"], [25, "screech"], [32, "shadowclaw"]],
    kind: { en: "Giant Fish", pt: "Peixe Gigante" }, height: 3.0, weight: 200, color: "#a8342a",
    lore: {
      en: "One of the largest river fish in the world. It surfaces to gulp air with a roar, and its scales are hard enough to file wood.",
      pt: "Um dos maiores peixes de rio do mundo. Sobe para respirar com um rugido, e as escamas são tão duras que servem de lixa.",
    },
  }),
};

export const DEX_ORDER: SpeciesId[] = (Object.keys(SPECIES) as SpeciesId[]).sort((a, b) => SPECIES[a].dex - SPECIES[b].dex);
export const STARTERS: SpeciesId[] = ["brotapo", "fagulho", "bolhuga"];
