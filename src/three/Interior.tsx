// Indoor rooms built from the interior ASCII layouts. The south wall is left low so the
// 3/4 camera can see in, like the handheld games' cutaway rooms.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { INTERIORS } from "../world/maps";
import { flag, useGame, type MapId } from "../game/store";
import { STARTERS } from "../data/species";
import { Bx, Cy, Sph, glow, mat, GEO } from "./prims";
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
      return <Bx p={[x, 0.01, y]} s={[0.9, 0.02, 0.8]} c="#7a2a2a" shadow={false} />;
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
  return (
    <group position={[x, 0, y]}>
      <Bx p={[0, 0.45, -0.1]} s={[0.9, 0.9, 0.6]} c="#d0d0d8" />
      {HEAL_SLOTS.slice(0, n).map(([hx, hz]) => (
        <group key={`${hx},${hz}`} position={[hx, 0.97, hz - 0.1]} scale={0.07}>
          <AmuletModel glowing={lit} />
        </group>
      ))}
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
  const rows = def.rows;
  const H = rows.length;
  const W = rows[0].length;
  const items: JSX.Element[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x];
      if (ch === "#") {
        const north = y === 0;
        const south = y === H - 1;
        const h = south ? 0.25 : 1.9;
        items.push(<Bx key={`w${x},${y}`} p={[x, h / 2, y]} s={[1, h, 1]} c={north ? def.wall : "#e8dcc8"} />);
        if (north && x > 0 && x < W - 1 && x % 3 === 1) items.push(<Bx key={`win${x}`} p={[x, 1.2, y + 0.51]} s={[0.6, 0.5, 0.02]} c="#bfe6ff" shadow={false} />);
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
      <Preview />
    </group>
  );
}
