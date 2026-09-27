// The outdoor map: instanced ground tiles, trees, tall grass, flowers, water and buildings.
// Instancing keeps this to a few dozen draw calls for ~2,500 tiles.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BUILDINGS, GROUND_ITEMS, OVERWORLD, OW_H, OW_W, SIGNS, type Building } from "../world/maps";
import { useGame } from "../game/store";
import { mat, glow, Bx, Cy, Cn, Sph, GEO } from "./prims";
import { AmuletModel } from "./Amulet";

// Deterministic pseudo-random so the map looks the same every load.
function hash(x: number, y: number, s = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const sc = new THREE.Vector3();
const col = new THREE.Color();

function setInst(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, rx = 0, rz = 0) {
  e.set(rx, ry, rz);
  q.setFromEuler(e);
  m4.compose(v.set(x, y, z), q, sc.set(sx, sy, sz));
  mesh.setMatrixAt(i, m4);
}

function makeInstanced(geo: THREE.BufferGeometry, material: THREE.Material, count: number, shadow: { cast?: boolean; receive?: boolean } = {}) {
  const m = new THREE.InstancedMesh(geo, material, Math.max(1, count));
  m.castShadow = !!shadow.cast;
  m.receiveShadow = !!shadow.receive;
  m.count = count;
  return m;
}

const GROUND_COLORS: Record<string, string[]> = {
  ".": ["#86c95c", "#80c257", "#8ccf62"],
  f: ["#86c95c", "#80c257"],
  '"': ["#6fb34a"],
  L: ["#86c95c"],
  ",": ["#d9b77a", "#d4b073", "#dcbc80"],
  s: ["#d8d2c4", "#cfc8b8"],
  T: ["#5f9e44", "#5a9840"],
  r: ["#86c95c"],
  F: ["#86c95c"],
  O: ["#d8d2c4"],
};

function useTerrain() {
  return useMemo(() => {
    const tiles: [number, number, string][] = [];
    for (let y = 0; y < OW_H; y++) for (let x = 0; x < OW_W; x++) tiles.push([x, y, OVERWORLD[y][x]]);

    // Ground tiles (everything except water gets a grass/dirt/stone block).
    const groundTiles = tiles.filter(([, , t]) => t !== "~" && t !== "=");
    const ground = makeInstanced(GEO.box, new THREE.MeshLambertMaterial({ color: "#ffffff" }), groundTiles.length, { receive: true });
    groundTiles.forEach(([x, y, t], i) => {
      setInst(ground, i, x, -0.1, y, 1, 0.2, 1);
      const pal = GROUND_COLORS[t] ?? (/[A-Za-z]/.test(t) ? ["#c9c2b0"] : ["#86c95c"]);
      const k = t === "s" ? (x + y) % 2 : Math.floor(hash(x, y) * pal.length);
      ground.setColorAt(i, col.set(pal[k % pal.length]));
    });

    // Water + riverbed
    const waterTiles = tiles.filter(([, , t]) => t === "~" || t === "=");
    const bed = makeInstanced(GEO.box, mat("#3d7fa8"), waterTiles.length);
    const water = makeInstanced(GEO.box, new THREE.MeshLambertMaterial({ color: "#4fa8e0", transparent: true, opacity: 0.88 }), waterTiles.length);
    waterTiles.forEach(([x, y], i) => {
      setInst(bed, i, x, -0.45, y, 1, 0.2, 1);
      setInst(water, i, x, -0.16, y, 1, 0.04, 1);
    });

    // Trees: map trees cast shadows; a decorative forest ring outside the map doesn't.
    const inner: [number, number][] = tiles.filter(([, , t]) => t === "T").map(([x, y]) => [x, y]);
    const outer: [number, number][] = [];
    for (let y = -5; y < OW_H + 5; y++)
      for (let x = -6; x < OW_W + 6; x++) {
        if (x >= 0 && x < OW_W && y >= 0 && y < OW_H) continue;
        if (hash(x, y, 3) < 0.72) outer.push([x, y]);
      }
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.14, 1, 6);
    const canopyGeo = new THREE.IcosahedronGeometry(1, 0);
    const buildTrees = (list: [number, number][], cast: boolean) => {
      const trunks = makeInstanced(trunkGeo, mat("#7a5230"), list.length, { cast });
      const canopy = makeInstanced(canopyGeo, new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true }), list.length * 2, { cast });
      let ci = 0;
      list.forEach(([x, y], i) => {
        const h = hash(x, y, 1);
        const jx = (hash(x, y, 2) - 0.5) * 0.25;
        const jz = (hash(x, y, 5) - 0.5) * 0.25;
        const tall = 0.9 + h * 0.5;
        setInst(trunks, i, x + jx, tall / 2, y + jz, 1, tall, 1);
        const village = y < 18;
        // Ipê trees (pink / yellow) brighten the villages; cerrado greens elsewhere.
        const colorPick = hash(x, y, 7);
        let c = ["#3f8f3a", "#4c9c3e", "#357f35", "#5aa845"][Math.floor(h * 4)];
        if ((village || y > 55) && colorPick < 0.16) c = colorPick < 0.08 ? "#e35fb0" : "#f2c230";
        const r = 0.55 + h * 0.2;
        setInst(canopy, ci, x + jx, tall + r * 0.55, y + jz, r, r * 0.85, r, h * 3);
        canopy.setColorAt(ci++, col.set(c));
        setInst(canopy, ci, x + jx + 0.1, tall + r * 1.2, y + jz - 0.05, r * 0.65, r * 0.6, r * 0.65, h * 5);
        canopy.setColorAt(ci++, col.set(c).offsetHSL(0, 0, 0.06));
      });
      return [trunks, canopy];
    };
    const [innerTrunks, innerCanopy] = buildTrees(inner, true);
    const [outerTrunks, outerCanopy] = buildTrees(outer, false);

    // Tall grass tufts: 5 blades merged into one geometry, one instance per tile.
    const blades: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.ConeGeometry(0.08, 0.5, 4);
      b.translate(0, 0.25, 0);
      b.rotateZ((hash(i, 9) - 0.5) * 0.5);
      b.translate(Math.cos(i * 1.1) * 0.25, 0, Math.sin(i * 1.7) * 0.25);
      blades.push(b);
    }
    const tuftGeo = mergeGeometries(blades)!;
    const grassTiles = tiles.filter(([, , t]) => t === '"');
    const grass = makeInstanced(tuftGeo, new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true }), grassTiles.length * 2, { cast: true });
    grassTiles.forEach(([x, y], i) => {
      setInst(grass, i * 2, x - 0.15, 0, y - 0.15, 1, 0.9 + hash(x, y) * 0.3, 1, hash(x, y, 4) * 6);
      setInst(grass, i * 2 + 1, x + 0.2, 0, y + 0.2, 0.9, 0.8 + hash(x, y, 8) * 0.3, 0.9, hash(x, y, 6) * 6);
      grass.setColorAt(i * 2, col.set("#3d9a3a"));
      grass.setColorAt(i * 2 + 1, col.set("#4aa842"));
    });

    // Flowers
    const flowerTiles = tiles.filter(([, , t]) => t === "f");
    const flowers = makeInstanced(GEO.sphere, new THREE.MeshLambertMaterial({ color: "#ffffff" }), flowerTiles.length * 4);
    const FC = ["#ff5a6a", "#ffd23a", "#ffffff", "#ff8ad0", "#b07aff"];
    flowerTiles.forEach(([x, y], i) => {
      for (let k = 0; k < 4; k++) {
        const fx = x + (hash(x, y, k) - 0.5) * 0.7;
        const fz = y + (hash(y, x, k) - 0.5) * 0.7;
        setInst(flowers, i * 4 + k, fx, 0.08, fz, 0.08, 0.06, 0.08);
        flowers.setColorAt(i * 4 + k, col.set(FC[Math.floor(hash(x, y, k + 10) * FC.length)]));
      }
    });

    // Boulders
    const rockTiles = tiles.filter(([, , t]) => t === "r");
    const rocks = makeInstanced(GEO.rock, mat("#9c968c"), rockTiles.length, { cast: true });
    rockTiles.forEach(([x, y], i) => setInst(rocks, i, x, 0.25, y, 0.42, 0.34, 0.4, hash(x, y) * 4));

    // Ledges: a raised lip on the south edge of the tile
    const ledgeTiles = tiles.filter(([, , t]) => t === "L");
    const ledges = makeInstanced(GEO.box, mat("#5f9e44"), ledgeTiles.length, { cast: true, receive: true });
    ledgeTiles.forEach(([x, y], i) => setInst(ledges, i, x, 0.08, y + 0.25, 1.001, 0.2, 0.5));

    // Fences: post + rails oriented along neighbouring fence tiles
    const fenceTiles = tiles.filter(([, , t]) => t === "F");
    const posts = makeInstanced(GEO.box, mat("#f4ead8"), fenceTiles.length, { cast: true });
    const rails = makeInstanced(GEO.box, mat("#f4ead8"), fenceTiles.length * 2, { cast: true });
    fenceTiles.forEach(([x, y], i) => {
      setInst(posts, i, x, 0.3, y, 0.1, 0.6, 0.1);
      const vertical = OVERWORLD[y - 1]?.[x] === "F" || OVERWORLD[y + 1]?.[x] === "F";
      for (let k = 0; k < 2; k++) setInst(rails, i * 2 + k, x, 0.22 + k * 0.22, y, vertical ? 0.05 : 1, 0.06, vertical ? 1 : 0.05);
    });

    // Bridge planks
    const bridgeTiles = tiles.filter(([, , t]) => t === "=");
    const planks = makeInstanced(GEO.box, mat("#a8743e"), bridgeTiles.length * 4, { cast: true, receive: true });
    bridgeTiles.forEach(([x, y], i) => {
      for (let k = 0; k < 4; k++) setInst(planks, i * 4 + k, x, -0.02, y - 0.375 + k * 0.25, 1, 0.08, 0.22);
    });

    [ground, bed, water, innerTrunks, innerCanopy, outerTrunks, outerCanopy, grass, flowers, rocks, ledges, posts, rails, planks].forEach((mm) => {
      mm.instanceMatrix.needsUpdate = true;
      if (mm.instanceColor) mm.instanceColor.needsUpdate = true;
      mm.computeBoundingSphere();
    });
    return { objects: [ground, bed, water, innerTrunks, innerCanopy, outerTrunks, outerCanopy, grass, flowers, rocks, ledges, posts, rails, planks], bridgeTiles };
  }, []);
}

