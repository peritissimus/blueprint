import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayoutStore } from '../src/saved-layouts.js';
const blank = () => ({ walls: [], openings: [], items: [], labels: [], baseFloor: false, nextId: 1, migrations: { study2: true, tvWall: true, foyer1: true } });
function setup() {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  return { data, storage, store: createLayoutStore(storage, 'layouts') };
}
test('named copies survive a new store, remain independent and preserve blank layouts', () => {
  const { store, storage } = setup(); const original = blank();
  store.save('Empty room', original); original.nextId = 10;
  const reopened = createLayoutStore(storage, 'layouts').list()[0];
  assert.deepEqual(reopened.layout, blank());
  store.save('Second option', { ...blank(), nextId: 2 });
  store.rename(reopened.id, 'Empty floor');
  assert.equal(store.list().find(e => e.id === reopened.id).name, 'Empty floor');
  store.save('Empty floor', { ...blank(), nextId: 3 }, reopened.id);
  assert.equal(store.list().find(e => e.id === reopened.id).layout.nextId, 3);
  store.remove(reopened.id); assert.equal(store.list().length, 1);
});
test('blank and duplicate names never overwrite an existing copy', () => {
  const { store } = setup(); store.save('Living', blank());
  assert.throws(() => store.save(' living ', blank()), /already used/);
  assert.throws(() => store.save('   ', blank()), /Enter a name/);
  assert.equal(store.list().length, 1);
});
test('corrupt or unsupported storage is preserved', () => {
  const { data, store } = setup();
  for (const raw of ['{broken', '{"version":2,"layouts":[]}', '{"version":1,"layouts":[{}]}']) {
    data.set('layouts', raw); assert.throws(() => store.save('New', blank()));
    assert.equal(data.get('layouts'), raw);
  }
});
test('failed writes leave the saved copy intact', () => {
  const { data, storage, store } = setup(); store.save('Original', blank());
  const previous = data.get('layouts');
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  assert.throws(() => store.save('Another', blank()), { name: 'QuotaExceededError' });
  assert.equal(data.get('layouts'), previous);
});
test('invalid snapshots are rejected before persistence', () => {
  const { store } = setup();
  assert.throws(() => store.save('Broken', { ...blank(), walls: [{ a: [NaN, 0], b: [1, 2] }] }));
  assert.deepEqual(store.list(), []);
});
