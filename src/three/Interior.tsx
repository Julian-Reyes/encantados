// Indoor rooms built from the interior ASCII layouts. The south wall is left low so the
// 3/4 camera can see in, like the handheld games' cutaway rooms.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { GROUND_ITEMS, INTERIORS } from "../world/maps";
import { flag, useGame, type MapId } from "../game/store";
import { STARTERS } from "../data/species";
import { Bx, Cn, Cy, Sph, Rk, glow, mat, GEO, CrystalCluster, MineCart } from "./prims";
import { AmuletModel } from "./Amulet";
import { CreatureModel } from "./Creatures";

const BOOK_COLORS = ["#c0392b", "#2f6fb0", "#27ae60", "#f2b632", "#8e44ad"];

function Furniture({ ch, x, y, map }: { ch: string; x: number; y: number; map: MapId }) {
  switch (ch) {
    case "b":
      return (
        <group position={[x, 0, y]}>
          <Bx p={[0, 0.8, -0.1]} s={[0.96, 1.6, 0.7]} c="#8a5a30" />
          {[0.35, 0.8, 1.25].map((h, i) => (
            <group key={i}>
              {[-0.3, -0.1, 0.1, 0.3].map((bx, j) => (
                <Bx key={j} p={[bx, h, 0.26]} s={[0.16, 0.34, 0.04]} c={BOOK_COLORS[(i * 4 + j + x) % 5]} shadow={false} />
              ))}
            </group>
          ))}
        </group>
      );
    case "v":
      return (
        <group position={[x, 0, y]}>
          <Bx p={[0, 0.25, -0.1]} s={[0.8, 0.5, 0.5]} c="#6a4a30" />
          <Bx p={[0, 0.8, -0.1]} s={[0.8, 0.6, 0.4]} c="#222" />
          <Bx p={[0, 0.8, 0.11]} s={[0.66, 0.46, 0.01]} c="#7ad0ff" g />
        </group>
      );
    case "s":
      return (
        <group position={[x, 0, y]}>
          {[0, 1, 2, 3].map((i) => (
            <Bx key={i} p={[0, 0.2 + i * 0.3, 0.3 - i * 0.22]} s={[0.96, 0.4 + i * 0.6, 0.24]} c="#a8743e" />
          ))}
        </group>
      );
    case "t":
      return (
        <group position={[x, 0, y]}>
          <Bx p={[0, 0.5, 0]} s={[1.02, 0.08, 1.02]} c="#b07a44" />
          <Bx p={[0, 0.25, 0]} s={[0.12, 0.5, 0.12]} c="#8a5a30" />
        </group>
      );
    case "B":
      return (
        <group position={[x, 0, y]}>
          <Bx p={[0, 0.25, 0]} s={[0.9, 0.5, 1.0]} c="#8a5a30" />
          <Bx p={[0, 0.52, 0.05]} s={[0.84, 0.08, 0.9]} c="#e05a5a" />
        </group>
      );
    case "f":
      return (
        <group position={[x, 0, y]}>
          <Cy p={[0, 0.18, 0]} s={[0.2, 0.36, 0.2]} c="#c0703a" />
          <Sph p={[0, 0.55, 0]} s={[0.3, 0.32, 0.3]} c="#3f9a3f" />
        </group>
      );
    case "r":
      return <Bx p={[x, 0.01, y]} s={[1, 0.02, 1]} c="#c0504a" shadow={false} />;
    case "d":
      return <Bx p={[x, 0.01, y]} s={[0.9, 0.02, 0.8]} c={map === "arena1" ? "#5a4028" : "#7a2a2a"} shadow={false} />;
    case "c":
      return (
        <group position={[x, 0, y]}>
          <Bx p={[0, 0.45, 0]} s={[1.0, 0.9, 0.8]} c={map.startsWith("mart") ? "#3a7bd5" : "#f09aa8"} />
          <Bx p={[0, 0.92, 0]} s={[1.02, 0.06, 0.86]} c="#f5f0e8" />
        </group>
      );
    case "h":
      return <HealMachine x={x} y={y} />;
    case "p":
      return (
        <group position={[x, 0, y]}>
          <Bx p={[0, 0.4, -0.1]} s={[0.8, 0.8, 0.6]} c="#c8c8d0" />
          <Bx p={[0, 1.05, -0.1]} s={[0.6, 0.45, 0.4]} c="#5a5a6a" />
          <Bx p={[0, 1.05, 0.11]} s={[0.5, 0.35, 0.01]} c="#7affc0" g />
        </group>
      );
    case "m":
      return (
        <group position={[x, 0, y]}>
          <Bx p={[0, 0.7, -0.1]} s={[0.9, 1.4, 0.6]} c="#9aa4b0" />
          <Bx p={[-0.15, 1.0, 0.21]} s={[0.3, 0.2, 0.01]} c="#7ad0ff" g />
          <Bx p={[0.2, 0.6, 0.21]} s={[0.08, 0.08, 0.01]} c={x % 2 ? "#ff5a5a" : "#5aff7a"} g />
        </group>
      );
    case "x":
      return (
        <group position={[x, 0, y]}>
          <Bx p={[0, 0.6, 0]} s={[0.9, 1.2, 0.8]} c="#e8e8e8" />
          {[0.35, 0.75, 1.1].map((h, i) => (
            <Bx key={i} p={[0, h, 0.35]} s={[0.8, 0.18, 0.12]} c={BOOK_COLORS[(i + x + y) % 5]} shadow={false} />
          ))}
        </group>
      );
    case "k":
      return (
        <group position={[x, 0, y]}>
          <Bx p={[0, 0.25, 0]} s={[1.0, 0.1, 0.5]} c="#b07a44" />
          <Bx p={[0, 0.12, 0]} s={[0.1, 0.25, 0.4]} c="#8a5a30" />
        </group>
      );
    case "a":
      return <StarterTable x={x} y={y} />;
    case "o":
      if (map === "arena1")
        return (
          <group>
            <Rk p={[x, 0.4, y]} s={[0.5, 0.5, 0.48]} r={[0.3, (x * 7 + y * 3) % 6, 0.2]} c="#7d7266" />
            {(x + y) % 3 === 0 && <CrystalCluster p={[x + 0.1, 0.65, y + 0.1]} s={0.35} />}
          </group>
        );
      return <mesh geometry={GEO.rock} material={mat("#9c8a70")} position={[x, 0.35, y]} scale={[0.5, 0.45, 0.48]} rotation={[0, (x * 7 + y * 3) % 6, 0]} castShadow receiveShadow />;
    default:
      return null;
  }
}

