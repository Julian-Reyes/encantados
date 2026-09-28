// The battle stage: two grassy platforms, your creature from behind, the foe from the front.
// Placed far from the overworld so both can stay mounted.

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bv, ANIM_MS, now, type SideVis } from "./battleVis";
import { CreatureModel } from "./Creatures";
import { AmuletModel } from "./Amulet";
import { Cy, Sph, glow, GEO } from "./prims";
import { TYPES } from "../data/types";
import type { Side } from "../game/battle";

export const BATTLE_ORIGIN = new THREE.Vector3(500, 0, 500);
const O = BATTLE_ORIGIN;
const POS: Record<Side, THREE.Vector3> = {
  enemy: new THREE.Vector3(1.7, 0, -1.6),
  player: new THREE.Vector3(-1.5, 0, 1.5),
};
const ROT: Record<Side, number> = { enemy: -0.35, player: Math.PI - 0.55 };
const SCALE: Record<Side, number> = { enemy: 1.05, player: 1.2 };

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const prog = (s: { anim: unknown; t0: number }, kind: keyof typeof ANIM_MS) => Math.min(1, Math.max(0, (now() - s.t0) / (ANIM_MS[kind] / 1000)));

function Platform({ side }: { side: Side }) {
  const p = POS[side];
  return (
    <group position={[p.x, 0, p.z]}>
      <Cy p={[0, -0.03, 0]} s={[1.25, 0.1, 0.95]} c="#6fae52" />
      <Cy p={[0, 0.0, 0]} s={[1.1, 0.1, 0.82]} c="#9fd27a" />
    </group>
  );
}

function SideCreature({ side }: { side: Side }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const sendAmulet = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const species = useRef<string | null>(null);
  const [, setN] = useState(0);
  const force = () => setN((v) => v + 1);
  const other: Side = side === "player" ? "enemy" : "player";

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
            const from = side === "player" ? new THREE.Vector3(-2.5, 0.6, 2.4) : new THREE.Vector3(2.5, 1.2, -2.5);
            if (sendAmulet.current) {
              sendAmulet.current.position.set(from.x * (1 - a), from.y * (1 - a) + 0.5 + Math.sin(a * Math.PI) * 1.2, from.z * (1 - a));
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
          const dir = POS[other].clone().sub(POS[side]).normalize();
          const d = Math.sin(p * Math.PI) * 0.8;
          x = dir.x * d;
          z = dir.z * d;
          y = Math.sin(p * Math.PI) * 0.15;
          break;
        }
        case "special":
          y = Math.sin(Math.min(1, p * 2) * Math.PI) * 0.18;
          break;
        case "status":
          sc = 1 + Math.sin(p * Math.PI * 3) * 0.08;
          break;
        case "hit":
          vis = vis && Math.floor(p * 10) % 2 === 0;
          x = Math.sin(p * 50) * 0.06 * (1 - p);
          break;
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
      const p = ease(prog(e, "throw"));
      const from = new THREE.Vector3(-1.8, 1.0, 3.2);
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
    g.visible = visible;
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

/** Colored orb for special moves, flying from the user to the target. */
function Projectile() {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, opacity: 0.9 }), []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    m.visible = false;
    for (const side of ["player", "enemy"] as Side[]) {
      const s = bv[side];
      if (s.anim !== "special") continue;
      const p = prog(s, "special");
      if (p <= 0.15 || p >= 1) continue;
      const a = (p - 0.15) / 0.85;
      const from = POS[side];
      const to = POS[side === "player" ? "enemy" : "player"];
      m.visible = true;
      m.position.set(O.x + from.x + (to.x - from.x) * a, 0.6 + Math.sin(a * Math.PI) * 0.5, O.z + from.z + (to.z - from.z) * a);
      m.scale.setScalar(0.15 + Math.sin(a * Math.PI) * 0.12);
      matRef.color.set(s.type ? TYPES[s.type].color : "#ffffff");
    }
  });
  return <mesh ref={ref} geometry={GEO.sphere} material={matRef} visible={false} />;
}

function Backdrop() {
  const trees = useMemo(() => {
    const out: [number, number, number, string][] = [];
    for (let i = 0; i < 26; i++) {
      const a = -1.2 + (i / 25) * 2.4;
      const r = 11 + ((i * 37) % 7) * 0.6;
      out.push([Math.sin(a) * r, 0, -Math.cos(a) * r + 1, ["#3f8f3a", "#4c9c3e", "#357f35", "#e35fb0", "#5aa845"][i % 5]]);
    }
    return out;
  }, []);
  return (
    <group position={[O.x, 0, O.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[40, 32]} />
        <meshLambertMaterial color="#8cc865" />
      </mesh>
      {trees.map(([x, y, z, c], i) => (
        <group key={i} position={[x, y, z]}>
          <Cy p={[0, 0.7, 0]} s={[0.15, 1.4, 0.15]} c="#7a5230" />
          <Sph p={[0, 1.9, 0]} s={[1.0, 0.9, 1.0]} c={c} />
        </group>
      ))}
      <Sph p={[-14, -2, -22]} s={[14, 6, 6]} c="#7fb86a" />
      <Sph p={[12, -2.5, -24]} s={[16, 7, 6]} c="#73ad5f" />
    </group>
  );
}

export function BattleScene() {
  return (
    <group>
      <Backdrop />
      <group position={[O.x, 0, O.z]}>
        <Platform side="enemy" />
        <Platform side="player" />
      </group>
      <SideCreature side="enemy" />
      <SideCreature side="player" />
      <CatchAmulet />
      <Projectile />
    </group>
  );
}
