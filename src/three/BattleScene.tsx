// The battle stage: a set built for where the fight happens (route clearing, cave, gym pit),
// both trainers on the field, light shafts and dust, move effects, and a camera that leans
// toward whoever is acting. Placed far from the overworld so both can stay mounted.

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bv, ANIM_MS, now, type SideVis } from "./battleVis";
import { CreatureModel } from "./Creatures";
import { AmuletModel } from "./Amulet";
import { Humanoid, type HumanPose } from "./Characters";
import { Bx, Cn, Cy, Sph, glow, mat, GEO, CrystalCluster, TOPAZ } from "./prims";
import { useGame, type MapId } from "../game/store";
import { INTERIORS, NPCS, isCave, isPool, type Look } from "../world/maps";
import { currentBattle } from "../game/flow";
import { TYPES, type TypeId } from "../data/types";
import type { AnimKind, Side } from "../game/battle";

export const BATTLE_ORIGIN = new THREE.Vector3(500, 0, 500);
const O = BATTLE_ORIGIN;
const POS: Record<Side, THREE.Vector3> = {
  enemy: new THREE.Vector3(1.7, 0, -1.6),
  player: new THREE.Vector3(-1.5, 0, 1.5),
};
const ROT: Record<Side, number> = { enemy: -0.35, player: Math.PI - 0.55 };
const SCALE: Record<Side, number> = { enemy: 1.3, player: 1.3 };
/** Each trainer stands behind and to the outside of their creature. */
const TRAINER: Record<Side, THREE.Vector3> = {
  player: new THREE.Vector3(-2.45, 0, 2.6),
  enemy: new THREE.Vector3(3.0, 0, -3.05),
};
const HAND: Record<Side, THREE.Vector3> = {
  player: new THREE.Vector3(-2.2, 1.2, 2.35),
  enemy: new THREE.Vector3(2.75, 1.2, -2.8),
};
const other = (s: Side): Side => (s === "player" ? "enemy" : "player");

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const prog = (s: { t0: number }, kind: AnimKind) => Math.min(1, Math.max(0, (now() - s.t0) / (ANIM_MS[kind] / 1000)));
/** Deterministic 0..1 noise so the sets are laid out the same every battle. */
const rnd = (i: number, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// ---------------------------------------------------------------- stages

export type Stage = "route" | "cave" | "gym" | "pool";
export const stageOf = (map: MapId): Stage => (isPool(map) ? "pool" : map.startsWith("arena") ? "gym" : isCave(map) ? "cave" : "route");

/** Sky, fog and light settings per stage, applied by the shared rig in Scene.tsx. Fog is measured past the point the camera looks at. */
export const STAGE_LIGHT: Record<Stage, { sky: string; fog: [number, number]; hemi: number; sun: number; sunColor: string; sunFrom: [number, number, number] }> = {
  route: { sky: "#bfe8ff", fog: [16, 50], hemi: 1.2, sun: 2.0, sunColor: "#fff1d6", sunFrom: [-4, 12, -5] },
  cave: { sky: "#120e0b", fog: [2, 16], hemi: 0.5, sun: 1.5, sunColor: "#ffe2b0", sunFrom: [-3, 12, -6] },
  gym: { sky: "#2a2119", fog: [4, 20], hemi: 0.7, sun: 1.8, sunColor: "#ffd9a0", sunFrom: [-5, 12, -6] },
  pool: { sky: "#cfeaf5", fog: [10, 34], hemi: 1.1, sun: 1.7, sunColor: "#f2fbff", sunFrom: [-4, 12, -5] },
};

type Item = [number, number, number, number, number, number, number]; // x y z sx sy sz rotY

/** One instanced mesh for a pile of identical props. */
function Scatter({ geo, color, items, shadow = true }: { geo: THREE.BufferGeometry; color: string; items: Item[]; shadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    items.forEach(([x, y, z, sx, sy, sz, ry], i) => {
      d.position.set(x, y, z);
      d.scale.set(sx, sy, sz);
      d.rotation.set(0, ry, 0);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, mat(color), items.length]} castShadow={shadow} receiveShadow />;
}

function Ground({ color, clearing, patch }: { color: string; clearing: string; patch: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[40, 40]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* the worn arena between the two sides */}
      <mesh rotation={[-Math.PI / 2, 0, -0.78]} position={[0.1, -0.04, -0.05]} scale={[5.2, 3.6, 1]} receiveShadow>
        <circleGeometry args={[1, 40]} />
        <meshLambertMaterial color={clearing} />
      </mesh>
      {(["player", "enemy"] as Side[]).map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[POS[s].x, -0.03, POS[s].z]} scale={[0.85, 0.65, 1]} receiveShadow>
          <circleGeometry args={[1, 24]} />
          <meshLambertMaterial color={patch} />
        </mesh>
      ))}
    </group>
  );
}

/** Returns true when (x, z) is clear of the fighting area and the trainers. */
const outsideArena = (x: number, z: number, pad = 0) => {
  const a = -0.78;
  const u = x * Math.cos(a) - z * Math.sin(a);
  const v = x * Math.sin(a) + z * Math.cos(a);
  return (u / (5.6 + pad)) ** 2 + (v / (4.0 + pad)) ** 2 > 1;
};

