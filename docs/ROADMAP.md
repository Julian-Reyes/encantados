# Encantados roadmap

The plan for the full game: 8 gyms, a villain team, the Elite Four and a Champion. It follows the structure of Pokémon Red/Blue closely: the same story beats, level curve and gym types, in roughly the same order. The setting is Brazil.

## Design pillars

- **Kanto skeleton, Brazilian skin.** Every stage maps to a Red/Blue beat, reskinned with a real Brazilian place, folklore, fauna or gem.
- **The region is Pindorama**, the Tupi name for Brazil. It's stylised the way Kanto is. Long hops use a ship, train or highway (the Cycling Road's role) instead of real distances.
- **Minas Gerais is home.** The game starts there, the first two gyms and the last one are there, and the story comes back to it at the end. The middle of the game goes out to the coast and across the country, since Minas has no sea for the port, Seafoam or Cinnabar.
- **Leaders are named after Brazilian gems, and each badge is that gem.** Topázio and the Topaz Badge (`badgeTopaz`) set the pattern.
- **Everything is bilingual (en/pt).** Species come from Brazilian fauna and folklore, and every macro-region is represented through a gym or an Elite Four member.

## The region, stage by stage

| # | Kanto beat | Stage | Gym / event | Levels |
|---|---|---|---|---|
| 1 ✓ | Pallet → Viridian → Pewter | **MG**: Vila Pequi, Route 1, Cidade Ipê, Route 2 | **Topázio** (Rock), Topaz Badge | 12/14 |
| 2 ✓ | Mt. Moon → Cerulean | **MG**: Route 3 → **Gruta da Lapinha** (fossils) → Route 4 → **Serra do Cipó** (waterfalls) | **Marina** (Water), Aquamarine Badge | 18/21 |
| 3 | Nugget Bridge, Bill → Vermilion, S.S. Anne | Ponte do Cipó, Seu Bento's cabin → Caminho Novo → **Rio de Janeiro (RJ)**, the port, with the cruise ship *Navio Guanabara* | **Turmalina** (Electric; tourmaline is piezo-electric), Tourmaline Badge | 21/24 |
| 4 | Rock Tunnel → Lavender | **Túnel da Serra do Mar** (dark, needs Flash) → **Paraty (RJ)**, a colonial town with a haunted church bell tower. No gym | — | ~25 |
| 5 | Celadon | Serra Verde train → **Curitiba (PR)**: the Jardim Botânico greenhouse is the gym, plus a dept. store and a Fliperama hiding the villains' base. The **Itaipu** dam nearby is the Power Plant | **Esmeralda** (Grass), Emerald Badge | 24–29 |
| 6 | Pokémon Tower, Poké Flute, Snorlax → Fuchsia, Safari Zone | Back to Paraty's tower for the **Viola caipira**. A sleeping **Preguiçudo** blocks the BR highway → **Bonito (MS)** and the **Pantanal Safari** | **Ametista** (Poison), Amethyst Badge | 37–43 |
| 7 | Silph Co. → Saffron, Fighting Dojo | **São Paulo (SP)**: the villains seize the Amulet Co. tower on Av. Paulista. A jiu-jitsu academy is the dojo | **Cristal** (Psychic), Quartz Badge | 37–43 |
| 8 | Seafoam Islands → Cinnabar | Surf the Atlantic → **Abrolhos (BA)** sea caves → **Fernando de Noronha (PE)**, a volcanic archipelago. The old island prison ruins stand in for the Mansion; the fossil lab is here | **Opala** (Fire; fire opal from Piauí), Fire-Opal Badge. The gym is a Brazil trivia quiz | 40–47 |
| 9 | Viridian Gym | Back home to **Diamantina (MG)**, the historic diamond-mining town, west of Ipê via Route 22. Locked until you have 7 badges | **Diamante** (Ground), Diamond Badge. He's secretly the villain boss | 42–50 |
| 10 | Victory Road → Indigo Plateau | **Chapada dos Veadeiros (GO)**, a Strength-boulder canyon → **Liga Brasileira** in **Brasília (DF)**, on the Planalto Central (Indigo *Plateau* → *Planalto*) | Elite Four + Champion (the rival) | 53–65 |

## Villain team: Garimpo Sombrio

Illegal prospectors who poach creatures and strip land for gems and gold. Illegal mining (*garimpo*) is a real Brazil-wide problem, and it ties back to the mining history of Minas. Grunts wear miner gear with dark bandanas. Their story follows Team Rocket's:

