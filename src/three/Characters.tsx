// Chibi low-poly people. Faces +z; the limbs swing while the linked actor walks.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { Look } from "../world/maps";
import { rt, type Actor } from "../world/runtime";
import { Bx, Cn, Cy, Eye, Sph, SphHi } from "./prims";

interface Style {
  skin: string;
  hair: string;
  hairStyle: "short" | "spiky" | "long" | "bun" | "pigtails" | "bald" | "loops";
  shirt: string;
  pants: string;
  shoes?: string;
  hat?: { color: string; brim?: string; kind: "cap" | "hard" | "nurse" | "back" | "straw" };
  coat?: string;
  skirt?: boolean;
  pack?: string;
  beard?: string;
  glasses?: boolean;
  mask?: string; // bandana over the nose and mouth
}

const LOOKS: Record<Look, Style> = {
  player: { skin: "#f2c9a0", hair: "#3a2418", hairStyle: "short", shirt: "#2f6fd0", pants: "#2a3350", hat: { color: "#e0342c", brim: "#ffffff", kind: "cap" }, pack: "#f2b632" },
  rival: { skin: "#f0c49a", hair: "#8a5a2a", hairStyle: "spiky", shirt: "#7a4fb0", pants: "#b8a070" },
  prof: { skin: "#eac19a", hair: "#bdbdbd", hairStyle: "short", shirt: "#c8a46a", pants: "#6a4a30", coat: "#f5f5f5" },
  mom: { skin: "#e8b88e", hair: "#5a3420", hairStyle: "long", shirt: "#e87a9a", pants: "#6a8ad0", skirt: true },
  nurse: { skin: "#f5d0b0", hair: "#f08ab0", hairStyle: "loops", shirt: "#ffd6e4", pants: "#ffffff", skirt: true, hat: { color: "#ffffff", kind: "nurse" } },
  clerk: { skin: "#d9a57a", hair: "#2a1a10", hairStyle: "short", shirt: "#3a7bd5", pants: "#2a3350", hat: { color: "#3a7bd5", kind: "cap", brim: "#2a5aa5" } },
  girl: { skin: "#f0c8a0", hair: "#e07a2a", hairStyle: "pigtails", shirt: "#f5d23a", pants: "#f5d23a", skirt: true },
  boy: { skin: "#c68a5a", hair: "#1a1a1a", hairStyle: "short", shirt: "#3aa05a", pants: "#3a4a8a" },
  oldman: { skin: "#e0b08a", hair: "#e8e8e8", hairStyle: "bald", shirt: "#8a6a4a", pants: "#5a4a3a", beard: "#f0f0f0" },
  oldwoman: { skin: "#e8b890", hair: "#d0d0d0", hairStyle: "bun", shirt: "#8a5ab0", pants: "#8a5ab0", skirt: true, glasses: true },
  worker: { skin: "#b87a4a", hair: "#1a1a1a", hairStyle: "short", shirt: "#f08a2a", pants: "#3a4a6a", hat: { color: "#f5d23a", kind: "hard" } },
  youngster: { skin: "#f0c090", hair: "#5a3a20", hairStyle: "short", shirt: "#f5f5f5", pants: "#e0a030", hat: { color: "#2a7ad0", kind: "back" } },
  lass: { skin: "#f5d0b0", hair: "#f0d060", hairStyle: "long", shirt: "#ffffff", pants: "#2aa0a0", skirt: true },
  aide: { skin: "#d9a57a", hair: "#1a1a1a", hairStyle: "short", shirt: "#6a8aa0", pants: "#3a3a4a", coat: "#f5f5f5", glasses: true },
  sister: { skin: "#f0c49a", hair: "#7a4a2a", hairStyle: "long", shirt: "#5ab07a", pants: "#5ab07a", skirt: true },
  man: { skin: "#d09a70", hair: "#2a1a10", hairStyle: "short", shirt: "#8a4a2a", pants: "#3a3a4a" },
  miner: { skin: "#c68a5a", hair: "#3a2418", hairStyle: "short", shirt: "#8a6a4a", pants: "#4a3a2a", hat: { color: "#a86a2a", kind: "hard" }, pack: "#6a5a4a" },
  leader: { skin: "#d9a57a", hair: "#2a1a10", hairStyle: "spiky", shirt: "#f2b632", pants: "#4a3a2a", coat: "#7a4fa0", beard: "#2a1a10" },
  bugcatcher: { skin: "#f0c090", hair: "#3a2418", hairStyle: "short", shirt: "#9ad05a", pants: "#6a5a3a", hat: { color: "#e8cf7a", brim: "#c9a94a", kind: "straw" } },
  // Garimpo Sombrio: miner gear gone wrong, with a dark bandana and helmet.
  grunt: { skin: "#c68a5a", hair: "#1a1a1a", hairStyle: "short", shirt: "#3a3a42", pants: "#2a2a30", hat: { color: "#2a2a2a", kind: "hard" }, pack: "#5a4a3a", mask: "#7a1f24", shoes: "#1a1a1a" },
  scientist: { skin: "#f0c8a0", hair: "#6a4a2a", hairStyle: "spiky", shirt: "#d0a040", pants: "#4a4a5a", coat: "#f5f5f5", glasses: true },
};

