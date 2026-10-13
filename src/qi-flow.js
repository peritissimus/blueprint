// A bounded, geometric circulation model for an illustrative qi overlay.
// It does not model physical energy or assign traditional Feng Shui scores.
export function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
function intersects(a, b, c, d) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
}
export function computeQiFlow({ bounds, contains, walls, furniture, entrance }) {
  const empty = { paths: [], tight: [], unreachable: [], reached: 0, total: 0, entrance: null, reason: 'Add walls and a door to explore the flow.' };
  if (!bounds || !entrance) return empty;
  const [x0, z0, x1, z1] = bounds;
  if (![x0,z0,x1,z1].every(Number.isFinite) || x1 <= x0 || z1 <= z0) return empty;
  const step = Math.max(0.5, (x1-x0)/200, (z1-z0)/200, Math.sqrt((x1 - x0) * (z1 - z0) / 10000));
  const width = Math.ceil((x1 - x0) / step), height = Math.ceil((z1 - z0) / step), count = width * height;
  const point = i => [x0 + (i % width + 0.5) * step, z0 + (Math.floor(i / width) + 0.5) * step];
  const insideFurniture = (x, z, item, margin = 0.15) => {
    const dx = x - item.x, dz = z - item.z, c = Math.cos(item.rot), s = Math.sin(item.rot);
    return Math.abs(c * dx - s * dz) < item.w / 2 + margin && Math.abs(s * dx + c * dz) < item.d / 2 + margin;
  };
  const freeAt = (x, z) => contains(x, z) && !walls.some(([a,b,t]) => segmentDistance(x,z,a,b) < t / 2 + 0.12) && !furniture.some(item => insideFurniture(x,z,item));
  const edgeClear = (a,b) => !walls.some(([c,d]) => intersects(a,b,c,d)) &&
    [0.25,0.5,0.75].every(t => freeAt(a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t));
  const free = new Uint8Array(count), parent = new Int32Array(count).fill(-1), distance = new Int32Array(count).fill(-1);
  let start = -1, best = 1.8, total = 0;
  for (let i = 0; i < count; i++) {
    const [x,z] = point(i); if (x >= x1 || z >= z1 || !freeAt(x,z)) continue;
    free[i] = 1; total++;
    const d = Math.hypot(x-entrance[0],z-entrance[1]);
    if (d < best && edgeClear(entrance, [x,z])) { best = d; start = i; }
  }
  if (start < 0) return { ...empty, total, reason: 'The selected doorway is blocked or outside the floor. Clear its approach or choose another door.' };
  const queue = new Int32Array(count); let head = 0, tail = 1; queue[0] = start; distance[start] = 0;
  while (head < tail) {
    const i = queue[head++], x = i % width, z = Math.floor(i / width);
    for (const n of [x > 0 ? i-1 : -1, x+1 < width ? i+1 : -1, z > 0 ? i-width : -1, z+1 < height ? i+width : -1]) {
      if (n < 0 || !free[n] || distance[n] >= 0 || !edgeClear(point(i), point(n))) continue;
      parent[n] = i; distance[n] = distance[i] + 1; queue[tail++] = n;
    }
  }
  const destinations = Array.from(queue.slice(0,tail)).sort((a,b) => distance[b]-distance[a]);
  const chosen = [], paths = [];
  for (const i of destinations) {
    const p = point(i);
    if (distance[i] < 4 || chosen.some(q => Math.hypot(p[0]-q[0],p[1]-q[1]) < 5)) continue;
    chosen.push(p);
    const path = []; for (let at = i; at !== -1; at = parent[at]) path.push(point(at));
    path.push(entrance); path.reverse();
    // Remove only collinear points; smoothing corners could cut through obstacles.
    const clean = path.filter((p,j) => j === 0 || j === path.length-1 ||
      Math.abs((p[0]-path[j-1][0])*(path[j+1][1]-p[1])-(p[1]-path[j-1][1])*(path[j+1][0]-p[0])) > 1e-6);
    paths.push(clean); if (paths.length === 24) break;
  }
  const tight = [], unreachable = [];
  for (let i = 0; i < count; i++) {
    if (!free[i]) continue;
    const [x,z] = point(i);
    if (distance[i] < 0) { if (i % 4 === 0) unreachable.push([x,z]); continue; }
    const near = walls.some(([a,b,t]) => segmentDistance(x,z,a,b) < t / 2 + 0.7) || furniture.some(item => insideFurniture(x,z,item,0.7));
    if (near && !tight.some(p => Math.hypot(x-p[0],z-p[1]) < 2)) tight.push([x,z]);
  }
  return { paths, tight: tight.slice(0,120), unreachable, reached: tail, total, entrance, reason: paths.length ? '' : 'Little open space is reachable from this entrance.' };
}
