// The outdoor map: instanced ground tiles, trees, tall grass, flowers, water and buildings.
// Instancing keeps this to a few dozen draw calls for ~2,500 tiles.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BUILDINGS, GROUND_ITEMS, OW_H, OW_W, OW_Y0, SIGNS, owTile, type Building } from "../world/maps";
import { useGame } from "../game/store";
import { mat, glow, Bx, Cy, Sph, Tor, GEO, Crystal, CrystalCluster, MineCart } from "./prims";
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
    for (let y = OW_Y0; y < OW_H; y++) for (let x = 0; x < OW_W; x++) tiles.push([x, y, owTile(x, y)]);

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
    for (let y = OW_Y0 - 5; y < OW_H + 5; y++)
      for (let x = -6; x < OW_W + 6; x++) {
        if (x >= 0 && x < OW_W && y >= OW_Y0 && y < OW_H) continue;
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
        const village = y >= 0 && y < 18;
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
      const vertical = owTile(x, y - 1) === "F" || owTile(x, y + 1) === "F";
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
    for (let y = OW_Y0; y < OW_H; y++) for (let x = 0; x < OW_W; x++) if (owTile(x, y) === "~" && hash(x, y, 11) < 0.35) out.push([x, y]);
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
  const wallH = { home: 1.35, rivalhouse: 1.35, house: 1.3, lab: 1.7, center: 1.6, mart: 1.5, church: 2.1, arena: 0, cave: 0 }[b.kind];
  const front = D / 2 + 0.01;
  const doorX = b.door[0] - cx;
  if (b.kind === "arena")
    return (
      <group position={[cx, 0, cz]}>
        <Arena W={W} D={D} doorX={doorX} rock={b.color} topaz={b.roof} />
      </group>
    );
  if (b.kind === "cave")
    return (
      <group position={[cx, 0, cz]}>
        <CaveMouth W={W} D={D} doorX={doorX} rock={b.color} dark={b.roof} />
      </group>
    );
  const accent = b.kind === "center" ? CENTER_RED : b.kind === "mart" ? MART_BLUE : null;
  const trim = b.kind === "house" || b.kind === "home" || b.kind === "rivalhouse" ? "#2f6fb0" : accent ?? "#555";
  const doorC = accent || b.kind === "lab" ? "#9ad0f0" : "#6a3e22";
  const windowXs: number[] = [];
  for (let i = 0; i < b.w; i++) {
    const wx = -W / 2 + 0.5 + i;
    if (Math.abs(wx - doorX) > 0.7) windowXs.push(wx);
  }
  return (
    <group position={[cx, 0, cz]}>
      <mesh geometry={GEO.box} material={mat(b.color)} position={[0, wallH / 2, 0]} scale={[W, wallH, D]} castShadow receiveShadow />
      {/* base trim */}
      {accent ? (
        <Bx p={[0, 0.15, 0]} s={[W + 0.04, 0.3, D + 0.04]} c={accent} />
      ) : (
        <Bx p={[0, 0.08, 0]} s={[W + 0.04, 0.16, D + 0.04]} c={b.kind === "church" ? "#c9b48a" : "#8a7a66"} />
      )}
      {b.kind === "church" ? (
        <Church W={W} D={D} wallH={wallH} />
      ) : (
        // Shops get a low roof so the rooftop sign stands out; houses keep the steep one.
        <Roof w={W + 0.2} d={D + 0.2} h={accent ? 0.5 : b.kind === "lab" ? 0.7 : 1} y={wallH} color={b.roof} />
      )}
      {accent && <ShopFront kind={b.kind as "center" | "mart"} c={accent} W={W} D={D} wallH={wallH} doorX={doorX} front={front} />}
      {/* door */}
      <group position={[doorX, 0, front]}>
        <Bx p={[0, 0.5, 0]} s={[0.62, 1.0, 0.06]} c={doorC} shadow={false} />
        <Bx p={[0, 1.04, 0]} s={[0.74, 0.08, 0.08]} c={trim} shadow={false} />
        <Bx p={[0, 0.02, 0.25]} s={[0.8, 0.04, 0.4]} c="#b8a88a" />
      </group>
      {b.kind !== "church" && windowXs.map((wx) => <Window key={wx} x={wx} y={wallH * 0.58} z={front} frame={trim} w={b.kind === "lab" ? 0.55 : 0.36} />)}
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

// Healing center (red, cross) and shop (blue, bag): coloured trim, an awning over the
// entrance and a big sign standing on the eave above the door. The sign has to sit at the
// front: the follow camera only sees a few tiles north, so a sign on the roof peak is off
// screen by the time you reach the door.
const CENTER_RED = "#e0342c";
const MART_BLUE = "#3a7bd5";

function ShopFront({ kind, c, W, D, wallH, doorX, front }: { kind: "center" | "mart"; c: string; W: number; D: number; wallH: number; doorX: number; front: number }) {
  const stripes = Math.round((W + 0.1) / 0.3);
  const sw = (W + 0.1) / stripes;
  const eave = 0.56 * (D + 0.2); // how far the Roof reaches past the building's centre
  return (
    <group>
      {kind === "center" ? (
        <group position={[doorX, 1.3, front]} rotation={[0.45, 0, 0]}>
          <Bx p={[0, 0, 0.18]} s={[1.1, 0.05, 0.36]} c={c} />
          <Bx p={[0, -0.05, 0.36]} s={[1.1, 0.1, 0.03]} c="#ffffff" />
        </group>
      ) : (
        <group position={[0, 1.2, front]} rotation={[0.45, 0, 0]}>
          {Array.from({ length: stripes }, (_, i) => (
            <Bx key={i} p={[-(W + 0.1) / 2 + sw * (i + 0.5), 0, 0.18]} s={[sw, 0.05, 0.36]} c={i % 2 ? "#ffffff" : c} />
          ))}
        </group>
      )}
      <group position={[doorX, wallH + 0.3, eave + 0.06]}>
        {kind === "center" ? (
          <>
            <Cy r={[Math.PI / 2, Math.PI / 8, 0]} s={[0.6, 0.08, 0.6]} c={c} />
            <Cy p={[0, 0, 0.03]} r={[Math.PI / 2, Math.PI / 8, 0]} s={[0.52, 0.06, 0.52]} c="#ffffff" />
            <Bx p={[0, 0, 0.07]} s={[0.72, 0.24, 0.04]} c={c} g />
            <Bx p={[0, 0, 0.07]} s={[0.24, 0.72, 0.04]} c={c} g />
          </>
        ) : (
          <>
            <Bx s={[1.3, 0.8, 0.08]} c="#ffffff" />
            <Bx p={[0, 0, 0.03]} s={[1.18, 0.68, 0.06]} c={c} />
            {/* shopping bag: the handle's lower half hides behind the body */}
            <Tor p={[0, 0.08, 0.04]} s={[0.1, 0.1, 0.1]} c="#ffffff" g />
            <Bx p={[0, -0.07, 0.07]} s={[0.38, 0.3, 0.02]} c="#ffffff" g />
          </>
        )}
      </group>
    </group>
  );
}

// The gym, Topázio's rock arena: an old Minas Gerais mine dug into a craggy hill. A timber
// portal is the door, a mine cart full of topaz waits on the rails, a headframe's winding
// wheel turns on the shoulder of the hill and a big topaz crystal crowns the peak.
const WOOD = "#6b4a2a";
const IRON = "#4a4a4a";

// [x, y, z, sx, sy, sz, tone] boulders forming the hill; the portal at x = 0 stays clear.
const HILL: [number, number, number, number, number, number, number][] = [
  [-2.6, 1.55, 1.5, 0.9, 0.7, 0.7, 0],
  [-1.45, 1.7, 1.55, 0.75, 0.6, 0.6, 1],
  [0, 2.0, 1.3, 0.85, 0.55, 0.7, 2],
  [1.45, 1.65, 1.55, 0.75, 0.65, 0.6, 0],
  [2.6, 1.55, 1.5, 0.9, 0.7, 0.7, 1],
  [-2.0, 2.3, 0.2, 1.1, 0.9, 1.0, 2],
  [-0.3, 2.55, 0.0, 1.2, 1.0, 1.1, 0],
  [1.6, 2.35, 0.3, 1.0, 0.85, 1.0, 1],
  [-1.2, 2.8, -1.0, 1.1, 1.1, 1.0, 1],
  [0.9, 2.45, -1.3, 1.0, 0.9, 0.9, 2],
  [-2.7, 2.0, -1.4, 0.8, 0.8, 0.8, 0],
  [2.5, 1.9, -1.2, 0.85, 0.85, 0.8, 0],
  [-3.2, 0.7, 1.4, 0.7, 0.8, 0.6, 1],
  [3.2, 0.7, 1.4, 0.7, 0.8, 0.6, 2],
  [-1.75, 0.8, 1.8, 0.5, 0.65, 0.3, 2],
  [2.4, 0.95, 1.75, 0.55, 0.55, 0.3, 0],
  [2.95, 1.2, -0.7, 0.6, 0.8, 0.7, 1],
  [-2.95, 1.2, -0.6, 0.6, 0.8, 0.7, 2],
  [-2.3, 0.25, 2.0, 0.45, 0.35, 0.4, 0],
];

function Arena({ W, D, doorX, rock, topaz }: { W: number; D: number; doorX: number; rock: string; topaz: string }) {
  const wheel = useRef<THREE.Group>(null);
  const gem = useRef<THREE.Group>(null);
  const lamps = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (wheel.current) wheel.current.rotation.z = -t * 0.8;
    if (gem.current) {
      gem.current.rotation.y = t * 0.9;
      gem.current.position.y = 3.72 + Math.sin(t * 1.8) * 0.06;
    }
    lamps.current.forEach((l, i) => l && (l.rotation.z = Math.sin(t * 1.6 + i * 1.7) * 0.12));
  });

  const tones = [rock, "#7a7065", "#a39a8c"];
  const faceZ = D / 2 - 0.55; // the rock face stands back so the apron stays inside the footprint
  const back = -D / 2;
  return (
    <group>
      {/* rock body and the boulders heaped on it */}
      <mesh geometry={GEO.box} material={mat(rock)} position={[0, 0.9, (faceZ + back) / 2]} scale={[W, 1.8, faceZ - back]} castShadow receiveShadow />
      {HILL.map(([x, y, z, sx, sy, sz, tone], i) => (
        <mesh key={i} geometry={GEO.rock} material={mat(tones[tone])} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[hash(i, 1) * 6, hash(i, 2) * 6, hash(i, 3) * 6]} castShadow receiveShadow />
      ))}
      {/* gravel apron */}
      <Bx p={[0, 0.03, faceZ + 0.27]} s={[W, 0.06, 0.6]} c="#9b8f7c" shadow={false} />

      {/* topaz veins breaking through the rock, and the big crystal on the peak */}
      <CrystalCluster p={[-1.3, 1.25, 1.9]} s={0.4} topaz={topaz} />
      <CrystalCluster p={[2.3, 2.15, 1.1]} s={0.5} topaz={topaz} />
      <CrystalCluster p={[-1.9, 2.95, 0.2]} s={0.55} topaz={topaz} />
      <group ref={gem} position={[-1.2, 3.72, -1.0]}>
        <Crystal p={[0, -0.45, 0]} s={0.75} c={topaz} tip />
        <Crystal p={[0, -0.45, 0]} s={0.75} r={[Math.PI, 0, 0]} c="#ffc34d" />
      </group>

      {/* timber mine portal (the door) */}
      <group position={[doorX, 0, faceZ]}>
        <Bx p={[0, 0.68, 0.01]} s={[1.0, 1.36, 0.04]} c="#15110d" shadow={false} />
        {[-1, 1].map((sd) => (
          <group key={sd}>
            <Bx p={[sd * 0.58, 0.78, 0.1]} s={[0.16, 1.56, 0.16]} c={WOOD} />
            <Bx p={[sd * 0.38, 1.33, 0.13]} r={[0, 0, sd * 0.785]} s={[0.09, 0.42, 0.09]} c={WOOD} />
          </group>
        ))}
        <Bx p={[0, 1.62, 0.1]} s={[1.55, 0.2, 0.24]} c={WOOD} />
        {/* sign: crossed pickaxes around a topaz */}
        <group position={[0, 1.9, 0.23]}>
          <Bx s={[0.95, 0.36, 0.06]} c="#9a6d3e" />
          <Bx p={[0, 0, 0.04]} r={[0, 0, Math.PI / 4]} s={[0.17, 0.17, 0.04]} c="#ffc34d" g />
          {[-1, 1].map((sd) => (
            <group key={sd} position={[sd * 0.3, 0, 0.04]} rotation={[0, 0, sd * 0.6]}>
              <Bx s={[0.035, 0.28, 0.02]} c="#5a3a1e" shadow={false} />
              <Bx p={[0, 0.12, 0]} s={[0.2, 0.045, 0.025]} c="#b8b8b8" shadow={false} />
            </group>
          ))}
        </group>
        {/* lanterns hanging from the lintel ends */}
        {[-1, 1].map((sd, i) => (
          <group key={sd} ref={(g) => void (lamps.current[i] = g)} position={[sd * 0.72, 1.52, 0.25]}>
            <Bx p={[0, -0.07, 0]} s={[0.02, 0.14, 0.02]} c={IRON} shadow={false} />
            <Bx p={[0, -0.23, 0]} s={[0.15, 0.2, 0.15]} c={IRON} shadow={false} />
            <Bx p={[0, -0.23, 0]} s={[0.11, 0.15, 0.17]} c="#ffcf6a" g />
          </group>
        ))}
        {/* rails running out of the tunnel */}
        {[-0.25, 0.25].map((x) => (
          <Bx key={x} p={[x, 0.09, 0.45]} s={[0.05, 0.04, 1.0]} c="#8a8a8a" shadow={false} />
        ))}
        {[0.12, 0.4, 0.68, 0.92].map((z) => (
          <Bx key={z} p={[0, 0.065, z]} s={[0.7, 0.03, 0.1]} c={WOOD} shadow={false} />
        ))}
      </group>

      {/* mine cart of topaz on a siding */}
      <group position={[doorX + 1.9, 0, faceZ + 0.3]}>
        {[-0.18, 0.18].map((z) => (
          <Bx key={z} p={[0, 0.08, z]} s={[1.3, 0.04, 0.05]} c="#8a8a8a" shadow={false} />
        ))}
        <MineCart />
      </group>

      {/* headframe: timber tower with a turning winding wheel */}
      <group position={[2.2, 1.9, -1.0]}>
        {[-1, 1].map((sd) => (
          <group key={sd}>
            <Bx p={[sd * 0.3, 0.85, 0.2]} r={[0, 0, sd * 0.18]} s={[0.1, 1.75, 0.1]} c={WOOD} />
            <Bx p={[sd * 0.3, 0.85, -0.2]} r={[0, 0, sd * 0.18]} s={[0.1, 1.75, 0.1]} c={WOOD} />
          </group>
        ))}
        <Bx p={[0, 0.55, 0.2]} s={[0.66, 0.08, 0.08]} c={WOOD} />
        <Bx p={[0, 1.15, 0.2]} s={[0.5, 0.08, 0.08]} c={WOOD} />
        <Bx p={[0, 1.7, 0]} s={[0.46, 0.1, 0.5]} c={WOOD} />
        <group ref={wheel} position={[0, 2.1, 0]}>
          <Tor s={[0.38, 0.38, 0.25]} c={IRON} />
          {[0, 1, 2].map((k) => (
            <Bx key={k} r={[0, 0, (k * Math.PI) / 3]} s={[0.72, 0.04, 0.04]} c={IRON} />
          ))}
          <Cy r={[Math.PI / 2, 0, 0]} s={[0.07, 0.12, 0.07]} c="#c9a24a" />
        </group>
      </group>
    </group>
  );
}

