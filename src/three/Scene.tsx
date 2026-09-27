// Everything inside the <Canvas>: one light rig and camera shared by all modes, plus the
// overworld / interior / battle / evolution / intro stages.

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { G, useGame, type MapId } from "../game/store";
import { rt, tick, npcDefsFor } from "../world/runtime";
import { Overworld } from "./Overworld";
import { InteriorView } from "./Interior";
import { ActorView, Humanoid } from "./Characters";
import { BattleScene, BATTLE_ORIGIN } from "./BattleScene";
import { CreatureModel } from "./Creatures";
import { MaterialOverride, Sph, glow } from "./prims";
import { currentEvo } from "../game/flow";
import { evoVis } from "./evoVis";

const EVO_ORIGIN = new THREE.Vector3(-500, 0, 500);
const INTRO_ORIGIN = new THREE.Vector3(0, 0, -500);

function Actors({ map }: { map: MapId }) {
  const defs = npcDefsFor(map);
  return (
    <>
      <ActorView id="player" look="player" />
      {defs.map((d) => (
        <ActorView key={d.id} id={d.id} look={d.look} />
      ))}
    </>
  );
}

function playerRenderPos(out: THREE.Vector3) {
  const a = rt.player;
  return out.set(a.fromX + (a.x - a.fromX) * a.t, 0, a.fromY + (a.y - a.fromY) * a.t);
}

