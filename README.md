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
- `src/main.js` — application wiring, furniture models, scene rendering, lighting and editor controls
- `src/model/layout.js` — shared versioned layout validation and legacy normalization
- `src/model/spatial.js` — renderer-independent wall/opening geometry for lighting, walking and Qi
- `src/storage/layout-repository.js` — working-layout persistence and corrupt-data recovery
- `src/editor/replace-layout.js` — shared validate/persist/history/apply transaction for open, undo, reset and blank sheet
- `src/batch-furniture.js` — batches opaque furniture and outlines while keeping transparent parts separate
- `src/qi-flow.js` and `src/qi-overlay.js` — circulation routes and animated flow
- `src/saved-layouts.js` — named local layout copies

Your working layout and named saved layouts are saved in this browser (localStorage), so they survive reloads. Saved copies stay unchanged as you edit. Opening a copy can be undone. Clearing browser data removes these layouts; they do not sync between devices.

Three.js is pinned to 0.147.0 on purpose: the soft-shadow shader patch and lighting setup are written against that version.

## Performance checks

The renderer draws on changes or active motion, caches shadows until geometry or sunlight changes, and disposes replaced geometry. Furniture parts are batched per material without reducing detail. Qi routes are checked only after layout changes.

Run `npm test` for geometry/picking, circulation, and saved-layout regression checks. In development, open `/?perf=1` for five-second console samples of rendered frames, shadow passes, CPU time inside the render call, draw calls, and GPU resource counts. Idle samples should reach zero frames; running Qi on an unchanged plan should have zero shadow passes. CPU time excludes asynchronous GPU execution. Diagnostics are disabled in production.

## Layout architecture

The working layout and named copies use the same validation rules. Documents have `version: 1`; legacy documents gain structural defaults without replacing or adding furniture. Opening, undoing, resetting and clearing a layout all use the same replacement operation. Validation and persistence finish before changing the active document or undo history; the scene adapter then resets lighting caches and rebuilds the floor and objects. A failed write keeps the existing document and history. Ordinary edits remain in memory when autosave fails, with a visible error.

Unreadable autosave data is protected from automatic overwrites. An explicit replacement first copies it to the working storage key plus `-recovery`; if the backup or replacement cannot be written, the operation stops. Named copies are unchanged.

Spatial calculations depend on layout geometry, not mesh construction or camera reveal. Lighting, walking and Qi consume the cached model. Scene invalidation distinguishes shadows, furniture and topology; persistence does not request redraws. Furniture factories, input handlers and lighting rendering still live in `main.js` and can be extracted incrementally.