function RouteStage() {
  const { tufts, rocks, flowers, trees } = useMemo(() => {
    const tufts: Item[] = [];
    const rocks: Item[] = [];
    const flowers: Record<string, Item[]> = { "#ff8ac8": [], "#fff27a": [], "#ffffff": [] };
    for (let i = 0; tufts.length < 180 && i < 900; i++) {
      const x = -11 + rnd(i, 1) * 22;
      const z = -12 + rnd(i, 2) * 17;
      if (!outsideArena(x, z)) continue;
      for (let b = 0; b < 3; b++) tufts.push([x + (b - 1) * 0.12, 0.2, z + rnd(i, b + 3) * 0.1, 0.09, 0.45 + rnd(i, b) * 0.25, 0.09, rnd(i, b + 7) * 6]);
    }
    for (let i = 0; i < 70; i++) {
      const x = -9 + rnd(i, 11) * 18;
      const z = -10 + rnd(i, 12) * 14;
      if (!outsideArena(x, z, -0.6)) continue;
      const cols = Object.keys(flowers);
      flowers[cols[i % 3]].push([x, 0.08, z, 0.06, 0.06, 0.06, 0]);
    }
    for (let i = 0; i < 14; i++) {
      const a = -2.4 + (i / 13) * 4.8;
      const r = 6.2 + rnd(i, 21) * 2.5;
      const k = 0.25 + rnd(i, 22) * 0.35;
      rocks.push([Math.sin(a) * r, k * 0.5, -Math.cos(a) * r, k, k * 0.8, k, rnd(i, 23) * 6]);
    }
    const trees: [number, number, number, string][] = [];
    for (let i = 0; i < 30; i++) {
      const a = -1.5 + (i / 29) * 3.0;
      const r = 12 + rnd(i, 31) * 4;
      trees.push([Math.sin(a) * r, 0, -Math.cos(a) * r, ["#3f8f3a", "#4c9c3e", "#357f35", "#e35fb0", "#5aa845"][i % 5]]);
    }
    return { tufts, rocks, flowers, trees };
  }, []);
  return (
    <group>
      <Ground color="#8cc865" clearing="#c7ad7b" patch="#b29668" />
      <Scatter geo={GEO.cone} color="#4f9e3c" items={tufts.filter((_, i) => i % 2 === 0)} />
      <Scatter geo={GEO.cone} color="#6bb84a" items={tufts.filter((_, i) => i % 2 === 1)} />
      <Scatter geo={GEO.rock} color="#9a948a" items={rocks} />
      {Object.entries(flowers).map(([c, items]) => (
        <Scatter key={c} geo={GEO.sphere} color={c} items={items} shadow={false} />
      ))}
      {trees.map(([x, y, z, c], i) => (
        <group key={i} position={[x, y, z]}>
          <Cy p={[0, 0.8, 0]} s={[0.18, 1.6, 0.18]} c="#7a5230" />
          <Sph p={[0, 2.2, 0]} s={[1.2, 1.05, 1.2]} c={c} />
        </group>
      ))}
      <Sph p={[-14, -2, -24]} s={[14, 6, 6]} c="#7fb86a" />
      <Sph p={[12, -2.5, -26]} s={[16, 7, 6]} c="#73ad5f" />
      <Motes color="#fff6c8" count={70} box={[-6, 0.2, -6, 6, 3, 3]} size={0.05} />
    </group>
  );
}

/** Marina's arena: a tiled deck over a pool, with a waterfall on the back wall and pale blue stands. */
function PoolStage() {
  const stands = useMemo(() => {
    const out: Record<string, Item[]> = { "#d4eaf2": [], "#b8dcea": [], "#9ccbe0": [] };
    const keys = Object.keys(out);
    for (let t = 0; t < 3; t++) {
      const r = 8.2 + t * 1.1;
      const h = 0.5 + t * 0.6;
      for (let i = 0; i < 30; i++) {
        const a = -2.5 + (i / 29) * 5;
        out[keys[t]].push([Math.sin(a) * r, h / 2, -Math.cos(a) * r, 1.3, h, 1.1, -a]);
      }
    }
    return out;
  }, []);
  const fall = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    fall.current?.children.forEach((c, i) => {
      c.position.y = 5 - ((clock.elapsedTime * 1.2 + rnd(i, 71)) % 1) * 5;
    });
  });
  return (
    <group>
      {/* the pool, and a deck of pale tiles where the fight happens */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <circleGeometry args={[40, 40]} />
        <meshLambertMaterial color="#2a7ab0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} material={glow("#5ab4e8", 0.75)}>
        <circleGeometry args={[40, 40]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -0.78]} position={[0.1, -0.04, -0.05]} scale={[5.6, 4.0, 1]} receiveShadow>
        <circleGeometry args={[1, 40]} />
        <meshLambertMaterial color="#e6f3f7" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -0.78]} position={[0.1, -0.035, -0.05]} scale={[4.4, 2.9, 1]} receiveShadow>
        <ringGeometry args={[0.93, 1, 40]} />
        <meshLambertMaterial color="#2a6a9a" />
      </mesh>
      {(["player", "enemy"] as Side[]).map((sd) => (
        <mesh key={sd} rotation={[-Math.PI / 2, 0, 0]} position={[POS[sd].x, -0.03, POS[sd].z]} scale={[0.85, 0.65, 1]} receiveShadow>
          <circleGeometry args={[1, 24]} />
          <meshLambertMaterial color="#cfe6ee" />
        </mesh>
      ))}
      {Object.entries(stands).map(([c, items]) => (
        <Scatter key={c} geo={GEO.box} color={c} items={items} />
      ))}
      {/* stepping stones out in the water */}
      {[[-5.2, -2.2], [-4.4, -4.0], [5.6, 1.2], [4.9, 3.0], [-6.2, 1.4]].map(([x, z], i) => (
        <Cy key={i} p={[x, -0.08, z]} s={[0.5, 0.2, 0.5]} c="#9aa4a8" />
      ))}
      {/* back wall with the waterfall pouring into the pool */}
      <Bx p={[0, 2.5, -11]} s={[14, 5, 0.4]} c="#b8dcea" />
      <mesh position={[0.5, 2.5, -10.75]} material={glow("#bfe8ff", 0.88)}>
        <planeGeometry args={[4, 5]} />
      </mesh>
      <group ref={fall}>
        {Array.from({ length: 14 }, (_, i) => (
          <Bx key={i} p={[-1.4 + rnd(i, 72) * 3.8, 2.5, -10.7]} s={[0.08, 0.7, 0.02]} c="#ffffff" g shadow={false} />
        ))}
      </group>
      {[-1.2, -0.2, 0.9, 2.0].map((x, i) => (
        <Sph key={x} p={[x, -0.05, -10.2]} s={[0.6 + (i % 2) * 0.2, 0.3, 0.5]} c="#f4fbff" g />
      ))}
      <group position={[0.5, 5.4, -10.7]}>
        <Sph p={[0, 0.1, 0]} s={[0.35, 0.45, 0.18]} c="#7cc4f0" />
        <Cn p={[0, -0.35, 0]} s={[0.33, 0.45, 0.18]} r={[Math.PI, 0, 0]} c="#5aaede" />
      </group>
      <Motes color="#e8f7ff" count={50} box={[-6, 0.2, -6, 6, 3, 3]} size={0.05} />
    </group>
  );
}

