// Shared low-poly building blocks. Geometries and materials are cached so hundreds of
// meshes reuse a handful of GPU buffers (matters on integrated Intel graphics).

import { createContext, useContext, type ReactNode } from "react";
import * as THREE from "three";

export const GEO = {
  sphere: new THREE.IcosahedronGeometry(1, 1),
  sphereHi: new THREE.IcosahedronGeometry(1, 2),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 6),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  rock: new THREE.DodecahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.35, 5, 10),
  plane: new THREE.PlaneGeometry(1, 1),
};

const lambertCache = new Map<string, THREE.MeshLambertMaterial>();
const basicCache = new Map<string, THREE.MeshBasicMaterial>();

/** Flat-shaded Lambert: cheap lighting and a faceted low-poly look. */
export function mat(color: string): THREE.MeshLambertMaterial {
  let m = lambertCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true });
    lambertCache.set(color, m);
  }
  return m;
}

/** Unlit material for things that glow (flames, lamps, eyes' shine). */
export function glow(color: string, opacity = 1): THREE.MeshBasicMaterial {
  const key = color + opacity;
  let m = basicCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    basicCache.set(key, m);
  }
  return m;
}

// Lets the evolution scene paint a whole model as a white silhouette.
const Override = createContext<THREE.Material | null>(null);
export function MaterialOverride({ material, children }: { material: THREE.Material | null; children: ReactNode }) {
  return <Override.Provider value={material}>{children}</Override.Provider>;
}

type V3 = [number, number, number];
interface P {
  p?: V3;
  s?: V3 | number;
  r?: V3;
  c: string;
  g?: boolean; // glow
  shadow?: boolean;
}

function Prim({ geo, p, s, r, c, g, shadow = true }: P & { geo: THREE.BufferGeometry }) {
  const o = useContext(Override);
  const scale: V3 = typeof s === "number" ? [s, s, s] : s ?? [1, 1, 1];
  return <mesh geometry={geo} material={o ?? (g ? glow(c) : mat(c))} position={p} scale={scale} rotation={r} castShadow={shadow && !g} />;
}

export const Sph = (props: P) => <Prim geo={GEO.sphere} {...props} />;
export const SphHi = (props: P) => <Prim geo={GEO.sphereHi} {...props} />;
export const Bx = (props: P) => <Prim geo={GEO.box} {...props} />;
export const Cn = (props: P) => <Prim geo={GEO.cone} {...props} />;
export const Cn4 = (props: P) => <Prim geo={GEO.cone4} {...props} />;
export const Cy = (props: P) => <Prim geo={GEO.cyl} {...props} />;
export const Rk = (props: P) => <Prim geo={GEO.rock} {...props} />;
export const Tor = (props: P) => <Prim geo={GEO.torus} {...props} />;

/** Cartoon eye: dark ball with a white glint. */
export function Eye({ p, s = 0.05, c = "#1b1b24", white = false }: { p: V3; s?: number; c?: string; white?: boolean }) {
  return (
    <group position={p}>
      {white && <SphHi s={[s * 1.35, s * 1.45, s * 0.8]} c="#ffffff" shadow={false} />}
      <SphHi p={[0, 0, s * 0.25]} s={[s, s * 1.15, s * 0.7]} c={c} shadow={false} />
      <SphHi p={[s * 0.35, s * 0.4, s * 0.75]} s={s * 0.32} c="#ffffff" g />
    </group>
  );
}

// Topaz, the rock arena's gem: a hexagonal prism with a pointed tip.
export const TOPAZ = "#f0a030";

export function Crystal({ p, s, r = [0, 0, 0], c, tip }: { p: V3; s: number; r?: V3; c: string; tip?: boolean }) {
  return (
    <group position={p} rotation={r} scale={s}>
      <mesh geometry={GEO.cyl6} material={mat(c)} position={[0, 0.3, 0]} scale={[0.3, 0.6, 0.3]} castShadow />
      <mesh geometry={GEO.cone} material={tip ? glow("#ffd66b") : mat(c)} position={[0, 0.8, 0]} scale={[0.3, 0.4, 0.3]} castShadow={!tip} />
    </group>
  );
}

export function CrystalCluster({ p, s, topaz = TOPAZ, accent = "#ffc34d", tip }: { p: V3; s: number; topaz?: string; accent?: string; tip?: boolean }) {
  return (
    <group position={p} scale={s}>
      <Crystal p={[0, 0, 0]} s={1} c={topaz} tip={tip} />
      <Crystal p={[0.25, -0.05, 0.05]} s={0.7} r={[0.1, 0, -0.5]} c={accent} />
      <Crystal p={[-0.22, -0.05, 0.1]} s={0.6} r={[0.2, 0, 0.55]} c={topaz} />
    </group>
  );
}

/** Rusty mine cart heaped with topaz, wheels on the ground at the origin. */
export function MineCart() {
  return (
    <group>
      <Bx p={[0, 0.32, 0]} s={[0.6, 0.32, 0.4]} c="#6e5a48" />
      <Bx p={[0, 0.49, 0]} s={[0.64, 0.05, 0.44]} c="#4a4a4a" />
      {[-0.2, 0.2].map((x) =>
        [-0.21, 0.21].map((z) => <Cy key={`${x},${z}`} p={[x, 0.13, z]} r={[Math.PI / 2, 0, 0]} s={[0.09, 0.05, 0.09]} c="#2a2a2a" />),
      )}
      <Rk p={[-0.13, 0.52, 0.02]} s={0.13} c={TOPAZ} />
      <Rk p={[0.12, 0.54, -0.04]} s={0.14} c="#ffc34d" />
      <Rk p={[0.02, 0.6, 0.06]} s={0.1} c="#ffd66b" g />
    </group>
  );
}
