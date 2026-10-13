import { HOUSE_IDS } from './houses.js';

export const LAYOUT_VERSION = 1;
const point = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const optionalNumber = (value, min, inclusive = false) => value == null || (Number.isFinite(value) && (inclusive ? value >= min : value > min));

export function validLayout(layout, catalog) {
  if (!layout || (layout.version != null && layout.version !== LAYOUT_VERSION) ||
      typeof layout.baseFloor !== 'boolean' || (layout.house != null && !HOUSE_IDS.includes(layout.house)) || !Number.isSafeInteger(layout.nextId) || layout.nextId < 1) return false;
  if (!Array.isArray(layout.walls) || !layout.walls.every(w => w && point(w.a) && point(w.b) &&
      (w.kind == null || ['ext', 'int', 'railing'].includes(w.kind)) && optionalNumber(w.t, 0) && optionalNumber(w.h, 0, true))) return false;
  if (!Array.isArray(layout.openings) || !layout.openings.every(o => o && point(o.a) && point(o.b) &&
      ['door', 'double', 'window'].includes(o.type) && (o.type === 'window' || point(o.swing)) && optionalNumber(o.sill, 0, true))) return false;
  if (!Array.isArray(layout.items) || !layout.items.every(i => i && typeof i.id === 'string' && i.id.length > 0 &&
      typeof i.type === 'string' && (!catalog || Object.hasOwn(catalog, i.type)) &&
      Number.isFinite(i.x) && Number.isFinite(i.z) && Number.isFinite(i.rot ?? 0) && optionalNumber(i.w, 0) && optionalNumber(i.d, 0))) return false;
  if (new Set(layout.items.map(i => i.id)).size !== layout.items.length) return false;
  if (layout.items.some(i => /^i\d+$/.test(i.id) && Number(i.id.slice(1)) >= layout.nextId)) return false;
  return Array.isArray(layout.labels) && layout.labels.every(l => l && typeof l.text === 'string' && point(l.p));
}

// Legacy documents gain structural defaults only. Never refurnish a user's rooms.
export function normalizeLayout(input, catalog) {
  const layout = structuredClone(input);
  if (!layout || typeof layout !== 'object') throw new Error('Invalid layout. Existing data was preserved.');
  if (layout.version == null) {
    layout.openings ??= []; layout.labels ??= [];
    layout.baseFloor ??= true;
    layout.nextId ??= Math.max(0, ...(layout.items || []).map(i => /^i\d+$/.test(i?.id) ? Number(i.id.slice(1)) : 0)) + 1;
  }
  if (!validLayout(layout, catalog)) throw new Error('Invalid or unsupported layout. Existing data was preserved.');
  layout.version = LAYOUT_VERSION;
  // Retain compatibility with older app builds without rerunning template updates.
  layout.migrations = { study2: true, tvWall: true, foyer1: true };
  return layout;
}

export const blankLayout = () => ({ version: LAYOUT_VERSION, walls: [], openings: [], items: [], labels: [], baseFloor: false, nextId: 1 });