/** A rock bowl lit by shafts from cracks in the roof. */
function CaveStage({ map }: { map: MapId }) {
  const cave = INTERIORS[map as Exclude<MapId, "overworld">];
  const floor = cave?.floor ?? "#6e6253";
  const wall = cave?.wall ?? "#5a4f43";
  const { boulders, spikes } = useMemo(() => {
    const boulders: Item[] = [];
    const spikes: Item[] = [];
    for (let tier = 0; tier < 3; tier++) {
      for (let i = 0; i < 26; i++) {
        const a = -2.5 + (i / 25) * 5.0 + rnd(i, tier) * 0.1;
        const r = 6.2 + tier * 1.3 + rnd(i, tier + 5) * 0.6;
        const k = 0.9 + tier * 0.45 + rnd(i, tier + 9) * 0.5;
        boulders.push([Math.sin(a) * r, k * 0.45 + tier * 0.55, -Math.cos(a) * r, k, k * 1.1, k, rnd(i, tier + 13) * 6]);
      }
    }
    for (let i = 0; i < 16; i++) {
      const a = -2.2 + (i / 15) * 4.4;
      const r = 5.3 + rnd(i, 41) * 1.2;
      const h = 0.6 + rnd(i, 42) * 1.1;
      spikes.push([Math.sin(a) * r, h / 2, -Math.cos(a) * r, 0.22 + rnd(i, 43) * 0.15, h, 0.22 + rnd(i, 44) * 0.15, rnd(i, 45) * 6]);
    }
    return { boulders, spikes };
  }, []);
  const tones = [wall, "#6b6156", "#4d453b"];
  return (
    <group>
      <Ground color={floor} clearing="#8f8270" patch="#7b6f5e" />
      {tones.map((c, t) => (
        <Scatter key={t} geo={GEO.rock} color={c} items={boulders.filter((_, i) => i % 3 === t)} />
      ))}
      <Scatter geo={GEO.cone} color="#7d7264" items={spikes} />
      {[[-4.6, -5.2], [3.8, -5.8], [5.6, -2.8], [-6.0, -2.4]].map(([x, z], i) => (
        <CrystalCluster key={i} p={[x, 0.3, z]} s={0.8} topaz="#d7eef2" accent="#a9cdd6" />
      ))}
      <Shaft from={[-3.2, 9, -7]} to={[-0.4, 0, -0.6]} r={[0.45, 1.5]} color="#ffe9c0" opacity={0.45} />
      <Shaft from={[4.5, 9, -8]} to={[2.2, 0, -2.4]} r={[0.3, 0.95]} color="#cfe8ff" opacity={0.35} phase={2} />
      <pointLight position={[-0.4, 1.3, -0.6]} color="#ffd79a" intensity={6} distance={7} decay={1.4} />
      <pointLight position={[-5, 1, -4]} color="#9fd8ff" intensity={3} distance={5} decay={1.4} />
      <Motes color="#ffe2b0" count={120} box={[-3.5, 0.2, -5, 2.5, 5, 1]} size={0.045} />
    </group>
  );
}

const WOOD = "#6b4a2a";
const STEEL = "#3a4a6a";

