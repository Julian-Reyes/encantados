import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadPrefs } from "./game/store";
import "./styles.css";

loadPrefs();

// No StrictMode: battle and script flows are long-lived async sequences started from
// effects, and double-invoking those effects in development would run them twice.
createRoot(document.getElementById("root")!).render(<App />);
