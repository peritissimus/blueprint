import test from 'node:test';
import assert from 'node:assert/strict';
import { HOUSES, HOUSE_IDS, houseOf } from '../src/model/houses.js';
import { validLayout, normalizeLayout, blankLayout } from '../src/model/layout.js';
import { matchOpening, deriveSpatial } from '../src/model/spatial.js';

const inPoly = (x, z, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};

test('layouts without a house are the BTM flat; unknown houses are rejected', () => {
  assert.equal(houseOf({}).id, 'btm');
  assert.equal(houseOf({ house: 'sunny' }).id, 'sunny');
  assert.equal(validLayout({ ...blankLayout(), house: 'sunny' }), true);
  assert.equal(validLayout({ ...blankLayout(), house: 'nowhere' }), false);
  assert.equal(normalizeLayout({ ...blankLayout(), house: 'sunny' }).house, 'sunny');
});

test('every house has a closed outline, location and walk start inside it', () => {
  for (const id of HOUSE_IDS) {
    const h = HOUSES[id];
    assert.ok(h.footprint.length >= 4, id);
    assert.ok(h.lat > 0 && h.lat < 40 && h.solarNoon > 11.5 && h.solarNoon < 13, id);
    assert.equal(Math.abs(h.east[0] * h.north[0] + h.east[1] * h.north[1]), 0, id + ' east and north are perpendicular');
    assert.ok(inPoly(h.walk[0], h.walk[1], h.footprint), id + ' walk start');
  }
});

test('Sunny Side template: valid document, every opening sits on a wall, furniture inside the flat', () => {
  const layout = HOUSES.sunny.template();
  assert.equal(validLayout(layout), true);
  assert.equal(layout.house, 'sunny');
  layout.openings.forEach((op, i) => assert.ok(matchOpening(layout.walls, op), `opening ${i} is not on a wall`));
  layout.items.forEach(it => assert.ok(inPoly(it.x, it.z, HOUSES.sunny.footprint), `${it.type} at ${it.x},${it.z}`));
  const main = layout.openings.filter(op => op.wood);
  assert.equal(main.length, 1, 'one main entrance');
  const { light } = deriveSpatial(layout);
  assert.ok(light.src.length >= 8, 'windows, sit-out door and railing let daylight in');
});

test('Sunny Side room sizes match the registration plan (clear sizes, ±0.4 ft)', () => {
  const near = (a, b) => Math.abs(a - b) <= 0.4;
  const clear = (c0, c1, t0 = 0.36, t1 = 0.36) => c1 - c0 - t0 / 2 - t1 / 2;
  // guest bedroom 12'7½" x 10'0", master 13'5½" x 11'3½", kitchen 10'8" x 7'10½"
  assert.ok(near(clear(0, 13.11, 0.6), 12.625));
  assert.ok(near(clear(0, 10.48, 0.6), 10.0));
  assert.ok(near(clear(0, 13.94, 0.6), 13.46));
  assert.ok(near(clear(21.17, 32.94, 0.36, 0.6), 11.29));
  assert.ok(near(clear(19.72, 30.83, 0.36, 0.6), 10.67));
  assert.ok(near(clear(21.17, 29.41), 7.875));
});

test('both starting arrangements are valid independent copies of their home', () => {
  for (const id of HOUSE_IDS) {
    const first = HOUSES[id].template();
    const original = structuredClone(first);
    assert.equal(validLayout(first), true);
    assert.equal(first.house, id);
    first.items[0].x += 50;
    first.openings.pop();
    assert.deepEqual(HOUSES[id].template(), original);
  }
});