/** The mine-arena gym: a sunken dirt pit ringed by stepped rock, with the leader's deck at the back. */
function GymStage() {
  const tiers = useMemo(() => {
    const out: Record<string, Item[]> = { "#8d8478": [], "#7a7065": [], "#a39a8c": [] };
    const keys = Object.keys(out);
    for (let t = 0; t < 3; t++) {
      const r = 6 + t * 1.25;
      const h = 0.45 + t * 0.55;
      for (let i = 0; i < 30; i++) {
        const a = -2.5 + (i / 29) * 5;
        const x = Math.sin(a) * r;
        const z = -Math.cos(a) * r;
        // the deck sits in the back-right, so the terraces stop there
        if (x > -1.2 && z < -4.4) continue;
        out[keys[(i + t) % 3]].push([x, h / 2, z, 1.25, h + rnd(i, t) * 0.25, 1.3, -a]);
      }
    }
    return out;
  }, []);
  const boulders = useMemo(() => {
    const out: Item[] = [];
    for (let i = 0; i < 18; i++) {
      const a = -2.4 + rnd(i, 51) * 4.8;
      const r = 5.6 + rnd(i, 52) * 2.6;
      const x = Math.sin(a) * r;
      const z = -Math.cos(a) * r;
      if (x > -1.2 && z < -4.4) continue;
      const k = 0.25 + rnd(i, 53) * 0.35;
      out.push([x, 0.3 + (r - 5.6) * 0.5, z, k, k * 0.8, k, rnd(i, 54) * 6]);
    }
    return out;
  }, []);
  const books = ["#c8453a", "#3a7bd5", "#f2b632", "#5ab07a", "#8a5ab0"];
  return (
    <group>
      <Ground color="#8a7358" clearing="#a88a64" patch="#957a58" />
      {Object.entries(tiers).map(([c, items]) => (
        <Scatter key={c} geo={GEO.box} color={c} items={items} />
      ))}
      <Scatter geo={GEO.rock} color="#6f665b" items={boulders} />

      {/* the leader's raised deck, back right */}
      <group position={[3.2, 0, -6.6]}>
        <Bx p={[0, 0.5, 0]} s={[7.5, 1.0, 3.6]} c="#8d8478" />
        <Bx p={[0, 1.02, 0]} s={[7.5, 0.06, 3.6]} c="#b58a55" />
        {[-3, -1.5, 0, 1.5, 3].map((x) => (
          <Bx key={x} p={[x, 1.06, 0]} s={[0.03, 0.02, 3.6]} c="#8a6238" shadow={false} />
        ))}
        {/* stairs down to the pit, with red rails */}
        {[0, 1, 2, 3].map((i) => (
          <Bx key={i} p={[-1.6, 0.125 + i * 0.25, 2.35 - i * 0.28]} s={[1.3, 0.25, 0.3]} c="#9c9384" />
        ))}
        {[-2.3, -0.9].map((x) => (
          <Bx key={x} p={[x, 0.75, 2.0]} s={[0.1, 0.12, 1.3]} r={[0.7, 0, 0]} c="#c0392b" />
        ))}
        {/* back wall with steel posts */}
        <Bx p={[0, 2.2, -1.9]} s={[8.5, 4.4, 0.2]} c="#d8c7a2" />
        <Bx p={[0, 4.3, -1.75]} s={[8.5, 0.25, 0.3]} c={STEEL} />
        {[-4, 0, 4].map((x) => (
          <Bx key={x} p={[x, 2.2, -1.72]} s={[0.3, 4.4, 0.3]} c={STEEL} />
        ))}
        {/* bookshelves */}
        {[-2.6, -1.3, 0.8, 2.1].map((x, i) => (
          <group key={x} position={[x, 1.05, -1.5]}>
            <Bx p={[0, 0.7, 0]} s={[1.15, 1.4, 0.4]} c={WOOD} />
            {[0.35, 0.8, 1.2].map((y, r) => (
              <group key={y}>
                <Bx p={[0, y - 0.13, 0.05]} s={[1.05, 0.03, 0.34]} c="#4a321c" shadow={false} />
                {[0, 1, 2, 3, 4, 5].map((b) => (
                  <Bx key={b} p={[-0.4 + b * 0.16, y, 0.08]} s={[0.1, 0.24, 0.26]} c={books[(b + r + i) % 5]} shadow={false} />
                ))}
              </group>
            ))}
          </group>
        ))}
        {/* rug, low table, and the leader's topaz */}
        <Bx p={[0.6, 1.07, 0.5]} s={[3.0, 0.02, 1.6]} c="#3f8a52" shadow={false} />
        <Bx p={[0.6, 1.08, 0.5]} s={[2.6, 0.02, 1.2]} c="#56a868" shadow={false} />
        <Bx p={[0.6, 1.3, 0.5]} s={[1.3, 0.1, 0.6]} c="#8a5a30" />
        {[-0.5, 0.5].map((dx) => (
          <Bx key={dx} p={[0.6 + dx, 1.17, 0.5]} s={[0.08, 0.2, 0.5]} c="#6a4220" />
        ))}
        <CrystalCluster p={[3.2, 1.3, -0.9]} s={0.7} topaz={TOPAZ} tip />
        <Lantern p={[-3.9, 1.8, -1.45]} />
        <Lantern p={[3.9, 1.8, -1.45]} />
      </group>

      {/* skylights: beams fall into the pit from the upper left */}
      <Shaft from={[-5.5, 10, -8]} to={[-1.2, 0, -0.9]} r={[0.6, 1.35]} color="#ffe6b0" opacity={0.4} />
      <Shaft from={[-3.6, 10, -9]} to={[0.6, 0, -1.8]} r={[0.6, 1.35]} color="#ffe6b0" opacity={0.4} phase={1.3} />
      <Shaft from={[-1.7, 10, -10]} to={[2.3, 0, -2.8]} r={[0.5, 1.15]} color="#ffe6b0" opacity={0.32} phase={2.4} />
      <pointLight position={[-0.3, 1.5, -1.2]} color="#ffcf8a" intensity={7} distance={8} decay={1.4} />
      <Motes color="#ffe7b8" count={160} box={[-4, 0.2, -5, 3, 5, 1]} size={0.05} />
    </group>
  );
}

function Lantern({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <Bx s={[0.2, 0.28, 0.2]} c="#3a3a3a" shadow={false} />
      <Bx s={[0.15, 0.2, 0.22]} c="#ffcf6a" g />
    </group>
  );
}

// ---------------------------------------------------------------- light