| Where | Team Rocket beat | What happens |
|---|---|---|
| Gruta da Lapinha ✓ | Mt. Moon | Grunts dig up and steal fossils |
| Ponte do Cipó | Nugget Bridge | A recruiter after the bridge trainers |
| Seu Bento's route | Cerulean house robbery | They rob a house; you get back a stolen item |
| Curitiba Fliperama | Game Corner hideout | First fight with the (masked) boss; you get the **Lente Espectral** (Silph Scope) |
| Paraty bell tower | Pokémon Tower | They hold Padre Anselmo (Mr. Fuji) |
| São Paulo Amulet Co. | Silph Co. | Second boss fight; you get the **Amuleto Mestre** (Master Ball) |
| Diamantina | Viridian Gym | The boss is revealed as Leader Diamante and disbands the team |

## Rival

Already done: the lab battle and Route 1. Still to come, following Kanto:

| Where | Kanto beat | Levels (approx.) |
|---|---|---|
| Serra do Cipó, before the bridge ✓ | Cerulean | 18 |
| Aboard the Navio Guanabara | S.S. Anne | 20 |
| Paraty bell tower | Pokémon Tower | 25 |
| Amulet Co., São Paulo | Silph Co. | 40 |
| Route 22, before the Chapada | Route 22 | 47 |
| Liga Brasileira | Champion | 59–65 |

## Field moves and items

Field moves work like HMs (in Portuguese, *MO*). You teach them to a creature, and you can only use them outside battle once you have the badge listed.

| Move | Kanto | Where you get it | Badge needed |
|---|---|---|---|
| **Facão** | Cut | The Navio Guanabara's captain | Aquamarine |
| **Lampião** | Flash | A lab aide, after 10 species registered | Tourmaline |
| **Canoa** | Surf | Pantanal Safari prize | Amethyst |
| **Força** | Strength | The Safari warden | Emerald |
| **Voar** | Fly | A gift on a Curitiba route | Quartz |

- **Key items:** Bilhete do Navio (the S.S. Ticket), Lente Espectral, Viola caipira, Amuleto Mestre, and the key to the prison ruins.
- **MTs:** every gym leader gives one (the TM role). Done: the MT pocket, reusable MTs, MT01 Rock Tomb (Topázio) and MT02 Bubble Jet (Marina). An MT fits creatures of its listed types plus an `also` list.
- **Fishing:** the Vara de Pescar from the Serra do Cipó fisherman works on any overworld water; `fishTable(y)` picks what bites. Better rods can come later.
- **Evolution stones are Brazilian gems,** sold in the Curitiba dept. store: Opala de Fogo, Água-marinha, Turmalina, Esmeralda and Pedra da Lua.

## Types and species

**Types.** Add the 7 remaining Gen-1 types: **Ice, Fighting, Poison, Ground, Psychic, Ghost** and **Dragon**. With the existing Dark type that makes 16. The chart in `src/data/types.ts` gets the Gen-2 values. Poison and Ground are done (0× immunities are handled in battle); Ice, Fighting, Psychic, Ghost and Dragon are left.

**Species.** The target is about 75 in total; there are 29 so far. They're introduced by region so each area feels local:

- **Minas caves:** Zubat → **Morceguinho** → **Morcegão** (Poison/Flying) ✓. Clefairy → **Luazinha** (Normal) ✓, which will evolve with a Pedra da Lua once evolution by item exists. The Lapinha fossils are a giant ground sloth (Rock/Ground) and a saber-tooth cat (Rock/Dark), both found at Lagoa Santa. The **Claw Fossil** and **Fang Fossil** key items are in; their species come with the Noronha fossil lab.
- **Rivers:** Magikarp → Gyarados becomes **Piabinha → Pirarucão** (Water → Water/Dark) ✓, caught by fishing. The river otters **Lontrinha → Ariranha** (Water) ✓. Voltorb becomes **Poraquê**, the electric eel.
- **Serras:** Ekans → **Jararaca → Jararacuçu** (Poison) ✓ and Oddish → **Canelinha → Canelão** (Grass, the canela-de-ema) ✓ on Route 4.
- **Rio and the coast:** Diglett → **Tatuzinho** (the three-banded armadillo, Ground); Mankey → **Macaco-prego** (the capuchin, Fighting); plus gulls.
- **Paraná:** Pineco → **Pinhãozinho** (the araucária pine cone). Eevee → **Saguizinho**, a gift that evolves with the gems.
- **Pantanal:** Kangaskhan → **Tamanduá-bandeira** (the giant anteater really does carry its baby on its back); Growlithe → **Guarazinho** (the maned wolf); plus a capybara, a caiman, a jaguar and a hyacinth macaw.
- **Found in several places:** Snorlax → **Preguiçudo** (the sloth); the Gastly line → **Visagem** (Ghost/Poison); Hitmonlee/Hitmonchan → **Ginga / Rasteira** (capoeira).
- **Abrolhos and Noronha:** a dolphin, a sea turtle, and a humpback whale in Lapras's role.
- **Amazon (endgame):** the Dratini line → **Minhoquinha → Minhocão → Boiúna** (Dragon).

