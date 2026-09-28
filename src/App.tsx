import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Scene } from "./three/Scene";
import { G, useGame } from "./game/store";
import { input, installKeyboard } from "./game/input";
import { unlockAudio } from "./game/audio";
import { controlsLocked, interact, rt } from "./world/runtime";
import { Dialog } from "./ui/Dialog";
import { Battle } from "./ui/Battle";
import { Evolution } from "./ui/Evolution";
import { AlmanaqueScreen, BagScreen, CardScreen, OptionsScreen, StartMenu, TeamScreen } from "./ui/Menu";
import { PCScreen, ShopScreen } from "./ui/Shop";
import { Fade, Hud, Title, TouchPad } from "./ui/Shell";

let installed = false;

export function App() {
  const screen = useGame((s) => s.screen);
  const touchOn = useGame((s) => s.touch);
  const lowGfx = useGame((s) => s.lowGfx);
  // Bumping this remounts the Canvas, which builds a fresh WebGL context after the GPU drops ours.
  const [glGen, setGlGen] = useState(0);

  useEffect(() => {
    if (installed) return;
    installed = true;
    installKeyboard();
    input.setWorldHandler((b) => {
      if (b === "a") interact();
      else if (b === "start" && !controlsLocked() && !rt.player.moving) G().set({ screen: "menu" });
    });
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }, []);

  // Full-screen menus cover the world, so stop re-rendering it (saves GPU on laptops).
  const paused = !!screen && screen !== "menu" && screen !== "shop";

  return (
    <div className={`app ${touchOn ? "has-touch" : ""}`}>
      <Canvas
        key={`${glGen}-${lowGfx}`}
        shadows={lowGfx ? false : { type: THREE.PCFShadowMap }}
        dpr={lowGfx ? 1 : [1, 1.5]}
        frameloop={paused ? "demand" : "always"}
        camera={{ fov: 40, near: 0.1, far: 220, position: [15, 8, 70] }}
        gl={{ antialias: !lowGfx, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            setTimeout(() => setGlGen((n) => n + 1), 500);
          }, { once: true });
        }}
      >
        <Scene />
      </Canvas>
      <Hud />
      <Battle />
      <Evolution />
      <StartMenu />
      <TeamScreen />
      <BagScreen />
      <AlmanaqueScreen />
      <CardScreen />
      <OptionsScreen />
      <ShopScreen />
      <PCScreen />
      <Title />
      <Dialog />
      <TouchPad />
      <Fade />
    </div>
  );
}
