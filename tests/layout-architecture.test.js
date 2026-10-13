import test from 'node:test';
import assert from 'node:assert/strict';
import { blankLayout, normalizeLayout, validLayout } from '../src/model/layout.js';
import { createLayoutRepository } from '../src/storage/layout-repository.js';
import { createLayoutReplacer } from '../src/editor/replace-layout.js';
import { deriveSpatial, createSpatialCache } from '../src/model/spatial.js';

const catalog = { chair: {} };
const furnished = () => ({ ...blankLayout(), items: [{ id: 'i1', type: 'chair', x: 2, z: 3 }], nextId: 2 });
function setup() {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const repository = createLayoutRepository(storage, 'working', catalog), history = [], applied = [];
  let state = normalizeLayout(furnished(), catalog);
  const replace = createLayoutReplacer({ catalog, repository, getState: () => state, history, apply(next) { state = next; applied.push(next); } });
  return { data, storage, repository, history, applied, replace, get state() { return state; } };
}

test('legacy normalization preserves furniture and blank layouts without modifying the input', () => {
  const old = furnished(); delete old.version;
  old.migrations = {}; const before = structuredClone(old);
  const normalized = normalizeLayout(old, catalog);
  assert.deepEqual(old, before); assert.deepEqual(normalized.items, old.items);
  assert.equal(normalized.version, 1); assert.equal(normalized.baseFloor, false);
  assert.deepEqual(normalizeLayout({ walls: [], items: [] }, catalog).items, []);
});

test('schema rejects unsupported versions, unknown types, duplicate IDs, invalid dimensions and ID collisions', () => {
  const original = furnished();
  for (const bad of [
    { ...original, version: 2 }, { ...original, nextId: 1 },
    { ...original, items: [...original.items, ...original.items] },
    ...[{ type: 'missing' }, { w: -1 }, { d: Infinity }, { x: NaN }].map(patch => ({ ...original, items: [{ ...original.items[0], ...patch }] }))
  ]) assert.equal(validLayout(bad, catalog), false);
});

test('open and blank replacements share application and undo restores the previous layout', () => {
  const app = setup(), original = structuredClone(app.state);
  app.replace(blankLayout()); assert.equal(app.state.items.length, 0); assert.equal(app.applied.length, 1);
  app.replace(JSON.parse(app.history.at(-1)), { undo: true });
  assert.deepEqual(app.state, original); assert.equal(app.history.length, 0);
  const other = furnished(); other.items[0].x = 12;
  app.replace(other); other.items[0].x = 99;
  assert.equal(app.state.items[0].x, 12);
  app.replace(JSON.parse(app.history.at(-1)), { undo: true });
  assert.deepEqual(app.state, original); assert.deepEqual(app.repository.read(), original);
  assert.equal(app.applied.length, 4);
});

test('failed persistence leaves state, history and application callback untouched, including undo', () => {
  const app = setup(); app.replace(blankLayout());
  const before = structuredClone(app.state), history = [...app.history], raw = app.data.get('working');
  app.storage.setItem = () => { throw new Error('Storage full'); };
  assert.throws(() => app.replace(furnished()), /Storage full/);
  assert.throws(() => app.replace(JSON.parse(app.history.at(-1)), { undo: true }), /Storage full/);
  assert.deepEqual(app.state, before); assert.deepEqual(app.history, history);
  assert.equal(app.applied.length, 1); assert.equal(app.data.get('working'), raw);
});

test('unreadable autosave is preserved until explicit recovery backs up the original', () => {
  const app = setup(); app.data.set('working', '{broken');
  assert.throws(() => app.repository.read());
  assert.throws(() => app.repository.write(furnished()), /could not be read/);
  assert.equal(app.data.get('working'), '{broken');
  app.replace(blankLayout());
  assert.equal(app.data.get('working-recovery'), '{broken');
  assert.equal(app.repository.read().items.length, 0);
});

test('spatial model distinguishes solid walls, doorways, windows and railings without a renderer', () => {
  const model = { ...blankLayout(), walls: [{ a: [0, 0], b: [10, 0], kind: 'ext' }], openings: [
    { a: [2, 0], b: [4, 0], type: 'door', swing: [0, 1] },
    { a: [6, 0], b: [8, 0], type: 'window' }
  ] };
  const spatial = deriveSpatial(model);
  assert.deepEqual(spatial.light.occ, [[[0, 0], [2, 0]], [[4, 0], [6, 0]], [[8, 0], [10, 0]]]);
  assert.deepEqual(spatial.light.src, [[[6, 0], [8, 0]]]);
  assert.ok(spatial.segments.some(([a, b]) => a[0] === 6 && b[0] === 8));
  assert.ok(!spatial.segments.some(([a, b]) => a[0] === 2 && b[0] === 4));
  model.walls[0].kind = 'railing';
  assert.deepEqual(deriveSpatial(model).segments, [[[0, 0], [10, 0], 0.2]]);
});

test('spatial cache survives visual changes and invalidates for topology changes', () => {
  const derive = createSpatialCache(), layout = { ...blankLayout(), walls: [{ a: [0, 0], b: [10, 0], kind: 'int' }] };
  const initial = derive(layout);
  layout.walls[0].paint = 'sage'; layout.walls[0].h = 2;
  assert.equal(derive(layout), initial);
  layout.walls[0].b = [12, 0]; assert.notEqual(derive(layout), initial);
  assert.deepEqual(derive(blankLayout()).segments, []);
});