function Rig() {
  const { camera, scene } = useThree();
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const fog = useMemo(() => new THREE.Fog("#a8dcf7", 20, 44), []);
  const bg = useMemo(() => new THREE.Color("#a8dcf7"), []);
  scene.fog = fog;
  scene.background = bg;

  useFrame(({ clock, size }) => {
    const s = G();
    if (s.mode === "battle") {
      // Fit both platforms horizontally, including on portrait screens.
      const distance = Math.max(8.5, 6.8 / (size.width / size.height));
      camera.position.set(BATTLE_ORIGIN.x, 3, BATTLE_ORIGIN.z + distance);
      camera.lookAt(BATTLE_ORIGIN.x, -0.2, BATTLE_ORIGIN.z - 0.3);
      target.copy(BATTLE_ORIGIN);
      bg.set("#bfe8ff");
      fog.near = 30;
      fog.far = 70;
      fog.color.set("#bfe8ff");
    } else if (s.mode === "evolve") {
      camera.position.set(EVO_ORIGIN.x, 1.0, EVO_ORIGIN.z + 3.4);
      camera.lookAt(EVO_ORIGIN.x, 0.6, EVO_ORIGIN.z);
      target.copy(EVO_ORIGIN);
      bg.set("#1a1030");
      fog.near = 500;
      fog.far = 1000;
    } else if (s.mode === "intro") {
      camera.position.set(INTRO_ORIGIN.x, 1.1, INTRO_ORIGIN.z + 3.4);
      camera.lookAt(INTRO_ORIGIN.x, 0.65, INTRO_ORIGIN.z);
      target.copy(INTRO_ORIGIN);
      bg.set("#243452");
      fog.near = 500;
      fog.far = 1000;
    } else if (s.mode === "title") {
      const t = clock.elapsedTime;
      camera.position.set(15.5 + Math.sin(t * 0.12) * 7, 7.5, 71 + Math.cos(t * 0.12) * 2);
      camera.lookAt(15.5, 0, 62);
      target.set(15.5, 0, 62);
      bg.set("#a8dcf7");
      fog.color.set("#a8dcf7");
      fog.near = 20;
      fog.far = 44;
    } else {
      const indoor = rt.map !== "overworld";
      // The player's own tile-to-tile easing already smooths the motion, so the camera locks on.
      playerRenderPos(target);
      if (indoor) camera.position.set(target.x, 6.6, target.z + 5.6);
      else camera.position.set(target.x, 8.0, target.z + 7.0);
      camera.lookAt(target.x, 0.3, target.z - 0.4);
      if (indoor) {
        bg.set("#141418");
        fog.near = 500;
        fog.far = 1000;
      } else {
        bg.set("#a8dcf7");
        fog.color.set("#a8dcf7");
        fog.near = 20;
        fog.far = 44;
      }
    }
    const l = light.current;
    if (l) {
      l.position.set(target.x + 5, 12, target.z + 6);
      l.target.position.copy(target);
      l.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <hemisphereLight args={["#dff2ff", "#6a8a4a", 1.25]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={light}
        intensity={1.9}
        color="#fff4dd"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0008}
        shadow-normalBias={0.02}
      />
    </>
  );
}

function WorldController() {
  useFrame((_, dt) => {
    if (G().mode === "world") tick(Math.min(dt, 0.05));
  });
  return null;
}

// ---------------------------------------------------------------- evolution
function EvolutionStage() {
  useGame((s) => s.rev); // the overlay bumps rev when the animation phase changes
  const evo = currentEvo();
  const fromRef = useRef<THREE.Group>(null);
  const toRef = useRef<THREE.Group>(null);
  const sparkles = useRef<THREE.Group>(null);
  const white = useMemo(() => glow("#ffffff"), []);
  useFrame(({ clock }) => {
    const t = (performance.now() / 1000) - evoVis.t0;
    let showTo = false;
    if (evoVis.state === "anim") {
      // Alternate between the two forms, faster and faster.
      showTo = Math.floor(Math.pow(Math.max(0, t), 2.1) * 1.3) % 2 === 1;
    } else if (evoVis.state === "done") showTo = true;
    if (fromRef.current) fromRef.current.visible = !showTo;
    if (toRef.current) toRef.current.visible = showTo;
    if (sparkles.current) {
      sparkles.current.rotation.y = clock.elapsedTime * 0.8;
      sparkles.current.children.forEach((c, i) => {
        c.position.y = ((clock.elapsedTime * 0.6 + i * 0.13) % 1.6) - 0.1;
      });
      sparkles.current.visible = evoVis.state !== "intro";
    }
  });
  if (!evo) return null;
  const sil = evoVis.state === "anim";
  return (
    <group position={EVO_ORIGIN}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[1.6, 32]} />
        <meshBasicMaterial color="#3a2a60" />
      </mesh>
      <group ref={fromRef}>
        <MaterialOverride material={sil ? white : null}>
          <CreatureModel species={evo.from} />
        </MaterialOverride>
      </group>
      <group ref={toRef} visible={false}>
        <MaterialOverride material={sil ? white : null}>
          <CreatureModel species={evo.to} />
        </MaterialOverride>
      </group>
      <group ref={sparkles}>
        {Array.from({ length: 12 }, (_, i) => (
          <Sph key={i} p={[Math.cos(i * 0.52) * 0.9, 0, Math.sin(i * 0.52) * 0.9]} s={0.035} c={i % 2 ? "#fff6a0" : "#a0e8ff"} g />
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- intro
function IntroStage() {
  const show = useGame((s) => s.introShow);
  return (
    <group position={INTRO_ORIGIN}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#3a5080" />
      </mesh>
      <group scale={1.15} rotation={[0, show === "prof" ? 0.2 : 0, 0]} position={[show === "prof" ? -0.25 : 0, 0, 0]}>
        <Humanoid key={show} look={show} />
      </group>
      {show === "prof" && (
        <group position={[0.55, 0, 0.2]} rotation={[0, -0.4, 0]}>
          <CreatureModel species="pardalito" />
        </group>
      )}
    </group>
  );
}

export function Scene() {
  const mode = useGame((s) => s.mode);
  const map = useGame((s) => s.pos.map);
  const worldVisible = mode === "world" || mode === "title";
  return (
    <>
      <Rig />
      <WorldController />
      <group visible={worldVisible}>
        {map === "overworld" ? <Overworld /> : <InteriorView map={map} />}
        <Actors key={map} map={map} />
      </group>
      {mode === "battle" && <BattleScene />}
      {mode === "evolve" && <EvolutionStage />}
      {mode === "intro" && <IntroStage />}
    </>
  );
}