function Sparkles() {
  // A few glints drifting over the river and pond.
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: [number, number][] = [];
    for (let y = 0; y < OW_H; y++) for (let x = 0; x < OW_W; x++) if (OVERWORLD[y][x] === "~" && hash(x, y, 11) < 0.35) out.push([x, y]);
    return out;
  }, []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    spots.forEach(([x, y], i) => {
      const s = Math.max(0, Math.sin(t * 2 + i * 1.7)) * 0.12;
      setInst(m, i, x + Math.sin(t * 0.5 + i) * 0.3, -0.12, y + Math.cos(t * 0.4 + i) * 0.3, s, 0.01, s * 0.4, 0.3);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[GEO.box, glow("#ffffff"), spots.length]} frustumCulled={false} />;
}

function BridgeRails() {
  return (
    <group>
      {[14.5, 16.5].map((x) => (
        <group key={x}>
          <Bx p={[x, 0.35, 34.5]} s={[0.08, 0.06, 2.2]} c="#8a5a2e" />
          {[33.6, 34.5, 35.4].map((z) => (
            <Bx key={z} p={[x, 0.18, z]} s={[0.08, 0.4, 0.08]} c="#8a5a2e" />
          ))}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- buildings
const ROOF_GEO = (() => {
  const g = new THREE.ConeGeometry(1, 1, 4);
  g.rotateY(Math.PI / 4);
  return g;
})();

function Roof({ w, d, h, y, color, x = 0, z = 0 }: { w: number; d: number; h: number; y: number; color: string; x?: number; z?: number }) {
  return <mesh geometry={ROOF_GEO} material={mat(color)} position={[x, y + h / 2, z]} scale={[(w / Math.SQRT2) * 1.12, h, (d / Math.SQRT2) * 1.12]} castShadow />;
}

function Window({ x, y, z, frame = "#2f6fb0", w = 0.36, h = 0.42 }: { x: number; y: number; z: number; frame?: string; w?: number; h?: number }) {
  return (
    <group position={[x, y, z]}>
      <Bx s={[w + 0.08, h + 0.08, 0.05]} c={frame} shadow={false} />
      <Bx p={[0, 0, 0.02]} s={[w, h, 0.04]} c="#bfe6ff" shadow={false} />
      <Bx p={[0, 0, 0.045]} s={[0.03, h, 0.01]} c={frame} shadow={false} />
    </group>
  );
}

function BuildingMesh({ b }: { b: Building }) {
  const cx = b.x + (b.w - 1) / 2;
  const cz = b.y + (b.h - 1) / 2;
  const W = b.w - 0.1;
  const D = b.h - 0.1;
  const wallH = { home: 1.35, rivalhouse: 1.35, house: 1.3, lab: 1.7, center: 1.6, mart: 1.5, church: 2.1, arena: 2.2 }[b.kind];
  const front = D / 2 + 0.01;
  const doorX = b.door[0] - cx;
  const trim = b.kind === "house" || b.kind === "home" || b.kind === "rivalhouse" ? "#2f6fb0" : "#555";
  const windowXs: number[] = [];
  for (let i = 0; i < b.w; i++) {
    const wx = -W / 2 + 0.5 + i;
    if (Math.abs(wx - doorX) > 0.7) windowXs.push(wx);
  }
  return (
    <group position={[cx, 0, cz]}>
      <mesh geometry={GEO.box} material={mat(b.color)} position={[0, wallH / 2, 0]} scale={[W, wallH, D]} castShadow receiveShadow />
      {/* base trim */}
      <Bx p={[0, 0.08, 0]} s={[W + 0.04, 0.16, D + 0.04]} c={b.kind === "church" ? "#c9b48a" : "#8a7a66"} />
      {b.kind === "church" ? (
        <Church W={W} D={D} wallH={wallH} />
      ) : b.kind === "arena" ? (
        <>
          <Roof w={W + 0.2} d={D + 0.2} h={0.9} y={wallH} color={b.roof} />
          <Cy p={[0, wallH + 0.95, 0]} s={[0.06, 0.4, 0.06]} c="#ddd" />
          <Cn p={[0, wallH + 1.25, 0]} s={[0.25, 0.3, 0.25]} c="#f2c230" />
        </>
      ) : (
        <Roof w={W + 0.2} d={D + 0.2} h={b.kind === "lab" ? 0.7 : 1} y={wallH} color={b.roof} />
      )}
      {/* door */}
      <group position={[doorX, 0, front]}>
        <Bx p={[0, 0.5, 0]} s={[0.62, 1.0, 0.06]} c={b.kind === "center" || b.kind === "mart" || b.kind === "lab" ? "#9ad0f0" : "#6a3e22"} shadow={false} />
        <Bx p={[0, 1.04, 0]} s={[0.74, 0.08, 0.08]} c={trim} shadow={false} />
        <Bx p={[0, 0.02, 0.25]} s={[0.8, 0.04, 0.4]} c="#b8a88a" />
      </group>
      {b.kind !== "church" && windowXs.map((wx) => <Window key={wx} x={wx} y={wallH * 0.58} z={front} frame={trim} w={b.kind === "lab" ? 0.55 : 0.36} />)}
      {b.kind === "center" && <Emblem x={doorX} y={wallH + 0.05} z={front + 0.05} kind="center" />}
      {b.kind === "mart" && <Emblem x={doorX} y={wallH + 0.05} z={front + 0.05} kind="mart" />}
      {b.kind === "lab" && (
        <group position={[W / 2 - 0.6, wallH + 0.5, -0.3]}>
          <Cy s={[0.04, 0.6, 0.04]} c="#aaa" />
          <Sph p={[0, 0.4, 0.1]} s={[0.3, 0.3, 0.08]} r={[0.5, 0, 0]} c="#e8e8e8" />
        </group>
      )}
      {(b.kind === "home" || b.kind === "rivalhouse" || b.kind === "house") && (
        <Bx p={[W / 2 - 0.5, wallH + 0.55, -0.2]} s={[0.25, 0.6, 0.25]} c="#b0503a" />
      )}
    </group>
  );
}

function Emblem({ x, y, z, kind }: { x: number; y: number; z: number; kind: "center" | "mart" }) {
  const c = kind === "center" ? "#e0342c" : "#3a7bd5";
  return (
    <group position={[x, y, z]}>
      <Bx s={[1.3, 0.42, 0.06]} c="#ffffff" />
      {kind === "center" ? (
        <>
          <Bx p={[0, 0, 0.04]} s={[0.26, 0.08, 0.02]} c={c} shadow={false} />
          <Bx p={[0, 0, 0.04]} s={[0.08, 0.26, 0.02]} c={c} shadow={false} />
        </>
      ) : (
        <>
          <Bx p={[0, -0.03, 0.04]} s={[0.24, 0.2, 0.02]} c={c} shadow={false} />
          <Bx p={[0, 0.1, 0.04]} s={[0.12, 0.06, 0.02]} c={c} shadow={false} />
        </>
      )}
    </group>
  );
}

function Church({ W, D, wallH }: { W: number; D: number; wallH: number }) {
  return (
    <group>
      <Roof w={W + 0.2} d={D + 0.2} h={1.1} y={wallH} color="#b5542f" />
      {/* Baroque-style twin bell towers, Minas colonial style */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * (W / 2 - 0.45), 0, D / 2 - 0.3]}>
          <Bx p={[0, (wallH + 1.2) / 2, 0]} s={[0.9, wallH + 1.2, 0.9]} c="#fdfaf2" />
          <Bx p={[0, wallH + 0.8, 0.46]} s={[0.36, 0.5, 0.04]} c="#3a2a1a" shadow={false} />
          <Cn4 p={[0, wallH + 1.55, 0]} s={[0.65, 0.7, 0.65]} r={[0, Math.PI / 4, 0]} c="#3f7fa8" />
          <Bx p={[0, 0.9, 0.46]} s={[0.92, 0.1, 0.04]} c="#3f7fa8" shadow={false} />
        </group>
      ))}
      <Bx p={[0, wallH + 0.45, D / 2 + 0.02]} s={[1.2, 0.9, 0.08]} c="#fdfaf2" />
      <Bx p={[0, wallH + 1.05, D / 2 + 0.02]} s={[0.08, 0.5, 0.06]} c="#d9a52a" />
      <Bx p={[0, wallH + 1.12, D / 2 + 0.02]} s={[0.3, 0.07, 0.06]} c="#d9a52a" />
      <Bx p={[0, 1.2, D / 2 + 0.02]} s={[1.0, 0.12, 0.05]} c="#3f7fa8" shadow={false} />
    </group>
  );
}

function Cn4({ p, s, r, c }: { p: [number, number, number]; s: [number, number, number]; r: [number, number, number]; c: string }) {
  return <mesh geometry={GEO.cone4} material={mat(c)} position={p} scale={s} rotation={r} castShadow />;
}

function FountainOne({ x, z }: { x: number; z: number }) {
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (water.current) water.current.position.y = 1.02 + Math.sin(clock.elapsedTime * 4) * 0.03;
  });
  return (
    <group position={[x, 0, z]}>
      <Cy p={[0, 0.2, 0]} s={[0.95, 0.4, 0.95]} c="#cfc6b4" />
      <mesh position={[0, 0.36, 0]} scale={[0.85, 0.06, 0.85]} geometry={GEO.cyl} material={mat("#5ab4e8")} />
      <Cy p={[0, 0.65, 0]} s={[0.15, 0.6, 0.15]} c="#cfc6b4" />
      <Cy p={[0, 0.95, 0]} s={[0.45, 0.12, 0.45]} c="#cfc6b4" />
      <mesh ref={water} position={[0, 1.02, 0]} scale={[0.12, 0.2, 0.12]} geometry={GEO.sphere} material={glow("#bfe8ff")} />
    </group>
  );
}

