# Blueprint Maker

A 2.5D floor-plan maker for the BTM 3BHK flat (east-facing entrance), built with Three.js and Vite.

- Furniture catalogue with drag, turn, resize and finishes
- Feng Shui overlay: illustrative qi trails through doorways and around furniture, entrance selector, pause and speed controls; respects reduced motion. This geometric circulation aid is not a physical energy simulation or traditional Feng Shui assessment.
- Named saved layouts: save copies, reopen, rename, update and delete from the Layouts button
- Wall, door and window drawing tools, undo, keep/reset layout
- Daylight that follows the sun's real path over Bengaluru by time of day and season, with soft shadows and bounce light
- Illustrated (default) and Technical looks
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
- `src/main.js` — plan data, furniture models, lighting and daylight bake, tools and touch handling
- `src/batch-furniture.js` — batches opaque furniture and outlines while keeping transparent parts separate
- `src/qi-flow.js` and `src/qi-overlay.js` — circulation routes and animated flow
- `src/saved-layouts.js` — named local layout copies

Your working layout and named saved layouts are saved in this browser (localStorage), so they survive reloads. Saved copies stay unchanged as you edit. Opening a copy can be undone. Clearing browser data removes these layouts; they do not sync between devices.

Three.js is pinned to 0.147.0 on purpose: the soft-shadow shader patch and lighting setup are written against that version.

## Performance checks

The renderer draws on changes or active motion, caches shadows until geometry or sunlight changes, and disposes replaced geometry. Furniture parts are batched per material without reducing detail. Qi routes are checked only after layout changes.

Run `npm test` for geometry/picking, circulation, and saved-layout regression checks. In development, open `/?perf=1` for five-second console samples of rendered frames, shadow passes, CPU time inside the render call, draw calls, and GPU resource counts. Idle samples should reach zero frames; running Qi on an unchanged plan should have zero shadow passes. CPU time excludes asynchronous GPU execution. Diagnostics are disabled in production.