const SHAFT_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const SHAFT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  float edge = pow(abs(dot(vN, vV)), 1.6);
  float along = smoothstep(0.0, 0.3, vUv.y) * (0.5 + 0.5 * vUv.y);
  gl_FragColor = vec4(uColor, uOpacity * edge * along);
}`;

/** A soft, additive cone of light from `from` (narrow end) down to `to`, with a pool where it lands. */
function Shaft({ from, to, r, color, opacity, phase = 0 }: { from: [number, number, number]; to: [number, number, number]; r: [number, number]; color: string; opacity: number; phase?: number }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(b).normalize());
  const geo = useMemo(() => new THREE.CylinderGeometry(r[0], r[1], len, 20, 1, true), [r[0], r[1], len]);
  const shaftMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
        vertexShader: SHAFT_VERT,
        fragmentShader: SHAFT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [color, opacity],
  );
  const poolMat = useMemo(() => new THREE.MeshBasicMaterial({ color, map: softDot(), transparent: true, opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending }), [color, opacity]);
  useFrame(({ clock }) => {
    const k = 0.82 + 0.18 * Math.sin(clock.elapsedTime * 0.7 + phase);
    shaftMat.uniforms.uOpacity.value = opacity * k;
    poolMat.opacity = opacity * k;
  });
  return (
    <group>
      <mesh geometry={geo} material={shaftMat} position={mid} quaternion={quat} renderOrder={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[b.x, 0.0, b.z]} scale={[r[1] * 2.6, r[1] * 2.0, 1]} material={poolMat} geometry={GEO.plane} renderOrder={1} />
    </group>
  );
}

let dotTex: THREE.Texture | null = null;
/** A radial white-to-clear gradient, shared by dust motes and light pools. */
function softDot(): THREE.Texture {
  if (dotTex) return dotTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

/** Dust drifting slowly through the light. `box` is [x0, y0, z0, x1, y1, z1]. */
function Motes({ color, count, box, size }: { color: string; count: number; box: [number, number, number, number, number, number]; size: number }) {
  const [x0, y0, z0, x1, y1, z1] = box;
  const base = useMemo(() => Array.from({ length: count }, (_, i) => [x0 + rnd(i, 61) * (x1 - x0), y0 + rnd(i, 62) * (y1 - y0), z0 + rnd(i, 63) * (z1 - z0)]), [count, x0, y0, z0, x1, y1, z1]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  const material = useMemo(() => new THREE.PointsMaterial({ color, size, map: softDot(), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }), [color, size]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const h = y1 - y0;
    base.forEach(([x, y, z], i) => {
      const yy = y0 + ((y - y0 + t * (0.05 + rnd(i, 64) * 0.08)) % h);
      pos.setXYZ(i, x + Math.sin(t * 0.4 + i) * 0.25, yy, z + Math.cos(t * 0.3 + i * 1.7) * 0.2);
    });
    pos.needsUpdate = true;
  });
  return <points geometry={geo} material={material} frustumCulled={false} />;
}

// ---------------------------------------------------------------- trainers

function trainerLook(): Look | null {
  const id = currentBattle()?.trainer?.id;
  if (!id) return null;
  return NPCS.find((n) => n.id === id)?.look ?? "rival";
}

/** A trainer standing behind their creature: throws the amulet, points on attacks, cheers and slumps. */
function BattleTrainer({ side, look }: { side: Side; look: Look }) {
  const pose = useMemo<HumanPose>(() => ({ lArm: 0, rArm: 0, lean: 0, hop: 0 }), []);
  const mood = useRef({ cheer: -99, slump: false, seen: { player: 0, enemy: 0, caught: 0 } });
  const p = TRAINER[side];
  const target = POS[other(side)];
  const yaw = Math.atan2(target.x - p.x, target.z - p.z);
  useFrame((_, dt) => {
    const t = now();
    const me = bv[side];
    const foe = bv[other(side)];
    const m = mood.current;
    if (foe.anim === "faint" && m.seen[other(side)] !== foe.t0) {
      m.seen[other(side)] = foe.t0;
      m.cheer = t;
    }
    if (side === "player" && bv.enemy.anim === "caught" && m.seen.caught !== bv.enemy.t0) {
      m.seen.caught = bv.enemy.t0;
      m.cheer = t;
    }
    if (me.anim === "faint") m.slump = true;
    if (me.anim === "send" || me.anim === "enter") m.slump = false;

    let lArm = 0.08 + Math.sin(t * 1.6) * 0.04;
    let rArm = 0.08 + Math.sin(t * 1.6 + 1) * 0.04;
    let lean = 0;
    let hop = 0;
    // throwing the amulet: a wind-up behind the head, then a swing forward
    const thrower = me.anim === "send" ? me : side === "player" && bv.enemy.anim === "throw" ? bv.enemy : null;
    const tp = thrower ? prog(thrower, thrower.anim!) / (thrower.anim === "send" ? 0.45 : 0.35) : 2;
    if (tp < 1.4) {
      rArm = tp < 0.3 ? -1.6 * (tp / 0.3) : tp < 1 ? -1.6 + 4.4 * ease((tp - 0.3) / 0.7) : 2.8 - (tp - 1) * 4;
      lean = tp < 0.3 ? -0.08 : 0.12;
    } else if (me.anim === "attack" || me.anim === "special" || me.anim === "status") {
      rArm = 1.55;
      lean = 0.06;
    }
    const ct = t - m.cheer;
    if (ct < 1.5) {
      lArm = rArm = 2.9;
      hop = Math.abs(Math.sin(ct * 8)) * 0.1 * (1 - ct / 1.5);
    } else if (m.slump) {
      lArm = rArm = -0.15;
      lean = 0.38;
    }
    const k = Math.min(1, dt * 14);
    pose.lArm += (lArm - pose.lArm) * k;
    pose.rArm += (rArm - pose.rArm) * k;
    pose.lean += (lean - pose.lean) * Math.min(1, dt * 6);
    pose.hop = hop;
  });
  return (
    <group position={[O.x + p.x, 0, O.z + p.z]} rotation={[0, yaw, 0]} scale={1.3}>
      <Humanoid look={look} pose={pose} />
    </group>
  );
}

// ---------------------------------------------------------------- creatures

function SideCreature({ side }: { side: Side }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const sendAmulet = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const species = useRef<string | null>(null);
  const [, setN] = useState(0);
  const force = () => setN((v) => v + 1);
  const foe = other(side);

  useFrame(({ clock }) => {
    const s: SideVis = bv[side];
    if (s.species !== species.current) {
      species.current = s.species;
      force();
    }
    const g = inner.current;
    const o = outer.current;
    if (!g || !o) return;
    let x = 0, y = 0, z = 0, sc = 1, vis = !s.hidden && !!s.species;
    let flashS = 0;
    let amuletVis = false;
    let ringY = -1;
    const k = s.anim;
    if (k) {
      const p = prog(s, k);
      switch (k) {
        case "enter":
          x = (1 - ease(p)) * 6;
          break;
        case "send": {
          const a = Math.min(1, p / 0.45);
          if (p < 0.45) {
            vis = false;
            amuletVis = true;
            const from = HAND[side].clone().sub(POS[side]);
            if (sendAmulet.current) {
              sendAmulet.current.position.set(from.x * (1 - a), from.y * (1 - a) + 0.5 * a + Math.sin(a * Math.PI) * 1.2, from.z * (1 - a));
              sendAmulet.current.rotation.x = a * 10;
            }
          } else {
            const b = (p - 0.45) / 0.55;
            sc = ease(Math.min(1, b * 1.6));
            flashS = b < 0.5 ? Math.sin((b / 0.5) * Math.PI) * 0.9 : 0;
          }
          break;
        }
        case "recall":
          sc = 1 - ease(p);
          flashS = Math.sin(p * Math.PI) * 0.5;
          break;
        case "attack": {
          const dir = POS[foe].clone().sub(POS[side]).normalize();
          // a crouch, then a lunge
          const d = p < 0.25 ? -Math.sin((p / 0.25) * Math.PI) * 0.15 : Math.sin(((p - 0.25) / 0.75) * Math.PI) * 1.0;
          x = dir.x * d;
          z = dir.z * d;
          y = p > 0.25 ? Math.sin(((p - 0.25) / 0.75) * Math.PI) * 0.25 : 0;
          sc = p < 0.25 ? 1 - Math.sin((p / 0.25) * Math.PI) * 0.06 : 1;
          break;
        }
        case "special":
          y = Math.sin(Math.min(1, p * 2) * Math.PI) * 0.18;
          sc = 1 + Math.sin(Math.min(1, p * 3) * Math.PI) * 0.06;
          break;
        case "status":
          sc = 1 + Math.sin(p * Math.PI * 3) * 0.08;
          break;
        case "hit": {
          vis = vis && Math.floor(p * 10) % 2 === 0;
          // knocked back away from the attacker, then settles
          const dir = POS[side].clone().sub(POS[foe]).normalize();
          const kb = Math.sin(Math.min(1, p * 2.5) * Math.PI) * 0.22 * (1 - p);
          x = dir.x * kb + Math.sin(p * 50) * 0.05 * (1 - p);
          z = dir.z * kb;
          break;
        }
        case "faint":
          y = -ease(p) * 1.4;
          if (p >= 1) vis = false;
          break;
        case "statUp":
          ringY = p;
          break;
        case "statDown":
          ringY = 1 - p;
          break;
        case "absorb":
          if (side === "enemy") {
            sc = 1 - Math.min(1, p / 0.5);
            flashS = p < 0.5 ? Math.sin((p / 0.5) * Math.PI) * 0.9 : 0;
            if (p >= 0.5) vis = false;
          }
          break;
        case "shake":
        case "caught":
          vis = false;
          break;
        case "break":
          sc = ease(p);
          flashS = Math.sin(p * Math.PI) * 0.8;
          break;
      }
    } else {
      // idle breathing
      sc = 1 + Math.sin(clock.elapsedTime * 2.2 + (side === "enemy" ? 1 : 0)) * 0.015;
    }
    o.position.set(O.x + POS[side].x + x, y, O.z + POS[side].z + z);
    g.scale.setScalar(Math.max(0.001, sc) * SCALE[side]);
    g.visible = vis;
    if (flash.current) {
      flash.current.visible = flashS > 0.01;
      flash.current.scale.setScalar(flashS);
    }
    if (sendAmulet.current) sendAmulet.current.visible = amuletVis;
    if (rings.current) {
      rings.current.visible = ringY >= 0;
      rings.current.position.y = ringY * 1.2;
      rings.current.rotation.y = clock.elapsedTime * 4;
    }
  });

  const sp = bv[side].species;
  const ringColor = bv[side].anim === "statDown" ? "#6aa0ff" : "#ff8a3a";
  return (
    <group ref={outer}>
      <group ref={inner} rotation={[0, ROT[side], 0]}>
        {sp && <CreatureModel key={sp} species={sp} />}
      </group>
      <mesh ref={flash} position={[0, 0.5, 0]} geometry={GEO.sphere} material={glow("#ffffff", 0.85)} visible={false} />
      <group ref={sendAmulet} scale={0.13} visible={false}>
        <AmuletModel />
      </group>
      <group ref={rings} visible={false}>
        {Array.from({ length: 8 }, (_, i) => (
          <Sph key={i} p={[Math.cos((i / 8) * 6.28) * 0.5, 0, Math.sin((i / 8) * 6.28) * 0.5]} s={0.05} c={ringColor} g />
        ))}
      </group>
    </group>
  );
}

/** Thrown amulet during catch attempts (flies at the foe, drops, shakes). */
function CatchAmulet() {
  const ref = useRef<THREE.Group>(null);
  const normal = useRef<THREE.Group>(null);
  const great = useRef<THREE.Group>(null);
  const stars = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const e = bv.enemy;
    const k = e.anim;
    const target = POS.enemy;
    let visible = bv.amulet.visible;
    let showStars = false;
    const ground = 0.16;
    if (k === "throw") {
      visible = true;
      // leaves the trainer's hand partway through the wind-up
      const raw = prog(e, "throw");
      const p = ease(Math.max(0, (raw - 0.2) / 0.8));
      const from = HAND.player;
      g.visible = raw > 0.2;
      g.position.set(O.x + from.x + (target.x - from.x) * p, from.y + (1.0 - from.y) * p + Math.sin(p * Math.PI) * 1.4, O.z + from.z + (target.z - from.z) * p);
      g.rotation.set(p * 12, 0, 0);
    } else if (k === "absorb") {
      visible = true;
      const p = prog(e, "absorb");
      const d = Math.max(0, (p - 0.5) / 0.5);
      g.position.set(O.x + target.x, 1.0 - (1.0 - ground) * ease(d) + (d > 0.8 ? Math.sin((d - 0.8) * 15) * 0.05 : 0), O.z + target.z + 0.1);
      g.rotation.set(0, 0, 0);
    } else if (k === "shake") {
      visible = true;
      const p = prog(e, "shake");
      g.position.set(O.x + target.x, ground, O.z + target.z + 0.1);
      g.rotation.set(0, 0, p < 0.6 ? Math.sin((p / 0.6) * Math.PI * 2) * 0.5 : 0);
    } else if (k === "caught") {
      visible = true;
      showStars = true;
      g.position.set(O.x + target.x, ground, O.z + target.z + 0.1);
      g.rotation.set(0, 0, 0);
      if (stars.current) {
        const p = prog(e, "caught");
        stars.current.children.forEach((c, i) => {
          const a = (i / 3) * Math.PI + 0.5;
          c.position.set(Math.cos(a) * p * 5, 2 + Math.sin(a) * p * 5, 0);
        });
      }
    } else if (k === "break") {
      visible = false;
    }
    bv.amulet.visible = visible && k !== "break";
    if (k !== "throw") g.visible = visible;
    if (stars.current) stars.current.visible = showStars;
    if (normal.current) normal.current.visible = !bv.amulet.great;
    if (great.current) great.current.visible = bv.amulet.great;
  });
  return (
    <group ref={ref} scale={0.14} visible={false}>
      <group ref={normal}>
        <AmuletModel />
      </group>
      <group ref={great} visible={false}>
        <AmuletModel great />
      </group>
      <group ref={stars}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={GEO.cone4} material={glow("#ffe66a")} scale={0.6} />
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- move effects

const TRAIL = 7;

/** Special moves: a type-coloured orb with a fading trail. Physical moves: slash marks at contact. */
function MoveFx() {
  const orb = useRef<THREE.Group>(null);
  const slash = useRef<THREE.Group>(null);
  const orbMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, opacity: 0.95, depthWrite: false }), []);
  const trailMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const slashMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }), []);
  useFrame(() => {
    const o = orb.current;
    const sl = slash.current;
    if (!o || !sl) return;
    o.visible = false;
    sl.visible = false;
    for (const side of ["player", "enemy"] as Side[]) {
      const s = bv[side];
      const color = s.type ? TYPES[s.type].color : "#ffffff";
      const from = POS[side];
      const to = POS[other(side)];
      if (s.anim === "special") {
        const p = prog(s, "special");
        if (p <= 0.15 || p >= 1) continue;
        const a = (p - 0.15) / 0.85;
        o.visible = true;
        orbMat.color.set(color);
        trailMat.color.set(color);
        o.children.forEach((c, i) => {
          const b = Math.max(0, a - i * 0.045);
          c.position.set(O.x + from.x + (to.x - from.x) * b, 0.6 + Math.sin(b * Math.PI) * 0.5, O.z + from.z + (to.z - from.z) * b);
          c.scale.setScalar((0.17 + Math.sin(a * Math.PI) * 0.12) * (1 - i / (TRAIL + 1)));
        });
      } else if (s.anim === "attack") {
        const p = prog(s, "attack");
        const q = (p - 0.45) / 0.4;
        if (q <= 0 || q >= 1) continue;
        sl.visible = true;
        slashMat.color.set(color).lerp(new THREE.Color("#ffffff"), 0.5);
        slashMat.opacity = 0.95 * (1 - q);
        sl.position.set(O.x + to.x, 0.6, O.z + to.z + 0.3);
        sl.children.forEach((c, i) => {
          c.scale.set(0.05, 0.25 + Math.min(1, q * 3) * 0.9, 1);
          c.position.set((i - 1) * 0.22, 0, 0);
        });
      }
    }
  });
  return (
    <group>
      <group ref={orb} visible={false}>
        {Array.from({ length: TRAIL + 1 }, (_, i) => (
          <mesh key={i} geometry={GEO.sphere} material={i === 0 ? orbMat : trailMat} />
        ))}
      </group>
      <group ref={slash} visible={false} rotation={[0, 0, 0.6]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={GEO.plane} material={slashMat} />
        ))}
      </group>
    </group>
  );
}

interface Flavor {
  colors: string[];
  gravity: number; // negative floats up
  speed: number;
  life: number;
  flat?: boolean;
}
const FLAVOR: Partial<Record<TypeId, Flavor>> = {
  fire: { colors: ["#ffb347", "#ff6a2a", "#ffe28a"], gravity: -3, speed: 2.2, life: 0.75 },
  water: { colors: ["#7fc8ff", "#3a8ad8", "#e4f5ff"], gravity: 9, speed: 3.2, life: 0.7 },
  grass: { colors: ["#7ad04a", "#4aa03a", "#c8f07a"], gravity: 1.2, speed: 2.2, life: 1.0, flat: true },
  electric: { colors: ["#fff27a", "#ffd02a", "#ffffff"], gravity: 0, speed: 5.5, life: 0.32 },
  rock: { colors: ["#b8a88a", "#8d8478", "#d8ccb0"], gravity: 11, speed: 3, life: 0.8 },
  ground: { colors: ["#c8a060", "#a07a40", "#e0c890"], gravity: 8, speed: 2.6, life: 0.8 },
};
const flavorOf = (type: TypeId | null): Flavor => (type && FLAVOR[type]) || { colors: [type ? TYPES[type].color : "#ffffff", "#ffffff", "#fff6c0"], gravity: 4, speed: 3, life: 0.55 };

const MAX_PARTS = 96;
interface Part {
  p: THREE.Vector3;
  v: THREE.Vector3;
  age: number;
  life: number;
  size: number;
  g: number;
  flat: boolean;
  spin: number;
}

/** Instanced sparks, drops, leaves and dust for impacts, status moves, send-outs and faints. */
function Bursts() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }), []);
  const parts = useMemo<Part[]>(() => Array.from({ length: MAX_PARTS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), age: 1, life: 0, size: 0, g: 0, flat: false, spin: 0 })), []);
  const st = useRef({ next: 0, fx: -99, status: { player: 0, enemy: 0 }, faint: { player: 0, enemy: 0 }, send: { player: 0, enemy: 0 }, ringT0: -99, ringSide: "enemy" as Side, ringBig: false });
  const d = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);

  function spawn(n: number, at: THREE.Vector3, f: Flavor, o: { up?: number; spread?: number; size?: number; ground?: boolean } = {}) {
    const m = mesh.current;
    if (!m) return;
    const s = st.current;
    for (let i = 0; i < n; i++) {
      const q = parts[s.next];
      const idx = s.next;
      s.next = (s.next + 1) % MAX_PARTS;
      const a = Math.random() * Math.PI * 2;
      const e = o.ground ? Math.random() * 0.25 : (Math.random() - 0.3) * 1.4;
      const sp = f.speed * (0.5 + Math.random() * 0.7) * (o.spread ?? 1);
      q.p.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3));
      q.v.set(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + (o.up ?? 0), Math.sin(a) * Math.cos(e) * sp);
      q.age = 0;
      q.life = f.life * (0.7 + Math.random() * 0.6);
      q.size = (o.size ?? 0.06) * (0.6 + Math.random() * 0.8);
      q.g = f.gravity;
      q.flat = !!f.flat;
      q.spin = (Math.random() - 0.5) * 12;
      m.setColorAt(idx, col.set(f.colors[i % f.colors.length]));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  useFrame((_, rawDt) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const t = now();
    const at = (side: Side, y: number) => new THREE.Vector3(O.x + POS[side].x, y, O.z + POS[side].z);

    // impact
    if (bv.fx.t0 !== s.fx && bv.fx.side) {
      s.fx = bv.fx.t0;
      const big = bv.fx.eff > 1 || bv.fx.crit;
      const weak = bv.fx.eff < 1;
      spawn(big ? 30 : weak ? 7 : 16, at(bv.fx.side, 0.6), flavorOf(bv.fx.type), { size: big ? 0.08 : 0.06, spread: big ? 1.3 : weak ? 0.6 : 1 });
      s.ringT0 = t;
      s.ringSide = bv.fx.side;
      s.ringBig = big;
      ringMat.color.set(bv.fx.type ? TYPES[bv.fx.type].color : "#ffffff").lerp(new THREE.Color("#ffffff"), 0.4);
    }
    for (const side of ["player", "enemy"] as Side[]) {
      const v = bv[side];
      if (v.anim === "status" && s.status[side] !== v.t0) {
        s.status[side] = v.t0;
        spawn(14, at(side, 0.3), { ...flavorOf(v.type), gravity: -2.5, speed: 1.2, life: 0.9 }, { up: 1.2, size: 0.045 });
      }
      if (v.anim === "faint" && s.faint[side] !== v.t0) {
        s.faint[side] = v.t0;
        spawn(18, at(side, 0.1), { colors: ["#b8a890", "#9a8c78", "#d8ccb8"], gravity: -0.4, speed: 1.6, life: 0.9 }, { ground: true, size: 0.12 });
      }
      if (v.anim === "send" && s.send[side] !== v.t0 && t - v.t0 > (ANIM_MS.send / 1000) * 0.45) {
        s.send[side] = v.t0;
        spawn(16, at(side, 0.5), { colors: ["#ffffff", "#fff6c0", "#bfe8ff"], gravity: 0.5, speed: 2.2, life: 0.5 }, { size: 0.045 });
      }
    }

    for (let i = 0; i < MAX_PARTS; i++) {
      const q = parts[i];
      if (q.age < q.life) {
        q.age += dt;
        const drag = q.flat ? 2.5 : 0.6;
        q.v.multiplyScalar(Math.max(0, 1 - drag * dt));
        q.v.y -= q.g * dt;
        q.p.addScaledVector(q.v, dt);
        if (q.p.y < 0.02) {
          q.p.y = 0.02;
          q.v.y = Math.abs(q.v.y) * 0.3;
        }
      }
      const k = q.age < q.life ? 1 - q.age / q.life : 0;
      d.position.copy(q.p);
      d.rotation.set(q.age * q.spin, q.age * q.spin * 0.7, 0);
      const sz = q.size * Math.min(1, k * 2.5);
      if (q.flat) d.scale.set(sz * 1.4, sz * 0.25, sz);
      else d.scale.setScalar(sz);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;

    // shockwave ring
    const r = ring.current;
    if (r) {
      const rp = (t - s.ringT0) / 0.35;
      r.visible = rp >= 0 && rp < 1;
      if (r.visible) {
        const size = (s.ringBig ? 1.3 : 0.9) * ease(rp);
        r.position.set(O.x + POS[s.ringSide].x, 0.6, O.z + POS[s.ringSide].z + 0.2);
        r.scale.setScalar(Math.max(0.01, size));
        ringMat.opacity = 0.85 * (1 - rp);
      }
    }
  });

  return (
    <group>
      <instancedMesh ref={mesh} args={[geo, material, MAX_PARTS]} frustumCulled={false} />
      <mesh ref={ring} material={ringMat} visible={false}>
        <ringGeometry args={[0.8, 1, 32]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- camera

const BASE_LOOK = new THREE.Vector3(0.1, 0.35, 0.35);
const BASE_OFF = new THREE.Vector3(-2.4, 4.6, 8.1);
const camLook = new THREE.Vector3();
const camPos = new THREE.Vector3();
const wantLook = new THREE.Vector3();
const wantPos = new THREE.Vector3();
const tmp = new THREE.Vector3();
let camFor = -1;

/**
 * Places the battle camera: a 3/4 shot over the player's shoulder that sweeps in from the
 * foe at the start, leans toward whoever is acting, and shakes on hard hits.
 */
export function battleCamera(camera: THREE.Camera, aspect: number, dt: number): number {
  const t = now();
  // Narrower than 16:10 pulls back along the same angle so both sides stay in frame.
  const k = Math.max(1, Math.pow(1.6 / aspect, 0.7));
  wantLook.copy(BASE_LOOK);
  let dolly = 1;
  const f = bv.cam.focus;
  if (f) {
    wantLook.lerp(tmp.set(POS[f].x, 0.55, POS[f].z), 0.2);
    dolly = 0.92;
  }
  wantPos.copy(BASE_OFF).multiplyScalar(k * dolly).add(wantLook);
  const snap = camFor !== bv.intro.t0;
  camFor = bv.intro.t0;
  const a = snap ? 1 : 1 - Math.exp(-dt * 3.2);
  camLook.lerp(wantLook, a);
  camPos.lerp(wantPos, a);

  const look = tmp.copy(camLook);
  const pos = new THREE.Vector3().copy(camPos);
  // opening sweep: start low beside the foe, then pull back to the resting shot
  const ip = (t - bv.intro.t0) / 1.5;
  if (ip < 1) {
    const e = ease(Math.max(0, ip));
    const iLook = new THREE.Vector3(POS.enemy.x, 0.6, POS.enemy.z);
    const iPos = iLook.clone().add(new THREE.Vector3(1.4, 0.4, 2.8).multiplyScalar(k));
    look.lerpVectors(iLook, camLook, e);
    pos.lerpVectors(iPos, camPos, e);
  }
  const sk = bv.cam.shake * Math.exp(-(t - bv.cam.shakeT0) * 9);
  if (sk > 0.002) {
    pos.x += (Math.random() - 0.5) * sk;
    pos.y += (Math.random() - 0.5) * sk;
  }
  camera.position.set(O.x + pos.x, pos.y, O.z + pos.z);
  camera.lookAt(O.x + look.x, look.y, O.z + look.z);
  return pos.distanceTo(look);
}

// ---------------------------------------------------------------- scene

export function BattleScene() {
  const map = useGame((s) => s.pos.map);
  const stage = stageOf(map);
  const look = useMemo(trainerLook, []);
  return (
    <group>
      <group position={[O.x, 0, O.z]}>
        {stage === "gym" ? <GymStage /> : stage === "pool" ? <PoolStage /> : stage === "cave" ? <CaveStage map={map} /> : <RouteStage />}
      </group>
      <BattleTrainer side="player" look="player" />
      {look && <BattleTrainer side="enemy" look={look} />}
      <SideCreature side="enemy" />
      <SideCreature side="player" />
      <CatchAmulet />
      <MoveFx />
      <Bursts />
    </group>
  );
}