function Fountain() {
  const spots: [number, number][] = [];
  for (let y = 0; y < OW_H; y++)
    for (let x = 0; x < OW_W; x++) if (OVERWORLD[y][x] === "O" && OVERWORLD[y][x - 1] !== "O" && OVERWORLD[y - 1]?.[x] !== "O") spots.push([x + 0.5, y + 0.5]);
  return (
    <>
      {spots.map(([x, z]) => (
        <FountainOne key={`${x},${z}`} x={x} z={z} />
      ))}
    </>
  );
}

function SignPost({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, 0, y]}>
      <Bx p={[0, 0.3, 0]} s={[0.08, 0.6, 0.08]} c="#7a5230" />
      <Bx p={[0, 0.62, 0]} s={[0.7, 0.4, 0.08]} c="#a8743e" />
      <Bx p={[0, 0.62, 0.045]} s={[0.56, 0.26, 0.01]} c="#e8d4a8" shadow={false} />
    </group>
  );
}

function GroundItems() {
  const flags = useGame((s) => s.flags);
  return (
    <>
      {GROUND_ITEMS.filter((i) => i.map === "overworld" && !flags["item_" + i.id]).map((i) => (
        <group key={i.id} position={[i.x, 0.16, i.y]} scale={0.15} rotation={[0.3, 0.4, 0]}>
          <AmuletModel />
        </group>
      ))}
    </>
  );
}

