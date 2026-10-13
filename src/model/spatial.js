export function matchOpening(walls, opening) {
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i]; if (wall.kind === 'railing') continue;
    const dx = wall.b[0] - wall.a[0], dz = wall.b[1] - wall.a[1], length = Math.hypot(dx, dz);
    if (length < 0.01) continue;
    const ux = dx / length, uz = dz / length;
    const project = p => (p[0] - wall.a[0]) * ux + (p[1] - wall.a[1]) * uz;
    const distance = p => Math.abs(-(p[0] - wall.a[0]) * uz + (p[1] - wall.a[1]) * ux);
    const t0 = Math.min(project(opening.a), project(opening.b)), t1 = Math.max(project(opening.a), project(opening.b));
    if (distance(opening.a) < 0.3 && distance(opening.b) < 0.3 && t0 > -0.05 && t1 < length + 0.05) return { i, t0, t1 };
  }
  return null;
}

export function deriveSpatial(layout) {
  const perWall = layout.walls.map(() => []), light = { occ: [], src: [] }, segments = [];
  layout.openings.forEach((op, idx) => {
    const match = matchOpening(layout.walls, op);
    if (match) perWall[match.i].push({ op, idx, t0: match.t0, t1: match.t1 });
  });
  layout.walls.forEach((wall, i) => {
    const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
    if (length < 0.05) return;
    const at = t => [wall.a[0] + (wall.b[0] - wall.a[0]) * t / length, wall.a[1] + (wall.b[1] - wall.a[1]) * t / length];
    const thick = wall.t || (wall.kind === 'ext' ? 0.6 : 0.36);
    if (wall.kind === 'railing') { light.src.push([wall.a, wall.b]); segments.push([wall.a, wall.b, 0.2]); return; }
    let cursor = 0;
    const solid = (a, b) => { if (b - a > 0.01) { light.occ.push([at(a), at(b)]); segments.push([at(a), at(b), thick]); } };
    perWall[i].sort((a, b) => a.t0 - b.t0).forEach(({ op, t0, t1 }) => {
      solid(cursor, t0);
      if (op.type === 'window' || op.type === 'double') light.src.push([at(t0), at(t1)]);
      if (op.type === 'window') segments.push([at(t0), at(t1), thick]);
      cursor = Math.max(cursor, t1);
    });
    solid(cursor, length);
  });
  return { perWall, light, segments };
}

export function createSpatialCache() {
  let key, value;
  return layout => {
    const next = JSON.stringify([layout.walls.map(({ a, b, kind, t }) => ({ a, b, kind, t })), layout.openings]);
    if (next !== key) { value = deriveSpatial(layout); key = next; }
    return value;
  };
}
