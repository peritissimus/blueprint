# Blueprint Maker

A 2.5D floor-plan maker for the BTM 3BHK flat (east-facing entrance), built with Three.js and Vite.

- Furniture catalogue with drag, turn, resize and finishes
- Wall, door and window drawing tools, undo, keep/reset layout
- Daylight that follows the sun's real path over Bengaluru by time of day and season, with soft shadows and bounce light
- Watercolour, Illustrated and Technical looks
- 2.5D, Plan and Walk (eye-level) views; Browse mode for just looking around
- Works on phones and tablets

## Run it

```bash
npm install
npm run dev
```

Vite prints a local address and a network address; open the network one on your phone (same Wi-Fi) to try it on touch.

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # serves the built site
```

## Where things are

- `index.html` — page markup (top bar, settings panel, furniture drawer, stage)
- `src/style.css` — the monochrome interface
- `src/main.js` — everything else: the plan data, furniture models, lighting and daylight bake, the watercolour shader, tools and touch handling

Your layout is saved in the browser (localStorage), so it survives reloads.

Three.js is pinned to 0.147.0 on purpose: the soft-shadow shader patch and lighting setup are written against that version.
