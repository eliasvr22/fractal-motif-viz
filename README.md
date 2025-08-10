# Fractal Motif Visualizer

Single‑file **React + WebGL** visualizer for audiovisual shows. It renders kaleidoscopic, IFS‑flavored abstract motifs that can be **audio‑reactive** via the browser microphone. Designed for quick setup and live tweaking.

---

## Features

* Domain‑warped FBM shader with **kaleidoscopic folds** and lightweight **IFS** transformations.
* Motifs: **Circle**, **Polygon**, **Cross**, **Capsule**.
* Arrangements: **Phyllotaxis Spiral**, **Concentric Rings**, **Grid**, **Lissajous chain**.
* 6 curated presets + randomizer.
* Optional **audio reactivity** (mic).
* Tailwind‑styled control panel; **Save PNG**.

---

## Project layout

```
src/
  LiveFractalMotifApp.tsx  # this component (single file)
  main.tsx                 # renders the app
  index.css                # Tailwind entry
vite.config.ts             # Vite config (React + Tailwind plugin)
```

---

## Prerequisites

* Node.js 18+ (or 20+).
* A modern Chromium‑based browser (Chrome/Edge). Firefox works, but Web Audio timing may differ.

---

## Install & run

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`).

### Build & preview

```bash
npm run build
npm run preview
```

`dist/` contains static assets suitable for any static host.

---

## Using the component

Render **LiveFractalMotifApp** from `main.tsx`:

```tsx
import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import LiveFractalMotifApp from "./LiveFractalMotifApp"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <LiveFractalMotifApp />
)
```

---

## Controls

**Shortcuts:** `Space` pause/resume · `R` randomize · `1–6` presets

**Selectors:** Motif · Arrangement · Palette

**Sliders:**

| Name         | Range      | Notes                    |
| ------------ | ---------- | ------------------------ |
| Instances    | 20–140     | Number of motif copies   |
| Folds        | 3–18       | Kaleidoscope segments    |
| Iterations   | 1–6        | IFS box‑fold iterations  |
| Size         | 0.02–0.10  | Motif radius/half‑length |
| Thickness    | 0.005–0.05 | Cross/capsule stroke     |
| Scale        | 0.6–1.6    | Scene scale              |
| Warp         | 0.0–2.0    | Domain‑warp strength     |
| Noise Scale  | 1.0–7.0    | FBM frequency            |
| Noise Amount | 0.0–0.8    | FBM amplitude            |
| Speed        | 0.3–1.8    | Global animation speed   |
| Reactive Amt | 0.0–1.0    | Audio modulation depth   |
| Pixelate     | 0.0–0.2    | Retro block quantization |

**Save PNG** exports the current frame.

---

## Audio‑reactive mode

1. Toggle **Use Microphone**.
2. Allow the browser’s mic permission. (HTTPS or **localhost** is required by most browsers.)
3. Music drives:

   * **Speed** via overall level
   * **Size** via low frequencies
   * **Warp** via mid frequencies
   * **Contrast** via highs (in‑shader power curve)
4. Use **Reactive Amt** to scale sensitivity.

**Tips**

* If the mic seems flat, reduce OS input gain or disable OS noise suppression.
* For line‑in/virtual routing on Windows, tools like *VB‑Audio* or *loopMIDI+DAW to mic* can help.

---

## Second‑screen (projector) quick start

* Open two browser windows to the dev URL. Drag one to the projector and press **F11** for fullscreen.
* Keep the control window on your laptop.

*For capture pipelines (OBS/NDI), point an OBS Browser Source at the local URL and full‑screen that scene.*

---

## Performance

* Prefer Chromium for highest WebGL throughput.
* Projector FPS: cap your GPU load by lowering **Instances**, **Folds**, or **Noise Amount**.
* `preserveDrawingBuffer` is **on** to allow PNG export. For more FPS, set it to `false` (you’ll lose PNG save).
* Avoid heavy background tabs; keep only the controller and stage windows.

---

## Known quirks

* **CRLF warnings on Windows** from Git are harmless. Add a `.gitattributes` with `* text=auto eol=lf` if you prefer LF in repo history.
* **Mic permissions** won’t appear inside iframes or non‑secure origins (except `localhost`).
* Running from **OneDrive** folders can cause file‑sync delays. Exclude the project or pause sync during shows if you notice lag.

---

## Roadmap / variants

* **Viewer mode** (separate UI‑less window) with BroadcastChannel sync.
* **MIDI mapping** via Web MIDI + MIDI Learn.
* **OSC** bridge (Node/WebSocket) for DAW control.
* **Scene cues** (preset timelines) and GIF/WebM capture.

---

## License

MIT — see `LICENSE` (add one if missing).

---

## Credits

* Noise/FBM and palette techniques are inspired by common shader patterns from the demoscene and Inigo Quilez (iq) style functions.