// The Gruta da Lapinha: a pale limestone hill with a dark opening, hanging stalactites and
// cerrado shrubs clinging to the rock.
function CaveMouth({ W, D, doorX, rock, dark }: { W: number; D: number; doorX: number; rock: string; dark: string }) {
  const faceZ = D / 2 - 0.45;
  const back = -D / 2;
  const tones = [rock, dark, "#c9bda4"];
  const boulders = useMemo(() => {
    const out: [number, number, number, number, number][] = [];
    for (let i = 0; i < 22; i++) {
      const x = (hash(i, 1, 4) - 0.5) * (W - 0.6);
      const z = back + 0.5 + hash(i, 2, 4) * (faceZ - back - 0.4);
      // Keep the rock around the opening low enough to read the arch.
      if (Math.abs(x - doorX) < 1.1 && z > faceZ - 0.9) continue;
      out.push([x, 1.2 + hash(i, 3, 4) * 1.1 - (z - back) * 0.2, z, 0.6 + hash(i, 5, 4) * 0.6, Math.floor(hash(i, 6, 4) * 3)]);
    }
    return out;
  }, [W, back, faceZ, doorX]);
  return (
    <group>
      <mesh geometry={GEO.box} material={mat(rock)} position={[0, 0.8, (faceZ + back) / 2]} scale={[W, 1.6, faceZ - back]} castShadow receiveShadow />
      {boulders.map(([x, y, z, k, t], i) => (
        <mesh key={i} geometry={GEO.rock} material={mat(tones[t])} position={[x, y, z]} scale={[k, k * 0.8, k]} rotation={[hash(i, 7) * 6, hash(i, 8) * 6, 0]} castShadow receiveShadow />
      ))}
      {/* the opening, framed by rocks, with stalactites hanging over it */}
      <group position={[doorX, 0, faceZ]}>
        <Bx p={[0, 0.65, 0.02]} s={[1.2, 1.3, 0.05]} c="#0d0b09" shadow={false} />
        <mesh geometry={GEO.sphere} material={mat("#0d0b09")} position={[0, 1.3, 0.02]} scale={[0.6, 0.35, 0.03]} />
        {[-1, 1].map((sd) => (
          <group key={sd}>
            <mesh geometry={GEO.rock} material={mat(tones[1])} position={[sd * 0.8, 0.55, 0.15]} scale={[0.45, 0.65, 0.35]} rotation={[0.2, sd, 0.1]} castShadow />
            <mesh geometry={GEO.rock} material={mat(rock)} position={[sd * 0.62, 1.35, 0.12]} scale={[0.4, 0.4, 0.3]} rotation={[0.5, sd * 2, 0.3]} castShadow />
          </group>
        ))}
        <mesh geometry={GEO.rock} material={mat(tones[2])} position={[0, 1.78, 0.1]} scale={[0.8, 0.35, 0.35]} castShadow />
        {[-0.35, -0.1, 0.18, 0.4].map((x, i) => (
          <Cn4 key={x} p={[x, 1.5 - (i % 2) * 0.08, 0.1]} s={[0.07, 0.28 + (i % 2) * 0.1, 0.07]} r={[Math.PI, 0, 0]} c="#d8ccb2" />
        ))}
        <Bx p={[0, 0.02, 0.3]} s={[1.2, 0.04, 0.5]} c="#9b8f7c" shadow={false} />
      </group>
      {/* shrubs on the hill */}
      {[[-2.8, 1.75, 0.6], [2.6, 1.9, 0.2], [-1.2, 2.3, -1.1], [3.2, 1.1, 1.3], [-3.3, 1.0, 1.4]].map(([x, y, z], i) => (
        <Sph key={i} p={[x, y, z]} s={[0.35, 0.28, 0.35]} c={i % 2 ? "#5a8a3a" : "#6a9a44"} />
      ))}
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
  for (let y = OW_Y0; y < OW_H; y++)
    for (let x = 0; x < OW_W; x++) if (owTile(x, y) === "O" && owTile(x - 1, y) !== "O" && owTile(x, y - 1) !== "O") spots.push([x + 0.5, y + 0.5]);
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
          <AmuletModel great={i.item === "superamuleto"} />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[OW_W / 2, -0.21, (OW_Y0 + OW_H) / 2]} receiveShadow>
        <planeGeometry args={[OW_W + 60, OW_H - OW_Y0 + 60]} />
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
