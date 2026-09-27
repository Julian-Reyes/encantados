// Evolution overlay: "What? X is evolving!", the flashing silhouette, B to cancel.

import { useEffect, useRef } from "react";
import { useGame, touch, tr } from "../game/store";
import { currentEvo } from "../game/flow";
import { evoVis } from "../three/evoVis";
import { say } from "../game/dialog";
import { displayName } from "../game/mon";
import { music, sfx } from "../game/audio";
import { useKeys } from "./useKeys";

const ANIM_S = 5.2;

export function Evolution() {
  const mode = useGame((s) => s.mode);
  if (mode !== "evolve") return null;
  return <EvolutionInner />;
}

function EvolutionInner() {
  const started = useRef(false);
  const cancelled = useRef(false);
  const animating = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const evo = currentEvo();
    if (!evo) return;
    evoVis.state = "intro";
    evoVis.t0 = performance.now() / 1000;
    touch();
    music(null);
    void (async () => {
      await say(tr({ en: "What? {n} is evolving!", pt: "O quê? {n} está evoluindo!" }, { n: displayName(evo.mon) }));
      evoVis.state = "anim";
      evoVis.t0 = performance.now() / 1000;
      animating.current = true;
      touch();
      // Tick sound speeds up with the flashing.
      const t0 = performance.now();
      let last = -1;
      await new Promise<void>((resolve) => {
        const step = () => {
          const t = (performance.now() - t0) / 1000;
          const phase = Math.floor(Math.pow(t, 2.1) * 1.3);
          if (phase !== last) {
            last = phase;
            sfx("evolveTick");
          }
          if (cancelled.current || t >= ANIM_S) return resolve();
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      animating.current = false;
      evoVis.state = cancelled.current ? "cancel" : "done";
      touch();
      evo.resolve(cancelled.current);
    })();
  }, []);

  useKeys(
    (b) => {
      if (b === "b" && animating.current) cancelled.current = true;
    },
    true,
  );

  return (
    <div className="evo-ui">
      <div className="evo-hint">{tr({ en: "Press B to stop the evolution", pt: "Aperte B para parar a evolução" })}</div>
    </div>
  );
}
