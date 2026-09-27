import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { SPECIES, type SpeciesId } from "../data/species";
import { TYPES, type TypeId } from "../data/types";
import { tr } from "../game/store";
import { CreatureModel } from "../three/Creatures";
import { MaterialOverride, mat } from "../three/prims";
import { STATUS_TAG } from "../game/battle";
import type { Mon } from "../game/mon";

export function HpBar({ hp, max, wide = false }: { hp: number; max: number; wide?: boolean }) {
  const f = Math.max(0, Math.min(1, hp / Math.max(1, max)));
  const color = f > 0.5 ? "#3fd46a" : f > 0.2 ? "#f2c230" : "#e8453a";
  return (
    <div className={`hpbar ${wide ? "wide" : ""}`}>
      <span className="hp-label">HP</span>
      <div className="hp-track">
        <div className="hp-fill" style={{ width: `${f * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export function TypeBadge({ t }: { t: TypeId }) {
  return (
    <span className="type-badge" style={{ background: TYPES[t].color }}>
      {tr(TYPES[t].name).toUpperCase()}
    </span>
  );
}

export function StatusTag({ mon }: { mon: Mon }) {
  if (mon.hp <= 0) return <span className="status-tag fnt">{tr({ en: "FNT", pt: "DSM" })}</span>;
  if (!mon.status) return null;
  return <span className={`status-tag ${mon.status}`}>{tr(STATUS_TAG[mon.status])}</span>;
}

/** Tiny round critter icon tinted with the species color (menus stay 2D and cheap). */
export function MonIcon({ species, size = 34, fainted = false }: { species: SpeciesId; size?: number; fainted?: boolean }) {
  const c = SPECIES[species].color;
  return (
    <span className={`mon-icon ${fainted ? "fainted" : ""}`} style={{ width: size, height: size, background: c }}>
      <i style={{ left: "28%" }} />
      <i style={{ left: "58%" }} />
    </span>
  );
}

function Spin({ species, silhouette }: { species: SpeciesId; silhouette: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.8;
  });
  const big = SPECIES[species].height > 0.9;
  return (
    <group ref={ref} position={[0, big ? -0.62 : -0.42, 0]} scale={big ? 0.95 : 1.25}>
      <MaterialOverride material={silhouette ? mat("#1b1b28") : null}>
        <CreatureModel species={species} />
      </MaterialOverride>
    </group>
  );
}

/** Small separate canvas with a slowly turning 3D model; only mounted while a detail view is open. */
export function Portrait({ species, silhouette = false, size = 180 }: { species: SpeciesId; silhouette?: boolean; size?: number }) {
  return (
    <div className="portrait" style={{ width: size, height: size }}>
      <Canvas dpr={1} camera={{ position: [0, 0.35, 2.3], fov: 35 }} gl={{ antialias: true, alpha: true }}>
        <hemisphereLight args={["#ffffff", "#8a9aa0", 1.4]} />
        <directionalLight position={[2, 3, 3]} intensity={1.3} />
        <Spin species={species} silhouette={silhouette} />
      </Canvas>
    </div>
  );
}