**Legendaries.** Kanto's three birds become folklore spirits:

| Kanto | Here | Where |
|---|---|---|
| Articuno | An ice spirit | The Abrolhos caves |
| Zapdos | An electric spirit | The Itaipu power plant |
| Moltres | **Boitatá**, the fire serpent | The Chapada dos Veadeiros |

- **Mewtwo → Mula-sem-Cabeça:** a creature built in a Garimpo lab, found after the Champion in a deep cave near Diamantina.
- **Mew → Saci:** a hidden encounter.

## Elite Four: Liga Brasileira

One member per region, with levels on Kanto's curve (53–65):

| Kanto | Member | Type | From |
|---|---|---|---|
| Lorelei | **Geada** | Ice | Serra Gaúcha (RS), where it snows |
| Bruno | **Mestre Ginga** | Fighting | Salvador (BA), a capoeira master |
| Agatha | **Sinhá Benzedeira** | Ghost | Olinda (PE) |
| Lance | **Mestre Boiúna** | Dragon | Manaus (AM) |
| Blue | The rival | Mixed | Vila Pequi (MG) |

## Engine work needed

These are needed by every stage.

1. **Multiple outdoor maps.** Today the whole outdoors is one 32-tile-wide strip, now reaching Serra do Cipó at y -125 (`OW_Y0`). Do this before stage 3 leaves Minas (`OVERWORLD`, `OW_Y0`, and the `"overworld"` map id, used in about 58 places across 8 files).
   - Generalise it to named outdoor regions joined by edges or by scripted travel (ship, train, highway).
   - Keep `"overworld"` as the id for the current region so existing saves stay valid.
   - Each region should be able to have its own look: palette, water, beach sand, araucárias, cerrado.
2. **Encounter tables per map or zone.** Partly done: `encounterTable(map, y)` in `src/world/maps.ts` picks by map, and still by y on the overworld strip.
3. **Cave maps.** Done except darkness: interiors with `cave: true` get cave tiles, encounters on open floor, and ladders/holes paired in `CAVE_LINKS`. Darkness until Flash (Lampião) is still to do, for the Túnel da Serra do Mar.
4. **Raise `MAX_LEVEL` from 50 to 100** in `src/game/mon.ts`, to allow Kanto's level curve.
5. **Later systems:**
   - field moves;
   - an MT item pocket;
   - evolution by item;
   - Surf water traversal;
   - pushable boulders;
   - warp-tile puzzles;
   - gym locks and badge gates, reusing the badge-flag check the Ipê `worker` NPC already uses in `maps.ts`.

   Done: pool currents (`^ v < >` tiles in `pool: true` interiors, see `currentAt` and `slide`), MTs and fishing.

   The badge case already exists (`BADGE_FLAGS` in `src/ui/Menu.tsx`).

## Stage 2 (done)

- **Route 3** climbs from Route 2 to the **Gruta da Lapinha** (1F, B1F, B2F), with Garimpo grunts, Scientist Otávio and the fossil choice.
- The B1F north tunnel (`D`) comes out of a second cave mouth (`U`) onto **Route 4** (y -91 to -73): Picnicker Nina, a Garimpo grunt, and wild Jararaca, Canelinha, Pardalito, Ratiço and Lagartix at 13–16.
- **Serra do Cipó** (y -125 to -92): the Cachoeira da Farofa waterfall and pool, a Healing Center, a shop, the fisherman with the Vara de Pescar, and townsfolk hinting at stage 3.
- **Marina's arena** is a pool with stepping stones and currents. Swimmers Duda and Téo; Marina has Piabinha 18, Lontrinha 19 and Pirarucão 21, and gives the Aquamarine Badge and MT02.
- The rival waits at the north exit (Gavionte 17, Corujita 16, Ratiço 15, evolved starter 18). North of him, the unfinished **Ponte do Cipó** and a worker (`worker4`) block the way until stage 3.

**Next (stage 3):** finish the bridge (remove `worker4`), add the Ponte do Cipó trainers and the Garimpo recruiter, Seu Bento's cabin, and the robbed house.

## Polish backlog

Small changes to existing features, not tied to a stage.

- **Bigger badge gems.** Make the centre gems on the trainer-card badges even larger. Their radius is the `m.stone(r)` argument for each badge in `src/ui/Badges.tsx`. Grow the gold `circle(r)` setting behind each stone to match, and check that the Amethyst triangle still fits its setting.
