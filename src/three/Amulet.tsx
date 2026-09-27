import * as THREE from "three";
import { mat, glow } from "./prims";

const top = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
const bottom = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const band = new THREE.CylinderGeometry(1.02, 1.02, 0.14, 14);
const button = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12);

/** The catching charm: red top, white bottom, gold band. Radius 1; scale it down. */
export function AmuletModel({ glowing = false }: { glowing?: boolean }) {
  return (
    <group>
      <mesh geometry={top} material={glowing ? glow("#ff9a8a") : mat("#e0342c")} castShadow />
      <mesh geometry={bottom} material={glowing ? glow("#ffffff") : mat("#f7f3ea")} castShadow />
      <mesh geometry={band} material={mat("#d9a52a")} />
      <mesh geometry={button} material={mat("#fffaf0")} position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}