function getActor(id?: string): Actor | undefined {
  if (!id) return undefined;
  return id === "player" ? rt.player : rt.npcs.get(id);
}

/** Arm angles (radians, positive swings forward/up), body lean and hop that override the idle pose. Mutated by the owner each frame. */
export interface HumanPose {
  lArm: number;
  rArm: number;
  lean: number;
  hop: number;
}

export function Humanoid({ look, actorId, pose }: { look: Look; actorId?: string; pose?: HumanPose }) {
  const st = LOOKS[look];
  const lLeg = useRef<THREE.Group>(null);
  const rLeg = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const actor = getActor(actorId);
    const moving = !!actor?.moving;
    // Bumping into a wall plays a short walk-in-place.
    const bumping = !!actor && actor.bumpUntil > rt.now;
    const ph = moving ? actor!.phase : rt.now * 12;
    const sw = moving || bumping ? Math.sin(ph) * 0.7 : 0;
    if (lLeg.current) lLeg.current.rotation.x = sw;
    if (rLeg.current) rLeg.current.rotation.x = -sw;
    if (lArm.current) lArm.current.rotation.x = -sw * 0.8;
    if (rArm.current) rArm.current.rotation.x = sw * 0.8;
    if (body.current) body.current.position.y = actor?.moving ? Math.abs(Math.cos(ph)) * 0.04 : Math.sin(clock.elapsedTime * 2) * 0.006;
    if (pose) {
      if (lArm.current) lArm.current.rotation.x = -pose.lArm;
      if (rArm.current) rArm.current.rotation.x = -pose.rArm;
      if (body.current) {
        body.current.rotation.x = pose.lean;
        body.current.position.y += pose.hop;
      }
    }
  });
  const shoes = st.shoes ?? "#3a2a24";
  return (
    <group ref={body}>
      {/* legs pivot at the hip */}
      {[[-0.08, lLeg], [0.08, rLeg]].map(([x, ref], i) => (
        <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.3, 0]}>
          <Bx p={[0, -0.13, 0]} s={[0.1, 0.24, 0.11]} c={st.skirt ? st.skin : st.pants} />
          <Bx p={[0, -0.27, 0.02]} s={[0.11, 0.06, 0.15]} c={shoes} />
        </group>
      ))}
      {st.skirt && <Cn p={[0, 0.34, 0]} s={[0.21, 0.24, 0.19]} c={st.pants} />}
      {/* torso */}
      <Bx p={[0, 0.46, 0]} s={[0.28, 0.3, 0.18]} c={st.shirt} />
      {!st.skirt && <Bx p={[0, 0.32, 0]} s={[0.27, 0.06, 0.17]} c={st.pants} />}
      {st.coat && (
        <>
          <Bx p={[-0.1, 0.4, 0.01]} s={[0.1, 0.44, 0.2]} c={st.coat} />
          <Bx p={[0.1, 0.4, 0.01]} s={[0.1, 0.44, 0.2]} c={st.coat} />
          <Bx p={[0, 0.42, -0.06]} s={[0.3, 0.46, 0.1]} c={st.coat} />
        </>
      )}
      {st.pack && <Bx p={[0, 0.47, -0.13]} s={[0.22, 0.24, 0.1]} c={st.pack} />}
      {/* arms pivot at the shoulder */}
      {[[-0.18, lArm], [0.18, rArm]].map(([x, ref], i) => (
        <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.58, 0]}>
          <Bx p={[0, -0.1, 0]} s={[0.08, 0.2, 0.09]} c={st.coat ?? st.shirt} />
          <Bx p={[0, -0.23, 0]} s={[0.07, 0.07, 0.07]} c={st.skin} />
        </group>
      ))}
      {/* head */}
      <group position={[0, 0.82, 0]}>
        <SphHi s={[0.2, 0.2, 0.19]} c={st.skin} />
        <Eye p={[-0.07, 0.0, 0.16]} s={0.028} />
        <Eye p={[0.07, 0.0, 0.16]} s={0.028} />
        {st.glasses && <Bx p={[0, 0.01, 0.19]} s={[0.22, 0.05, 0.01]} c="#222" shadow={false} />}
        {st.beard && <Sph p={[0, -0.1, 0.12]} s={[0.12, 0.07, 0.07]} c={st.beard} />}
        {st.mask && <Bx p={[0, -0.07, 0.13]} s={[0.3, 0.1, 0.1]} c={st.mask} />}
        <Hair st={st} />
        {st.hat && <Hat hat={st.hat} />}
      </group>
    </group>
  );
}