/** Six slots, filled in party order (top row left to right, then bottom). */
const HEAL_SLOTS = [-0.2, 0.05].flatMap((hz) => [-0.25, 0, 0.25].map((hx) => [hx, hz] as const));

function HealMachine({ x, y }: { x: number; y: number }) {
  const n = useGame((s) => s.healSlots);
  const lit = useGame((s) => s.healGlow);
  const glowRef = useRef<THREE.Group>(null);
  // While healing, a glowing copy of the amulets blinks on over the normal ones.
  useFrame(({ clock }) => {
    if (glowRef.current) glowRef.current.visible = Math.floor(clock.elapsedTime * 6) % 2 === 0;
  });
  const slots = HEAL_SLOTS.slice(0, n);
  return (
    <group position={[x, 0, y]}>
      <Bx p={[0, 0.45, -0.1]} s={[0.9, 0.9, 0.6]} c="#d0d0d8" />
      {slots.map(([hx, hz]) => (
        <group key={`${hx},${hz}`} position={[hx, 0.97, hz - 0.1]} scale={0.07}>
          <AmuletModel />
        </group>
      ))}
      {lit && (
        <group ref={glowRef}>
          {slots.map(([hx, hz]) => (
            <group key={`${hx},${hz}`} position={[hx, 0.97, hz - 0.1]} scale={0.075}>
              <AmuletModel glowing />
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

function StarterTable({ x, y }: { x: number; y: number }) {
  const party = useGame((s) => s.party.length);
  const starter = useGame((s) => s.starter);
  const flags = useGame((s) => s.flags);
  const species = STARTERS[x - 5];
  const taken = flag("hasStarter") || party > 0;
  // The rival's amulet stays until he picks it (older saves: he's already left the lab).
  const rivalTook = taken && (flag("rivalHasStarter") || !flag("rivalInLab"));
  // After both choices, only the amulet neither kid took is left on the table.
  const counter: Record<string, string> = { fagulho: "bolhuga", bolhuga: "brotapo", brotapo: "fagulho" };
  const show = !taken || (species !== starter && !(rivalTook && species === counter[starter ?? ""]));
  void flags;
  return (
    <group position={[x, 0, y]}>
      <Bx p={[0, 0.5, 0]} s={[1.02, 0.08, 0.9]} c="#b07a44" />
      <Bx p={[0, 0.25, 0]} s={[0.9, 0.5, 0.8]} c="#8a5a30" />
      {show && (
        <group position={[0, 0.66, 0.05]} scale={0.12}>
          <AmuletModel />
        </group>
      )}
    </group>
  );
}

const ROCK_TONES = ["#5e554b", "#6b6156", "#51493f"];

/** Cave wall tile: a stone block with a boulder bulging out of its inner face. */
function MineWall({ x, y, H, c, doorX }: { x: number; y: number; H: number; c: string; doorX: number }) {
  const south = y === H - 1;
  const h = south ? 0.25 : 1.9;
  const tone = ROCK_TONES[(x * 2 + y) % 3];
  const r: [number, number, number] = [(x * 3 + y) % 5, (x * 7 + y * 3) % 6, (x + y * 5) % 4];
  let rock: JSX.Element | null;
  if (y === 0 && Math.abs(x - doorX) <= 1) rock = null; // recess for the leader's topaz vein
  else if (south) rock = <Rk p={[x, 0.22, y]} s={[0.55, 0.3, 0.5]} r={r} c={tone} />;
  else if (y === 0) rock = <Rk p={[x, 1.0 + ((x * 5) % 3) * 0.15, y + 0.25]} s={[0.75, 1.0, 0.55]} r={r} c={tone} />;
  else rock = <Rk p={[x + (x === 0 ? 0.22 : -0.22), 1.0 + ((y * 5) % 3) * 0.15, y]} s={[0.55, 1.0, 0.75]} r={r} c={tone} />;
  return (
    <group>
      <Bx p={[x, h / 2, y]} s={[1, h, 1]} c={c} />
      {rock}
    </group>
  );
}

const WOOD = "#6b4a2a";

function Lantern({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <Bx s={[0.16, 0.22, 0.16]} c="#3a3a3a" shadow={false} />
      <Bx s={[0.12, 0.16, 0.18]} c="#ffcf6a" g />
    </group>
  );
}

/** Timber shoring, lanterns, the rail line and the topaz vein behind the leader. */
function MineDecor({ W, H, doorX, cartY }: { W: number; H: number; doorX: number; cartY: number }) {
  const sides = [0.62, W - 1.62];
  const posts = [2, 5, 8].filter((y) => y < H - 1);
  const railFrom = cartY + 0.3;
  const railTo = H - 1.5;
  const sleepers: number[] = [];
  for (let z = railFrom + 0.15; z < railTo; z += 0.4) sleepers.push(z);
  return (
    <group>
      {/* side-wall shoring */}
      {sides.map((sx) => (
        <group key={sx}>
          {posts.map((y) => (
            <Bx key={y} p={[sx, 0.95, y]} s={[0.14, 1.9, 0.14]} c={WOOD} />
          ))}
          <Bx p={[sx, 1.86, (posts[0] + posts[posts.length - 1]) / 2]} s={[0.16, 0.14, posts[posts.length - 1] - posts[0] + 0.3]} c={WOOD} />
          <Lantern p={[sx + (sx < W / 2 ? 0.14 : -0.14), 1.45, posts[1] ?? posts[0]]} />
        </group>
      ))}
      {/* back-wall frame around the leader's topaz vein */}
      {[doorX - 3, doorX + 3].map((x) => (
        <group key={x}>
          <Bx p={[x, 0.95, 0.62]} s={[0.14, 1.9, 0.14]} c={WOOD} />
          <Lantern p={[x, 1.45, 0.76]} />
        </group>
      ))}
      <Bx p={[doorX, 1.86, 0.64]} s={[6.3, 0.16, 0.16]} c={WOOD} />
      <CrystalCluster p={[doorX, 0.55, 0.62]} s={1.0} tip />
      <CrystalCluster p={[doorX - 1.5, 0.9, 0.6]} s={0.5} />
      <CrystalCluster p={[doorX + 1.6, 0.8, 0.6]} s={0.55} />
      {/* rails from the door to the cart */}
      {[-0.25, 0.25].map((dx) => (
        <Bx key={dx} p={[doorX + dx, 0.05, (railFrom + railTo) / 2]} s={[0.05, 0.04, railTo - railFrom]} c="#8a8a8a" shadow={false} />
      ))}
      {sleepers.map((z) => (
        <Bx key={z} p={[doorX, 0.02, z]} s={[0.7, 0.03, 0.1]} c={WOOD} shadow={false} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- caves
// Walls stay low (under ~1.3) so the follow camera can see the player over the rock just south.
const CALCITE = "#d7eef2";
const CALCITE_DIM = "#a9cdd6";

function CaveWall({ x, y, H, c }: { x: number; y: number; H: number; c: string }) {
  const south = y === H - 1;
  const h = south ? 0.3 : 0.9;
  const k = (x * 7 + y * 13) % 5;
  const tone = ROCK_TONES[(x + y * 2) % 3];
  return (
    <group>
      <Bx p={[x, h / 2, y]} s={[1, h, 1]} c={c} />
      {!south && <Rk p={[x + (k - 2) * 0.06, h + 0.1 + k * 0.03, y]} s={[0.52, 0.28 + k * 0.03, 0.52]} r={[k, x % 6, y % 4]} c={tone} />}
    </group>
  );
}

function Ladder() {
  return (
    <group>
      {[-0.22, 0.22].map((dx) => (
        <Bx key={dx} p={[dx, 0.9, -0.3]} r={[-0.25, 0, 0]} s={[0.07, 1.9, 0.07]} c={WOOD} />
      ))}
      {[0.25, 0.6, 0.95, 1.3, 1.65].map((h) => (
        <Bx key={h} p={[0, h, -0.3 - (h - 0.9) * 0.255]} s={[0.44, 0.05, 0.06]} c={WOOD} />
      ))}
      {/* daylight from the floor above */}
      <mesh position={[0, 0.02, -0.1]} rotation={[-Math.PI / 2, 0, 0]} material={glow("#fff2c0", 0.18)}>
        <circleGeometry args={[0.45, 16]} />
      </mesh>
    </group>
  );
}

function Hole() {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glow("#050403")}>
        <circleGeometry args={[0.38, 16]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Rk key={i} p={[Math.cos(i * 1.05) * 0.42, 0.05, Math.sin(i * 1.05) * 0.42]} s={[0.14, 0.08, 0.12]} r={[i, i * 2, 0]} c={ROCK_TONES[i % 3]} />
      ))}
    </group>
  );
}

function Fossil({ x }: { x: number }) {
  const taken = useGame((s) => !!s.flags.fossilTaken);
  return (
    <group>
      <Rk p={[0, 0.12, 0]} s={[0.45, 0.2, 0.4]} r={[0, x, 0]} c="#8a7d68" />
      {!taken &&
        (x === 2 ? (
          // a sloth's hooked claw
          <group position={[0, 0.3, 0.02]} rotation={[0, 0.4, 0]} scale={1.6}>
            {[-0.08, 0, 0.08].map((dx, i) => (
              <Cn key={dx} p={[dx, 0.08, 0.04 * i]} s={[0.035, 0.2, 0.035]} r={[0.9, 0, 0]} c="#efe4c8" />
            ))}
            <Sph s={[0.14, 0.06, 0.1]} c="#e0d4b4" />
          </group>
        ) : (
          // a long saber fang
          <group position={[0, 0.3, 0.02]} rotation={[0, -0.3, 0.2]} scale={1.6}>
            <Cn p={[0, 0.14, 0]} s={[0.05, 0.32, 0.04]} r={[0, 0, 0.25]} c="#f2ead4" />
            <Sph p={[-0.02, 0, 0]} s={[0.1, 0.06, 0.08]} c="#e0d4b4" />
          </group>
        ))}
    </group>
  );
}

function CaveItems({ map }: { map: MapId }) {
  const flags = useGame((s) => s.flags);
  return (
    <>
      {GROUND_ITEMS.filter((i) => i.map === map && !flags["item_" + i.id]).map((i) => (
        <group key={i.id} position={[i.x, 0.16, i.y]} scale={0.15} rotation={[0.3, 0.4, 0]}>
          <AmuletModel great={i.item === "superamuleto"} />
        </group>
      ))}
    </>
  );
}

function CaveView({ map }: { map: MapId }) {
  const def = INTERIORS[map as Exclude<MapId, "overworld">];
  const rows = def.rows;
  const H = rows.length;
  const W = rows[0].length;
  const at = (x: number, y: number) => rows[y]?.[x] ?? "#";
  const items: JSX.Element[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x];
      const key = `${x},${y}`;
      if (ch === "#") {
        items.push(<CaveWall key={key} x={x} y={y} H={H} c={def.wall} />);
        // Lanterns hang on some wall faces that look onto the floor.
        if (y < H - 1 && at(x, y + 1) === "." && (x * 7 + y * 3) % 9 === 0) items.push(<Lantern key={`l${key}`} p={[x, 0.75, y + 0.56]} />);
      } else if (ch === "o") items.push(<Rk key={key} p={[x, 0.32, y]} s={[0.5, 0.42, 0.48]} r={[0.3, (x * 7 + y * 3) % 6, 0.2]} c={ROCK_TONES[(x + y) % 3]} />);
      else if (ch === "*") items.push(<CrystalCluster key={key} p={[x, 0.2, y]} s={0.55} topaz={CALCITE} accent={CALCITE_DIM} />);
      else if (ch === "U")
        items.push(
          <group key={key} position={[x, 0, y]}>
            <Ladder />
          </group>,
        );
      else if (ch === "H")
        items.push(
          <group key={key} position={[x, 0, y]}>
            <Hole />
          </group>,
        );
      else if (ch === "X")
        items.push(
          <group key={key} position={[x, 0, y]}>
            {[[-0.3, 0.3, 0.1], [0.25, 0.35, 0], [0, 0.75, -0.1], [0.3, 0.2, 0.35], [-0.25, 0.15, 0.4]].map(([dx, h, dz], i) => (
              <Rk key={i} p={[dx, h, dz]} s={[0.35, 0.3, 0.32]} r={[i, i * 2, i]} c={ROCK_TONES[i % 3]} />
            ))}
          </group>,
        );
      else if (ch === "Z")
        items.push(
          <group key={key} position={[x, 0, y]}>
            <Fossil x={x} />
          </group>,
        );
      else if (ch === "d")
        items.push(
          <mesh key={key} position={[x, 0.01, y]} rotation={[-Math.PI / 2, 0, 0]} material={glow("#fff2c0", 0.3)}>
            <planeGeometry args={[1, 1]} />
          </mesh>,
        );
    }
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(W - 1) / 2, 0, (H - 1) / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshLambertMaterial color={def.floor} />
      </mesh>
      {items}
      <CaveItems map={map} />
    </group>
  );
}

function Preview() {
  const preview = useGame((s) => s.preview);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 1.5) * 0.5;
  });
  if (!preview) return null;
  const x = 5 + STARTERS.indexOf(preview);
  return (
    <group position={[x, 0.62, 3.1]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glow("#fff6c0", 0.5)}>
        <circleGeometry args={[0.45, 20]} />
      </mesh>
      <group ref={ref} scale={0.75}>
        <CreatureModel species={preview} />
      </group>
    </group>
  );
}

export function InteriorView({ map }: { map: MapId }) {
  const def = INTERIORS[map as Exclude<MapId, "overworld">];
  if (def.cave) return <CaveView map={map} />;
  const rows = def.rows;
  const H = rows.length;
  const W = rows[0].length;
  const items: JSX.Element[] = [];
  // The arena is a mine: rails run north from the door to a cart standing in the first boulder's spot.
  const mine = map === "arena1";
  const doorX = rows[H - 1].indexOf("d");
  let cartY = H - 2;
  while (cartY > 0 && rows[cartY][doorX] === ".") cartY--;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x];
      if (ch === "#" && mine) {
        items.push(<MineWall key={`w${x},${y}`} x={x} y={y} H={H} c={def.wall} doorX={doorX} />);
      } else if (ch === "#") {
        const north = y === 0;
        const south = y === H - 1;
        const h = south ? 0.25 : 1.9;
        items.push(<Bx key={`w${x},${y}`} p={[x, h / 2, y]} s={[1, h, 1]} c={north ? def.wall : "#e8dcc8"} />);
        if (north && x > 0 && x < W - 1 && x % 3 === 1) items.push(<Bx key={`win${x}`} p={[x, 1.2, y + 0.51]} s={[0.6, 0.5, 0.02]} c="#bfe6ff" shadow={false} />);
      } else if (mine && ch === "o" && x === doorX && y === cartY) {
        items.push(
          <group key={`f${x},${y}`} position={[x, 0, y]}>
            <MineCart />
          </group>,
        );
      } else {
        items.push(<Furniture key={`f${x},${y}`} ch={ch} x={x} y={y} map={map} />);
      }
    }
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(W - 1) / 2, 0, (H - 1) / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshLambertMaterial color={def.floor} />
      </mesh>
      {items}
      {mine && <MineDecor W={W} H={H} doorX={doorX} cartY={cartY} />}
      <Preview />
    </group>
  );
}