function Lampposts() {
  const spots: [number, number][] = [[9, 63], [22, 63], [13, 8], [19, 8], [9, 68], [22, 68]];
  return (
    <>
      {spots.map(([x, y]) => (
        <group key={`${x},${y}`} position={[x + 0.4, 0, y - 0.4]}>
          <Cy p={[0, 0.8, 0]} s={[0.04, 1.6, 0.04]} c="#2a2a2a" />
          <Bx p={[0, 1.65, 0]} s={[0.18, 0.22, 0.18]} c="#2a2a2a" />
          <Bx p={[0, 1.65, 0]} s={[0.13, 0.17, 0.2]} c="#ffe9a0" g />
        </group>
      ))}
    </>
  );
}

export function Overworld() {
  const { objects } = useTerrain();
  return (
    <group>
      {objects.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
      {/* Big backdrop ground beyond the edges */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[OW_W / 2, -0.21, OW_H / 2]} receiveShadow>
        <planeGeometry args={[OW_W + 60, OW_H + 60]} />
        <meshLambertMaterial color="#5f9e44" />
      </mesh>
      <Sparkles />
      <BridgeRails />
      <Fountain />
      <Lampposts />
      {BUILDINGS.map((b) => (
        <BuildingMesh key={`${b.x},${b.y}`} b={b} />
      ))}
      {SIGNS.filter((s) => s.map === "overworld").map((s) => (
        <SignPost key={`${s.x},${s.y}`} x={s.x} y={s.y} />
      ))}
      <GroundItems />
    </group>
  );
}