function Hair({ st }: { st: Style }) {
  const h = st.hair;
  switch (st.hairStyle) {
    case "bald":
      return <Sph p={[0, -0.02, -0.08]} s={[0.2, 0.12, 0.14]} c={h} />;
    case "spiky":
      return (
        <group>
          <Sph p={[0, 0.07, -0.02]} s={[0.21, 0.16, 0.2]} c={h} />
          {[[-0.1, 0.2, 0, 0.5], [0, 0.23, 0.02, 0], [0.1, 0.2, 0, -0.5], [-0.05, 0.18, -0.12, 0.3], [0.06, 0.18, -0.12, -0.3], [0, 0.12, -0.18, 0]].map(([x, y, z, r], i) => (
            <Cn key={i} p={[x, y, z]} s={[0.06, 0.16, 0.06]} r={[z < 0 ? -0.6 : 0, 0, r]} c={h} />
          ))}
        </group>
      );
    case "long":
      return (
        <group>
          <Sph p={[0, 0.06, -0.02]} s={[0.215, 0.18, 0.21]} c={h} />
          <Bx p={[0, -0.12, -0.1]} s={[0.36, 0.34, 0.12]} c={h} />
        </group>
      );
    case "bun":
      return (
        <group>
          <Sph p={[0, 0.06, -0.02]} s={[0.21, 0.17, 0.2]} c={h} />
          <Sph p={[0, 0.2, -0.1]} s={0.08} c={h} />
        </group>
      );
    case "pigtails":
      return (
        <group>
          <Sph p={[0, 0.06, -0.02]} s={[0.21, 0.17, 0.2]} c={h} />
          <Sph p={[-0.2, -0.02, -0.04]} s={[0.07, 0.12, 0.07]} c={h} />
          <Sph p={[0.2, -0.02, -0.04]} s={[0.07, 0.12, 0.07]} c={h} />
        </group>
      );
    case "loops":
      return (
        <group>
          <Sph p={[0, 0.06, -0.02]} s={[0.21, 0.17, 0.2]} c={h} />
          <Sph p={[-0.21, -0.06, -0.02]} s={[0.07, 0.1, 0.07]} c={h} />
          <Sph p={[0.21, -0.06, -0.02]} s={[0.07, 0.1, 0.07]} c={h} />
        </group>
      );
    default:
      return <Sph p={[0, 0.07, -0.03]} s={[0.21, 0.16, 0.2]} c={h} />;
  }
}

function Hat({ hat }: { hat: NonNullable<Style["hat"]> }) {
  switch (hat.kind) {
    case "cap":
      return (
        <group>
          <Sph p={[0, 0.1, -0.01]} s={[0.215, 0.13, 0.215]} c={hat.color} />
          <Bx p={[0, 0.07, 0.19]} s={[0.22, 0.02, 0.14]} c={hat.color} />
          {hat.brim && <Bx p={[0, 0.16, 0.14]} s={[0.1, 0.07, 0.04]} c={hat.brim} />}
        </group>
      );
    case "back":
      return (
        <group>
          <Sph p={[0, 0.1, -0.01]} s={[0.215, 0.13, 0.215]} c={hat.color} />
          <Bx p={[0, 0.07, -0.19]} s={[0.2, 0.02, 0.12]} c={hat.color} />
        </group>
      );
    case "hard":
      return (
        <group>
          <Sph p={[0, 0.1, 0]} s={[0.22, 0.14, 0.22]} c={hat.color} />
          <Cy p={[0, 0.06, 0]} s={[0.26, 0.02, 0.26]} c={hat.color} />
        </group>
      );
    case "straw":
      return (
        <group>
          <Sph p={[0, 0.12, 0]} s={[0.18, 0.12, 0.18]} c={hat.color} />
          <Cy p={[0, 0.08, 0]} s={[0.36, 0.02, 0.36]} c={hat.brim ?? hat.color} />
        </group>
      );
    case "nurse":
      return (
        <group>
          <Bx p={[0, 0.2, 0.02]} s={[0.18, 0.08, 0.12]} c={hat.color} />
          <Bx p={[0, 0.2, 0.085]} s={[0.05, 0.02, 0.005]} c="#e0342c" shadow={false} />
          <Bx p={[0, 0.2, 0.085]} s={[0.02, 0.05, 0.005]} c="#e0342c" shadow={false} />
        </group>
      );
  }
}

/** Positions a character from its runtime actor: tile lerp, ledge hop, facing, "!" bubble. */
export function ActorView({ id, look }: { id: string; look: Look }) {
  const ref = useRef<THREE.Group>(null);
  const bubble = useRef<THREE.Group>(null);
  const ROT: Record<string, number> = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
  useFrame(() => {
    const g = ref.current;
    const actor = getActor(id);
    if (!g) return;
    if (!actor) {
      g.visible = false;
      return;
    }
    g.visible = actor.visible;
    const t = actor.t;
    g.position.x = actor.fromX + (actor.x - actor.fromX) * t;
    g.position.z = actor.fromY + (actor.y - actor.fromY) * t;
    g.position.y = actor.jump ? Math.sin(t * Math.PI) * 0.55 : 0;
    const target = ROT[actor.facing];
    let d = target - g.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    g.rotation.y += d * 0.45;
    if (bubble.current) {
      bubble.current.visible = actor.exclaimUntil > rt.now;
      bubble.current.rotation.y = -g.rotation.y;
    }
  });
  return (
    <group ref={ref}>
      <Humanoid look={look} actorId={id} />
      <group ref={bubble} position={[0, 1.35, 0]} visible={false}>
        <Bx s={[0.3, 0.34, 0.04]} c="#ffffff" g />
        <Bx p={[0, 0.04, 0.03]} s={[0.05, 0.16, 0.02]} c="#e0342c" g />
        <Bx p={[0, -0.1, 0.03]} s={[0.05, 0.05, 0.02]} c="#e0342c" g />
      </group>
    </group>
  );
}
