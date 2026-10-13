import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';

/* Blueprint Maker — 2.5D floor-plan editor for the BTM 3BHK flat. Three.js r147, daylight bake, illustrated and technical looks. */
(function () {
'use strict';

/* ---------- Units: everything is in feet. Plan pixels from the drawn sheet convert at 26 px = 1 ft. ---------- */
const P = (x, y) => [ +((x - 70) / 26).toFixed(3), +((y - 70) / 26).toFixed(3) ];
const STORE_KEY = 'btm-3bhk-blueprint-maker-v1';
const DOOR_HEAD = 7;

/* ---------- Finishes ---------- */
const FINISHES = {
  oak:      { name: 'Oak',       hex: 0xc49a6c },
  walnut:   { name: 'Walnut',    hex: 0x6e4b34 },
  wenge:    { name: 'Wenge',     hex: 0x3b2a20 },
  white:    { name: 'White',     hex: 0xf4f2ed },
  charcoal: { name: 'Charcoal',  hex: 0x3b3a38 },
  linen:    { name: 'Linen',     hex: 0xd8cfbf },
  sage:     { name: 'Sage',      hex: 0x98a68f },
  clay:     { name: 'Clay',      hex: 0xc58b6d }
};
const FIN_CSS = { oak: '#c49a6c', walnut: '#6e4b34', wenge: '#3b2a20', white: '#f4f2ed', charcoal: '#3b3a38', linen: '#d8cfbf', sage: '#98a68f', clay: '#c58b6d' };

/* ---------- The flat as drawn (sheet A-01) ---------- */
function sampleState() {
  const W = (x1, y1, x2, y2, kind) => ({ a: P(x1, y1), b: P(x2, y2), kind: kind || 'int' });
  const walls = [
    W(356,161,590,161,'ext'), W(590,161,590,70,'ext'), W(590,70,980,70,'ext'), W(980,70,980,395,'ext'),
    W(980,395,980,707,'railing'),
    W(980,707,980,1084,'ext'), W(980,1084,70,1084,'ext'), W(70,1084,70,408,'ext'), W(70,408,356,408,'ext'), W(356,408,356,161,'ext'),
    W(590,161,590,395), W(590,395,980,395), W(902,707,980,707), W(902,395,902,707), W(356,408,356,1084),
    W(356,707,655,707), W(655,707,655,1084), W(785,707,785,1019), W(655,785,785,785), W(655,1019,980,1019),
    W(200,928,356,928), W(200,928,200,1084), W(356,629,447,629), W(447,629,447,707), W(742,707,785,707)
  ];
  const D = (x1, y1, x2, y2, hinge, sx, sy, extra) => Object.assign({ type: 'door', a: P(x1, y1), b: P(x2, y2), hinge, swing: [sx, sy] }, extra || {});
  const Wn = (x1, y1, x2, y2, sill) => ({ type: 'window', a: P(x1, y1), b: P(x2, y2), sill: sill == null ? 3 : sill });
  const openings = [
    D(501.6,161,579.6,161, 1, 0, 1, { wood: true }),
    D(596,395,674,395, 0, 0, -1),
    D(356,421,356,499, 1, -1, 0),
    D(371.6,629,434,629, 0, 0, 1),
    D(564,707,642,707, 1, 0, 1),
    D(681,785,746,785, 0, 0, 1),
    D(863,1019,928,1019, 0, 0, 1),
    D(200,933,200,998, 0, 1, 0),
    { type: 'double', a: P(902,512), b: P(902,590), hinge: 0, swing: [1, 0] },
    Wn(369,161,460,161), Wn(642,70,824,70), Wn(564,1084,642,1084), Wn(138,1084,194,1084), Wn(694,1084,954,1084),
    Wn(980,239,980,330), Wn(980,733,980,824), Wn(70,447,70,538), Wn(902,447,902,512,1), Wn(902,590,902,655,1)
  ];
  const R = Math.PI, H = Math.PI / 2;
  let n = 0;
  const I = (type, x, z, rot, finish, extra) => Object.assign({ id: 'i' + (++n), type, x, z, rot: rot || 0, finish: finish || CATALOG[type].fin }, extra || {});
  const items = [
    // Bedroom 1
    I('queenBed', 7.63, 24.23, -H, 'oak'), I('bedside', 10.37, 21.0, -H, 'oak'), I('bedside', 10.37, 27.45, -H, 'oak'),
    I('wardrobe', 1.28, 35.96, H, 'walnut', { w: 5.75 }),
    // Study (was Bedroom 2)
    I('wardrobe', 29.15, 11.45, R, 'walnut', { w: 11.4 }),
    ...studyItems(I),
    // Bedroom 3
    I('queenBed', 16.55, 30.6, H, 'oak'), I('bedside', 13.85, 27.4, H, 'oak'), I('bedside', 13.85, 33.8, H, 'oak'),
    I('wardrobe', 14.97, 37.92, R, 'walnut', { w: 7.75 }),
    // Foyer, living, puja
    I('shoeRack', 11.75, 5.9, H, 'white'), ...foyerItems(I),
    I('rug', 18.05, 18.3, 0, 'clay', { w: 9.5, d: 5.6 }),
    I('lSofa', 18.0, 17.3, 0, 'linen'), I('coffeeTable', 16.6, 19.6, 0, 'oak'),
    I('tvUnit', 16.9, 23.67, R, 'wenge'), I('wallTV', 16.9, 24.07, R), I('pujaUnit', 13.2, 23.75, R, 'walnut'),
    // Dining: round table for four, fridge by the kitchen opening
    I('roundDining', 27.0, 18.1, 0, 'walnut'), I('fridge', 30.7, 23.3, R, 'white'),
    // Kitchen
    I('counter', 33.92, 30.5, -H, 'charcoal', { w: 11.7 }), I('kitchenSink', 33.92, 27.2, -H), I('hob', 33.92, 32.35, -H),
    I('wallCabinet', 28.17, 28.27, H, 'white', { w: 7.2 }), I('tallUnit', 28.62, 35.3, H, 'charcoal'),
    // Utility and baths
    I('utilitySink', 33.85, 37.7, -H, 'white'), I('washer', 23.9, 37.7, R),
    I('wc', 24.1, 35.23, R), I('shower', 26.7, 35.2, 0, 'white', { w: 2.3, d: 2.3 }), I('basin', 26.73, 26.0, -H, 'white'),
    I('wc', 6.2, 37.67, R), I('basin', 10.5, 36.6, -H, 'white'), I('shower', 9.3, 34.2, 0, 'white', { w: 3.2, d: 2.1 }),
    // Balcony
    I('plant', 32.95, 13.6, 0, 'white'), I('plant', 33.3, 23.4, 0, 'clay')
  ];
  const labels = [
    ['BEDROOM 1', 215, 600], ['STUDY', 870, 225], ['BEDROOM 3', 545, 950], ['FOYER', 473, 320], ['LIVING / DINING', 650, 440],
    ['KITCHEN', 865, 810], ['UTILITY', 795, 1058], ['BALCONY', 941, 556, true], ['COMMON BATH', 720, 940, false, true],
    ['ATTACHED BATH', 290, 1036, false, true], ['PUJA', 412, 695, false, true]
  ].map(([t, x, y, rot, small]) => ({ text: t, p: P(x, y), rot: !!rot, small: !!small }));
  return { walls, openings, items, labels, baseFloor: true, nextId: n + 1, migrations: { study2: true, tvWall: true, foyer1: true } };
}
/* Bedroom 2 as a study (your layout): an L-shaped desk in the north-east corner with one chair,
   a bookshelf and two armchairs on the door side around a round table on a sage rug, a plant and a floor lamp. */
function studyItems(I) {
  const R = Math.PI, H = Math.PI / 2;
  return [
    I('desk', 30.9, 1.13, 0, 'oak'), I('desk', 33.8, 5.0, -H, 'oak', { w: 6 }), I('deskChair', 31.2, 3.6, R, 'charcoal'),
    I('bookshelf', 20.75, 1.9, H, 'oak'),
    I('rug', 26.3, 5.8, 0, 'sage', { w: 6, d: 4.6 }), I('roundCoffee', 25.5, 5.9, 0, 'walnut'),
    I('armchair', 21.55, 4.3, H, 'linen'), I('armchair', 21.55, 7.3, H, 'linen'),
    I('plant', 27.4, 1.3, 0, 'clay'), I('floorLamp', 34.1, 8.7, 0, 'white')
  ];
}
/* Foyer: helmets and keys on the wall above the shoe cabinet, a shoe bench next to it, a slatted partition
   screening the living room from the door, and a mat inside the main door. The right-hand side stays clear
   for the main door to swing open. */
function state0HasFoyer(s) { return s.items.some(it => ['helmetRack', 'shoeBench', 'slatPartition'].includes(it.type)); }
function foyerItems(I) {
  const H = Math.PI / 2;
  return [
    I('helmetRack', 11.53, 5.9, H, 'walnut'),
    I('shoeBench', 11.85, 9.1, H, 'oak'),
    I('slatPartition', 12.95, 10.75, 0, 'oak', { w: 3.5 }),
    I('doormat', 18.2, 4.6, 0, 'clay', { w: 3, d: 1.8 })
  ];
}
/* Older saved plans: swap the old Bedroom 2 furniture for the study set, keeping everything else. */
function migrate(s) {
  s.migrations = s.migrations || {};
  if (!s.migrations.study2) {
    s.items = s.items.filter(it => !(it.type !== 'wardrobe' && it.x > 20.1 && it.x < 35 && it.z > 0.2 && it.z < 10.4));
    let n = s.nextId || (s.items.length + 100);
    const I = (type, x, z, rot, finish, extra) => Object.assign({ id: 'i' + (n++), type, x, z, rot: rot || 0, finish: finish || CATALOG[type].fin }, extra || {});
    s.items.push(...studyItems(I));
    s.nextId = n;
    (s.labels || []).forEach(l => { if (l.text === 'BEDROOM 2') l.text = 'STUDY'; });
    s.migrations.study2 = true;
  }
  if (!s.migrations.tvWall) {
    // the TV unit now matches the photo: dark wenge wall unit, 5 ft wide, flush to the wall it backs onto
    s.items.forEach(it => { if (it.type === 'tvUnit') { if (it.finish === 'walnut') it.finish = 'wenge'; delete it.w; } });
    s.migrations.tvWall = true;
  }
  if (!s.migrations.foyer1) {
    let n = s.nextId || (s.items.length + 100);
    const I = (type, x, z, rot, finish, extra) => Object.assign({ id: 'i' + (n++), type, x, z, rot: rot || 0, finish: finish || CATALOG[type].fin }, extra || {});
    if (state0HasFoyer(s)) { /* already furnished by hand */ } else s.items.push(...foyerItems(I));
    s.nextId = n; s.migrations.foyer1 = true;
  }
  return s;
}
const FOOTPRINT = [[356,161],[590,161],[590,70],[980,70],[980,1084],[70,1084],[70,408],[356,408]].map(([x, y]) => P(x, y));
const WET = [[200,928,356,1084],[655,785,785,1019],[655,1019,980,1084],[902,395,980,707]].map(([x1, y1, x2, y2]) => [P(x1, y1), P(x2, y2)]);

/* ---------- Three.js setup ---------- */
/* Soft shadows (PCSS) — a GLSL patch to Three's shadow lookup.
   For each pixel it first finds how far above it the shadow caster sits, then blurs by that distance,
   so a shadow is crisp where a leg meets the floor and spreads into a soft penumbra further away. */
const SHADOW_FRUSTUM = 76, SHADOW_DEPTH = 199;
const PCSS_GLSL = `
#define PCSS_SAMPLES 24
#define PCSS_RANGE ${SHADOW_DEPTH.toFixed(1)}
#define PCSS_WIDTH ${SHADOW_FRUSTUM.toFixed(1)}
#define PCSS_SOFTNESS 0.085
#define PCSS_SEARCH 0.016
vec2 pcssDisk[ PCSS_SAMPLES ];
void pcssInit( const in vec2 seed ) {
  float ang = rand( seed ) * PI2;
  float r = 1.0 / float( PCSS_SAMPLES );
  for ( int i = 0; i < PCSS_SAMPLES; i ++ ) {
    pcssDisk[ i ] = vec2( cos( ang ), sin( ang ) ) * pow( r, 0.75 );
    r += 1.0 / float( PCSS_SAMPLES );
    ang += PI2 * 7.0 / float( PCSS_SAMPLES );
  }
}
float pcssShadow( sampler2D map, vec4 c ) {
  vec2 uv = c.xy; float zr = c.z;
  pcssInit( uv );
  float sum = 0.0; int n = 0;
  for ( int i = 0; i < PCSS_SAMPLES; i ++ ) {
    float d = unpackRGBAToDepth( texture2D( map, uv + pcssDisk[ i ] * PCSS_SEARCH ) );
    if ( d < zr ) { sum += d; n ++; }
  }
  if ( n == 0 ) return 1.0;
  float gapFt = ( zr - sum / float( n ) ) * PCSS_RANGE;
  float radius = clamp( gapFt * PCSS_SOFTNESS / PCSS_WIDTH, 0.0004, PCSS_SEARCH );
  float lit = 0.0;
  for ( int i = 0; i < PCSS_SAMPLES; i ++ ) {
    if ( zr <= unpackRGBAToDepth( texture2D( map, uv + pcssDisk[ i ] * radius ) ) ) lit += 1.0;
    if ( zr <= unpackRGBAToDepth( texture2D( map, uv - pcssDisk[ i ].yx * radius ) ) ) lit += 1.0;
  }
  return lit / ( 2.0 * float( PCSS_SAMPLES ) );
}
`;
(function patchShadows() {
  let chunk = THREE.ShaderChunk.shadowmap_pars_fragment;
  if (chunk.indexOf('#if defined( SHADOWMAP_TYPE_PCF )') === -1) return; // unknown Three build: keep default shadows
  chunk = chunk.replace('#ifdef USE_SHADOWMAP', '#ifdef USE_SHADOWMAP\n' + PCSS_GLSL);
  chunk = chunk.replace('#if defined( SHADOWMAP_TYPE_PCF )', 'return pcssShadow( shadowMap, shadowCoord );\n\t\t#if defined( SHADOWMAP_TYPE_PCF )');
  THREE.ShaderChunk.shadowmap_pars_fragment = chunk;
})();

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(0xe8e5de);
stage.insertBefore(renderer.domElement, stage.firstChild);
document.getElementById('loading').remove();

const scene = new THREE.Scene();
const CENTER = new THREE.Vector3(17.5, 0, 19.5);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
camera.zoom = 1;
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(CENTER);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.maxPolarAngle = 1.2;
controls.minZoom = 0.4; controls.maxZoom = 8;
controls.screenSpacePanning = true;

/* Lights: daylight only — sky fill plus a sun that moves with the slider. */
const hemi = new THREE.HemisphereLight(0xe9f0f5, 0xcfc6b6, 0.46);
scene.add(hemi);
const amb = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(amb);
/* Soft fill with no shadows: stands in for daylight bouncing around inside, so walls, wall tops and furniture
   read bright and get gentle side-to-side shading instead of sitting in the roof's shadow. */
const fill = new THREE.DirectionalLight(0xfff6ea, 0.42);
fill.position.set(-30, 60, 20); fill.target.position.copy(CENTER);
scene.add(fill, fill.target);
const sun = new THREE.DirectionalLight(0xfff0d8, 0.85);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera; sc.left = -SHADOW_FRUSTUM / 2; sc.right = SHADOW_FRUSTUM / 2; sc.top = SHADOW_FRUSTUM / 2; sc.bottom = -SHADOW_FRUSTUM / 2; sc.near = 1; sc.far = 1 + SHADOW_DEPTH;
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
sun.target.position.copy(CENTER);
scene.add(sun, sun.target);

/* Surface textures, drawn once on canvas. UVs are scaled to feet, so grain and weave stay the same size on every piece. */
function canvasTex(size, draw, rep) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.repeat.set(rep, rep); return t;
}
function speckle(g, s, n, rgba, r) { for (let i = 0; i < n; i++) { g.fillStyle = rgba; g.fillRect(Math.random() * s, Math.random() * s, r, r); } }
const TEX = {
  // Long wobbling growth lines; periods divide the tile so it repeats cleanly.
  wood: canvasTex(512, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 150; i++) {
      const y0 = Math.random() * s, amp = 2 + Math.random() * 7, k = 1 + Math.floor(Math.random() * 3), ph = Math.random() * 6.28;
      g.strokeStyle = `rgba(70,40,15,${0.035 + Math.random() * 0.11})`; g.lineWidth = 0.5 + Math.random() * 2.4;
      [-s, 0, s].forEach(off => { g.beginPath(); for (let x = 0; x <= s; x += 6) { const y = y0 + off + Math.sin((x / s) * Math.PI * 2 * k + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
    }
    speckle(g, s, 1400, 'rgba(60,35,10,0.08)', 1.4);
  }, 1 / 3),
  // Plain weave with slub noise.
  fabric: canvasTex(256, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 4) {
      g.fillStyle = `rgba(0,0,0,${0.035 + Math.random() * 0.04})`; g.fillRect(i, 0, 1.5, s);
      g.fillStyle = `rgba(0,0,0,${0.035 + Math.random() * 0.04})`; g.fillRect(0, i, s, 1.5);
    }
    speckle(g, s, 900, 'rgba(255,255,255,0.35)', 1.2); speckle(g, s, 500, 'rgba(0,0,0,0.06)', 1.5);
  }, 1.5),
  // Hand-trowelled plaster: soft cloudy blotches.
  plaster: canvasTex(512, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 380; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 6 + Math.random() * 38;
      const grd = g.createRadialGradient(x, y, 0, x, y, r); const a = Math.random() * 0.045;
      grd.addColorStop(0, `rgba(90,80,65,${a})`); grd.addColorStop(1, 'rgba(90,80,65,0)');
      g.fillStyle = grd; [-s, 0, s].forEach(ox => [-s, 0, s].forEach(oy => g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)));
    }
    speckle(g, s, 2600, 'rgba(70,60,50,0.07)', 1.2);
  }, 1 / 4),
  // Satin lacquer: almost flat, a faint orange-peel.
  lacquer: canvasTex(256, (g, s) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s); speckle(g, s, 3000, 'rgba(0,0,0,0.035)', 1.6); }, 1 / 2),
  // Black galaxy granite for counter tops.
  granite: canvasTex(256, (g, s) => {
    g.fillStyle = '#1e1e1f'; g.fillRect(0, 0, s, s);
    speckle(g, s, 2600, 'rgba(255,255,255,0.10)', 1.3); speckle(g, s, 260, 'rgba(230,205,160,0.35)', 1.6); speckle(g, s, 1800, 'rgba(0,0,0,0.5)', 2);
  }, 1 / 2),
  // Drawing paper for the ground the flat sits on.
  paper: canvasTex(512, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(90,75,55,${Math.random() * 0.05})`; g.lineWidth = 0.6; g.beginPath(); const x = Math.random() * s, y = Math.random() * s, a = Math.random() * 6.28, l = 4 + Math.random() * 14; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    speckle(g, s, 3500, 'rgba(80,70,55,0.05)', 1.2);
  }, 1 / 6)
};
function scaleBoxUV(geo, w, h, d) {
  const uv = geo.attributes.uv; const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * faces[f][0], uv.getY(i) * faces[f][1]); }
  uv.needsUpdate = true; return geo;
}
const texMatCache = {};
function texMat(hex, tex, rough, bump) {
  const key = hex + '|' + tex + '|' + rough;
  if (!texMatCache[key]) texMatCache[key] = new THREE.MeshStandardMaterial({ color: hex, map: TEX[tex], bumpMap: TEX[tex], bumpScale: bump, roughness: rough, metalness: 0 });
  return texMatCache[key];
}
const FIN_SURFACE = { oak: ['wood', 0.62, 0.008], walnut: ['wood', 0.55, 0.008], wenge: ['wood', 0.5, 0.008], linen: ['fabric', 1, 0.02], sage: ['fabric', 1, 0.02], clay: ['fabric', 0.95, 0.02], white: ['lacquer', 0.45, 0.002], charcoal: ['lacquer', 0.5, 0.002] };

/* Materials */
const matCache = {};
function mat(hex, opts) {
  const key = hex + JSON.stringify(opts || {});
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.82, metalness: 0 }, opts || {}));
  return matCache[key];
}
const MAT = {
  wallSide: texMat(0xf2f0eb, 'plaster', 0.95, 0.01),
  wallTop: mat(0x161616, { roughness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfd9e2, emissive: 0xcfe6ef, emissiveIntensity: 0.45, transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.1 }),
  showerGlass: new THREE.MeshStandardMaterial({ color: 0xd6e8ee, transparent: true, opacity: 0.28, roughness: 0.1 }),
  metal: mat(0xc8c9c7, { roughness: 0.3, metalness: 0.25 }),
  dark: mat(0x2a2927),
  granite: texMat(0xffffff, 'granite', 0.35, 0.002),
  fabric: texMat(0xfbfaf6, 'fabric', 1, 0.015),
  ceramic: mat(0xffffff, { roughness: 0.3 }),
  seam: mat(0x000000, { transparent: true, opacity: 0.25 }),
  leaf: mat(0x6f8a58, { roughness: 1 }),
  leaf2: mat(0x58744a, { roughness: 1 }),
  doorWhite: texMat(0xfbfaf7, 'lacquer', 0.5, 0.002),
  doorWood: texMat(0x9a6640, 'wood', 0.6, 0.008),
  screen: mat(0x161718, { roughness: 0.25, metalness: 0.2 }),
  water: mat(0x9fb4bb, { roughness: 0.2 })
};
const fin = key => { const k = FINISHES[key] ? key : 'oak'; const s = FIN_SURFACE[k]; return texMat(FINISHES[k].hex, s[0], s[1], s[2]); };

/* Floor textures drawn on canvas: 2 ft vitrified tiles for rooms, 1 ft matt tiles for wet areas. */
function tileTexture(base, line, speck) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = speck; g.fillRect(Math.random() * 256, Math.random() * 256, 1.2, 1.2); }
  g.strokeStyle = line; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
const floorTex = tileTexture('#e9e5dd', 'rgba(70,60,45,0.16)', 'rgba(120,110,95,0.07)');
floorTex.repeat.set(0.5, 0.5);
const floorTexIllus = tileTexture('#efe4cf', 'rgba(125,95,60,0.24)', 'rgba(140,110,80,0.07)');
floorTexIllus.repeat.set(0.5, 0.5);
TEX.tile = canvasTex(256, (g, s) => {
  const n = 4, t = s / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = 238 + Math.floor(Math.random() * 12); g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.fillRect(i * t, j * t, t, t); }
  g.strokeStyle = 'rgba(110,95,75,0.45)'; g.lineWidth = 2;
  for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * t, 0); g.lineTo(k * t, s); g.stroke(); g.beginPath(); g.moveTo(0, k * t); g.lineTo(s, k * t); g.stroke(); }
}, 1 / 4);
const wetTexBase = tileTexture('#dcdad5', 'rgba(70,60,45,0.18)', 'rgba(90,90,90,0.07)');

/* Paper ground under everything, so the flat casts its shadow onto the sheet. */
TEX.paper.repeat.set(400 / 6, 400 / 6);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe6e2da, map: TEX.paper, roughness: 1 }));
ground.position.set(CENTER.x, -0.03, CENTER.z);
ground.receiveShadow = true;
scene.add(ground);

const structureRoot = new THREE.Group(); scene.add(structureRoot);
/* Invisible full-height walls and a roof slab. They are never drawn, but they cast shadows,
   so direct sun can only reach the inside through windows, glass doors and the open balcony side. */
const proxyRoot = new THREE.Group(); scene.add(proxyRoot);
const PROXY = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
let lightGeo = { occ: [], src: [] };
const itemsRoot = new THREE.Group(); scene.add(itemsRoot);
const labelsRoot = new THREE.Group(); scene.add(labelsRoot);
const floorRoot = new THREE.Group(); scene.add(floorRoot);

/* ---------- Geometry helpers ---------- */
function box(g, m, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(scaleBoxUV(new THREE.BoxGeometry(w, h, d), w, h, d), m);
  mesh.position.set(x || 0, (y || 0) + h / 2, z || 0);
  g.add(mesh); return mesh;
}
function cyl(g, m, rTop, rBot, h, x, y, z, seg) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg || 28), m);
  mesh.position.set(x || 0, (y || 0) + h / 2, z || 0);
  g.add(mesh); return mesh;
}
function ball(g, m, r, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m);
  mesh.position.set(x || 0, y || 0, z || 0); g.add(mesh); return mesh;
}
/* Dining chair: tapered square legs, a padded seat, back posts that lean slightly, a curved top rail and three slats. */
function chair(g, f, x, z, rot, cushion) {
  const c = new THREE.Group(); const seatY = 1.5, sw = 1.42, sd = 1.38;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = cyl(c, f, 0.06, 0.042, seatY - 0.1, a * (sw / 2 - 0.1), 0, b * (sd / 2 - 0.1), 4); l.rotation.y = Math.PI / 4; });
  soft(c, f, sw, 0.12, sd, 0, seatY - 0.12, 0, 0.04);
  if (cushion !== false) soft(c, cushion || SEAT_PAD, sw - 0.14, 0.16, sd - 0.16, 0, seatY - 0.02, 0.03, 0.07);
  const back = new THREE.Group(); back.position.set(0, seatY - 0.05, -sd / 2 + 0.1); back.rotation.x = -0.1; c.add(back);
  [-1, 1].forEach(a => { const p = cyl(back, f, 0.05, 0.058, 1.55, a * (sw / 2 - 0.1), 0, 0, 4); p.rotation.y = Math.PI / 4; });
  const rail = soft(back, f, sw - 0.08, 0.34, 0.11, 0, 1.18, 0, 0.05); rail.scale.z = 1;
  soft(back, f, sw - 0.2, 0.1, 0.08, 0, 0.35, 0, 0.03);
  [-0.34, 0, 0.34].forEach(sx => soft(back, f, 0.11, 0.78, 0.06, sx, 0.42, 0, 0.03));
  c.position.set(x, 0, z); c.rotation.y = rot; g.add(c);
}
/* A laid place: linen mat, dinner plate and a glass, set at the table edge in front of a chair. */
function placeSetting(g, x, z, rot, topY) {
  const s = new THREE.Group(); s.position.set(x, topY, z); s.rotation.y = rot; g.add(s);
  box(s, PLACEMAT, 1.25, 0.012, 0.9, 0, 0, 0);
  cyl(s, MAT.ceramic, 0.4, 0.36, 0.035, 0, 0.012, 0, 28); cyl(s, mat(0xf3efe6), 0.27, 0.27, 0.04, 0, 0.012, 0, 24);
  cyl(s, MAT.glass, 0.1, 0.09, 0.32, 0.5, 0.012, -0.32, 16);
}
/* Table centrepiece: a linen runner with a low ceramic bowl of fruit and a sprig of greenery. */
function centrepiece(g, len, topY, along) {
  box(g, RUNNER, along === 'z' ? 0.85 : len, 0.01, along === 'z' ? len : 0.85, 0, topY, 0);
  cyl(g, mat(0xe9e1d2, { roughness: 0.4 }), 0.42, 0.22, 0.26, 0, topY + 0.01, 0, 28);
  [[0.12, 0.08, 0x8f9a4a], [-0.14, 0.05, 0xd9902f], [0.02, -0.15, 0xd9902f], [-0.02, 0.12, 0xc0472f]].forEach(([fx, fz, col]) => ball(g, mat(col, { roughness: 0.5 }), 0.13, fx, topY + 0.34, fz));
  ball(g, MAT.leaf, 0.16, 0.22, topY + 0.42, -0.1);
}
/* Rectangular dining table: softened solid-wood top, an apron, and tapered legs set in from the corners. */
function diningTable(g, f, w, d) {
  const topY = 2.4;
  soft(g, f, w, 0.16, d, 0, topY - 0.16, 0, 0.05);
  soft(g, f, w - 0.55, 0.3, d - 0.55, 0, topY - 0.46, 0, 0.03);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = cyl(g, f, 0.13, 0.08, topY - 0.16, a * (w / 2 - 0.32), 0, b * (d / 2 - 0.32), 4); l.rotation.y = Math.PI / 4; });
  return topY;
}
/* Soft, rounded block for upholstery: a subdivided box whose corners are pulled onto a sphere of radius r,
   so cushions, arms and backs look stuffed instead of cut from wood. */
function softGeo(w, h, d, r) {
  r = Math.max(0.01, Math.min(r, w / 2, h / 2, d / 2) * 0.98);
  const s = 6; const g = new THREE.BoxGeometry(w, h, d, s, s, s);
  const pos = g.attributes.position, nor = g.attributes.normal; const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    c.set(Math.max(-ix, Math.min(ix, v.x)), Math.max(-iy, Math.min(iy, v.y)), Math.max(-iz, Math.min(iz, v.z)));
    const n = v.clone().sub(c); const l = n.length();
    if (l > 1e-6) { n.divideScalar(l); v.copy(c).addScaledVector(n, r); pos.setXYZ(i, v.x, v.y, v.z); nor.setXYZ(i, n.x, n.y, n.z); }
  }
  pos.needsUpdate = true; nor.needsUpdate = true; return g;
}
function soft(g, m, w, h, d, x, y, z, r) {
  const mesh = new THREE.Mesh(softGeo(w, h, d, r == null ? 0.18 : r), m);
  mesh.position.set(x || 0, (y || 0) + h / 2, z || 0); g.add(mesh); return mesh;
}
const PILLOWS = [texMat(0xd9a15e, 'fabric', 1, 0.02), texMat(0xc77a5c, 'fabric', 1, 0.02), texMat(0xf2e9d8, 'fabric', 1, 0.02), texMat(0x8a9a78, 'fabric', 1, 0.02)];
const THROW = texMat(0xeadfca, 'fabric', 1, 0.03);
const SEAT_PAD = texMat(0xe7dcc8, 'fabric', 1, 0.02);
const PLACEMAT = texMat(0xd8cbb2, 'fabric', 1, 0.01);
const RUNNER = texMat(0xcdbd9f, 'fabric', 1, 0.01);
/* ---------- Furniture detailing helpers ---------- */
const BRASS = mat(0xcfa865, { roughness: 0.3, metalness: 0.3 });
const CHROME = mat(0xdfe2e5, { roughness: 0.25, metalness: 0.25 });
const STEEL = mat(0xc9ccd0, { roughness: 0.35, metalness: 0.2 });
const MIRROR = mat(0xd4e2e8, { roughness: 0.08, metalness: 0.15 });
const DUVET = texMat(0xf5f0e6, 'fabric', 1, 0.02);
const HEADBOARD = texMat(0xd2c6b2, 'fabric', 1, 0.025);
const COIR = texMat(0xb88a52, 'fabric', 1, 0.04);
const SOIL = mat(0x4a3a2c, { roughness: 1 });
const CERAMIC_WARM = mat(0xe8e1d4, { roughness: 0.35 });
const RATTAN = new THREE.MeshStandardMaterial({ color: 0xc8a06a, map: TEX.fabric, bumpMap: TEX.fabric, bumpScale: 0.03, roughness: 0.9, side: THREE.DoubleSide });
const GREENS = [mat(0x5f7f4a, { roughness: 0.85 }), mat(0x6f8f55, { roughness: 0.85 }), mat(0x4f6e40, { roughness: 0.85 })];
const BOOK_COLS = [0x8c5a3c, 0x395b64, 0xc8b28e, 0x6d6a5f, 0xa3442f, 0x2f4a3a, 0xd9c7a0, 0x7a6a8a];
let _seed = 7;
const rnd = () => (_seed = (_seed * 16807) % 2147483647) / 2147483647;

function legs4(g, m, w, d, h, inset, rt, rb) {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(g, m, rt, rb, h, a * (w / 2 - inset), 0, b * (d / 2 - inset), 10));
}
function barHandle(g, x, y, z, len, vertical, m) {
  soft(g, m || BRASS, vertical ? 0.05 : len, vertical ? len : 0.05, 0.06, x, y, z, 0.02);
}
function knob(g, x, y, z, m) { ball(g, m || BRASS, 0.055, x, y, z); }
function lathe(g, m, pts, x, y, z, seg) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg || 32), m);
  mesh.position.set(x || 0, y || 0, z || 0); g.add(mesh); return mesh;
}
/* Small table lamp: ceramic gourd base, linen drum shade. */
function tableLamp(g, x, y, z) {
  lathe(g, CERAMIC_WARM, [[0, 0], [0.14, 0], [0.2, 0.15], [0.18, 0.45], [0.06, 0.6], [0.04, 0.7]], x, y, z, 24);
  cyl(g, texMat(0xf3ebdc, 'fabric', 1, 0.01), 0.26, 0.34, 0.45, x, y + 0.66, z, 28);
}
/* Bud vase with a couple of leafy stems. */
function budVase(g, x, y, z, m) {
  lathe(g, m || CERAMIC_WARM, [[0, 0], [0.11, 0], [0.15, 0.14], [0.08, 0.38], [0.05, 0.46], [0.06, 0.5]], x, y, z, 20);
  [[-0.06, 0.25], [0.07, -0.2]].forEach(([dx, tilt]) => {
    const s = cyl(g, GREENS[2], 0.012, 0.012, 0.6, x + dx, y + 0.45, z, 6); s.rotation.z = tilt;
    ball(g, GREENS[(dx > 0) ? 0 : 1], 0.1, x + dx - Math.sin(tilt) * 0.55, y + 1.0, z);
  });
}
/* A shelf's worth of books: varied heights and colours, the odd one lying flat, gaps for objects. */
function bookRow(g, x0, x1, y, z, depth, maxH) {
  let x = x0;
  while (x < x1 - 0.12) {
    const t = 0.07 + rnd() * 0.11, h = maxH * (0.62 + rnd() * 0.36);
    const col = mat(BOOK_COLS[Math.floor(rnd() * BOOK_COLS.length)], { roughness: 0.75 });
    if (rnd() < 0.1 && x + 0.75 < x1) {   // a small stack lying flat
      for (let k = 0; k < 3; k++) soft(g, mat(BOOK_COLS[Math.floor(rnd() * BOOK_COLS.length)]), 0.62 - k * 0.04, 0.08, depth * 0.78, x + 0.33, y + k * 0.085, z, 0.01);
      x += 0.75; continue;
    }
    if (x + t > x1) break;
    soft(g, col, t, h, depth * (0.72 + rnd() * 0.22), x + t / 2, y, z, 0.01);
    x += t + 0.006;
    if (rnd() < 0.06) x += 0.3;
  }
}
/* Leafy house plant: a rosette of blades leaning out from the centre. */
function leafyPlant(g, x, y, z, s) {
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996, h = (0.55 + (i % 5) * 0.16) * s, r = (0.04 + (i % 3) * 0.05) * s;
    const pivot = new THREE.Group(); pivot.position.set(x, y, z); pivot.rotation.y = -a; g.add(pivot);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), GREENS[i % 3]);
    leaf.scale.set(0.2 * s, h, 0.06 * s);
    const tilt = 0.25 + (i % 4) * 0.12;
    leaf.rotation.z = -tilt; leaf.position.set(r + Math.sin(tilt) * h * 0.5, Math.cos(tilt) * h * 0.5, 0);
    pivot.add(leaf);
  }
}
function potWithPlant(g, potMat, x, y, z, s) {
  lathe(g, potMat, [[0, 0], [0.3 * s, 0], [0.38 * s, 0.62 * s], [0.42 * s, 0.68 * s], [0.42 * s, 0.75 * s], [0.37 * s, 0.75 * s], [0, 0.7 * s]], x, y, z, 26);
  cyl(g, SOIL, 0.36 * s, 0.36 * s, 0.02, x, y + 0.7 * s, z, 20);
  leafyPlant(g, x, y + 0.7 * s, z, 1.2 * s);
}

function bed(g, f, w, d, pillows) {
  legs4(g, f, w, d, 0.3, 0.28, 0.07, 0.05);
  soft(g, f, w, 0.55, d - 0.15, 0, 0.28, 0.07, 0.06);                                   // frame
  // upholstered headboard in vertical channels
  const ch = Math.max(3, Math.round(w / 0.85)), cw = (w + 0.2) / ch;
  for (let i = 0; i < ch; i++) soft(g, HEADBOARD, cw - 0.03, 3.4, 0.32, -w / 2 - 0.1 + cw * (i + 0.5), 0.28, -d / 2 + 0.16, 0.13);
  soft(g, MAT.fabric, w - 0.16, 0.72, d - 0.5, 0, 0.8, 0.15, 0.14);                    // mattress
  // duvet over the lower part, draped down the sides and the foot
  const dz = d * 0.62, dc = d / 2 - dz / 2 - 0.02;
  soft(g, DUVET, w + 0.02, 0.2, dz, 0, 1.42, dc, 0.1);
  [-1, 1].forEach(s => soft(g, DUVET, 0.07, 0.62, dz, s * (w / 2 + 0.02), 0.95, dc, 0.03));
  soft(g, DUVET, w + 0.02, 0.62, 0.07, 0, 0.95, d / 2 - 0.02, 0.03);
  soft(g, PILLOWS[1], w + 0.08, 0.1, 0.95, 0, 1.6, d / 2 - 0.75, 0.04);                 // folded throw
  const pw = pillows === 1 ? w - 0.9 : (w - 0.5) / 2;
  for (let i = 0; i < pillows; i++) {
    const px = pillows === 1 ? 0 : (i ? 1 : -1) * (pw / 2 + 0.08);
    const p = soft(g, MAT.fabric, pw, 0.42, 1.05, px, 1.48, -d / 2 + 0.95, 0.18); p.rotation.x = -0.18;
  }
  const c = soft(g, PILLOWS[0], Math.min(1.6, w * 0.34), 1.0, 0.3, 0, 1.52, -d / 2 + 1.6, 0.13); c.rotation.x = -0.35;
}

/* Cozy upholstered seating, shared by sofas, modules and armchairs.
   Back runs along -z; "left" is the -x end as you face it. Legs, a plump base, rolled arms, deep seat cushions,
   loose back cushions leaning back, scatter pillows in warm accent colours and, optionally, a throw over one arm. */
function plush(g, f, w, d, o) {
  const legH = 0.32, baseH = 0.75, seatTop = legH + baseH, arm = 0.62, back = 0.55;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => cyl(g, fin('walnut'), 0.06, 0.045, legH, a * (w / 2 - 0.22), 0, b * (d / 2 - 0.22), 12));
  soft(g, f, w, baseH, d, 0, legH, 0, 0.14);
  if (o.back) soft(g, f, w, 1.45, back, 0, legH + 0.2, -d / 2 + back / 2, 0.22);
  if (o.backLeft) soft(g, f, back, 1.45, d, -w / 2 + back / 2, legH + 0.2, 0, 0.22);
  if (o.left) soft(g, f, arm, 1.25, d, -w / 2 + arm / 2, legH + 0.2, 0, 0.28);
  if (o.right) soft(g, f, arm, 1.25, d, w / 2 - arm / 2, legH + 0.2, 0, 0.28);
  const x0 = -w / 2 + (o.left ? arm : o.backLeft ? back : 0.03), x1 = w / 2 - (o.right ? arm : 0.03);
  const z0 = o.back ? -d / 2 + back : -d / 2 + 0.04, z1 = d / 2 - 0.02;
  const n = Math.max(1, Math.round((x1 - x0) / 2.3)); const cw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + cw * (i + 0.5);
    soft(g, f, cw - 0.05, 0.5, z1 - z0, cx, seatTop - 0.08, (z0 + z1) / 2, 0.2);
    if (o.back) { const bc = soft(g, f, cw - 0.08, 1.35, 0.62, cx, seatTop + 0.2, z0 + 0.28, 0.28); bc.rotation.x = -0.2; }
  }
  if (o.backLeft && o.back) { const sc = soft(g, f, 0.62, 1.35, z1 - z0 - 0.1, x0 + 0.28, seatTop + 0.2, (z0 + z1) / 2 + 0.05, 0.28); sc.rotation.z = 0.2; }
  // scatter pillows, tucked into the corners against the back
  const pillows = o.pillows == null ? (o.back ? Math.min(2, n) : 0) : o.pillows;
  for (let i = 0; i < pillows; i++) {
    const left = i === 0; const px = left ? x0 + 0.72 : x1 - 0.72;
    const p = soft(g, PILLOWS[(o.accent || 0) + i] || PILLOWS[i % PILLOWS.length], 1.3, 1.25, 0.36, px, seatTop + 0.42, z0 + 0.62, 0.17);
    p.rotation.set(-0.38, left ? 0.32 : -0.32, left ? 0.12 : -0.12);
  }
  if (o.throw && o.right) {
    const tx = w / 2 - arm / 2;
    soft(g, THROW, arm + 0.12, 0.06, 1.5, tx, legH + 1.45, 0.25, 0.03);
    soft(g, THROW, 0.06, 0.9, 1.5, w / 2 + 0.02, legH + 0.6, 0.25, 0.03);
  }
}
function sofa(g, f, w, d, seats) { plush(g, f, w, d, { back: true, left: true, right: true, throw: seats >= 3 }); }

/* One sofa module. A corner module also has a back on its left side. */
function sofaModule(g, f, w, d, o) {
  plush(g, f, w, d, Object.assign({ pillows: o.back ? (o.left || o.right || o.backLeft ? 1 : 0) : 0, accent: o.right ? 1 : 0 }, o));
}
/* Edge snapping for modular pieces: while dragging, a module's sides and back line up with any module next to it. */
function aabb(it, x, z) {
  const r = (((it.rot || 0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); const q = Math.round(r / (Math.PI / 2));
  if (Math.abs(r - q * Math.PI / 2) > 0.01) return null;
  const { w, d } = dims(it); const sw = q % 2 === 1;
  const hx = (sw ? d : w) / 2, hz = (sw ? w : d) / 2;
  return { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz };
}
function snapModule(it, x, z) {
  const me = aabb(it, x, z); if (!me) return [x, z];
  let bx = null, bz = null; const T = 0.45;
  state.items.forEach(o => {
    if (o.id === it.id || !CATALOG[o.type].module) return;
    const b = aabb(o, o.x, o.z); if (!b) return;
    const nearZ = me.z0 < b.z1 + 0.5 && me.z1 > b.z0 - 0.5, nearX = me.x0 < b.x1 + 0.5 && me.x1 > b.x0 - 0.5;
    if (nearZ) [b.x1 - me.x0, b.x0 - me.x1, b.x0 - me.x0, b.x1 - me.x1].forEach(dl => { if (Math.abs(dl) < T && (bx === null || Math.abs(dl) < Math.abs(bx))) bx = dl; });
    if (nearX) [b.z1 - me.z0, b.z0 - me.z1, b.z0 - me.z0, b.z1 - me.z1].forEach(dl => { if (Math.abs(dl) < T && (bz === null || Math.abs(dl) < Math.abs(bz))) bz = dl; });
  });
  return [x + (bx || 0), z + (bz || 0)];
}

/* ---------- Catalog. Local frame: width along x, depth along z, back of the piece at -z. ---------- */
const CATALOG = {
  queenBed:    { name: 'Queen bed', cat: 'Bedroom', w: 5, d: 6.8, fin: 'oak', build: (g, f, w, d) => bed(g, f, w, d, 2) },
  kingBed:     { name: 'King bed', cat: 'Bedroom', w: 6, d: 6.8, fin: 'walnut', build: (g, f, w, d) => bed(g, f, w, d, 2) },
  singleBed:   { name: 'Single bed', cat: 'Bedroom', w: 3.5, d: 6.6, fin: 'oak', build: (g, f, w, d) => bed(g, f, w, d, 1) },
  bunkBed:     { name: 'Bunk bed', cat: 'Bedroom', w: 3.5, d: 6.6, fin: 'white', build: (g, f, w, d) => {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => soft(g, f, 0.26, 5.8, 0.26, a * (w / 2 - 0.13), 0, b * (d / 2 - 0.13), 0.06));
    [0.45, 3.65].forEach((y, k) => {
      soft(g, f, w, 0.32, d, 0, y, 0, 0.05);
      soft(g, MAT.fabric, w - 0.25, 0.5, d - 0.4, 0, y + 0.32, 0, 0.12);
      soft(g, k ? PILLOWS[3] : PILLOWS[1], w - 0.18, 0.16, d * 0.55, 0, y + 0.8, d * 0.2, 0.07);
      const p = soft(g, MAT.fabric, w - 0.8, 0.32, 0.9, 0, y + 0.82, -d / 2 + 0.7, 0.14); p.rotation.x = -0.15;
    });
    soft(g, f, 0.1, 0.65, d - 1.6, -w / 2 + 0.05, 4.0, -0.5, 0.04);                       // guard rail
    soft(g, f, 0.1, 0.65, d - 1.9, w / 2 - 0.05, 4.0, -0.7, 0.04);
    [d / 2 - 0.35, d / 2 - 1.35].forEach(z => soft(g, f, 0.1, 4.7, 0.1, w / 2 + 0.06, 0, z, 0.03));   // ladder
    for (let i = 0; i < 5; i++) soft(g, f, 0.09, 0.08, 1.0, w / 2 + 0.06, 0.7 + i * 0.85, d / 2 - 0.85, 0.03);
  } },
  bedside:     { name: 'Bedside table', cat: 'Bedroom', w: 1.6, d: 1.4, fin: 'oak', build: (g, f, w, d) => {
    legs4(g, f, w, d, 0.45, 0.12, 0.05, 0.035);
    soft(g, f, w, 1.15, d, 0, 0.45, 0, 0.04);
    soft(g, f, w + 0.06, 0.08, d + 0.04, 0, 1.6, 0, 0.03);
    [0.52, 1.07].forEach(y => { soft(g, f, w - 0.1, 0.5, 0.04, 0, y, d / 2, 0.02); knob(g, 0, y + 0.25, d / 2 + 0.05); });
    tableLamp(g, -w * 0.2, 1.68, -0.15);
    soft(g, mat(0x395b64), 0.6, 0.08, 0.45, w * 0.18, 1.68, 0.2, 0.01); soft(g, mat(0xd9c7a0), 0.55, 0.07, 0.42, w * 0.2, 1.76, 0.2, 0.01);
  } },
  wardrobe:    { name: 'Wardrobe', cat: 'Bedroom', w: 6, d: 2, fin: 'walnut', resize: 'w', build: (g, f, w, d) => {
    const h = 7.2, plinth = 0.3, loft = 1.55;
    box(g, MAT.dark, w - 0.1, plinth, d - 0.3, 0, 0, -0.12);
    soft(g, f, w, h - plinth, d - 0.08, 0, plinth, -0.04, 0.03);
    const n = Math.max(2, Math.round(w / 1.5)), dw = (w - 0.04) / n, front = d / 2 - 0.03;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 0.02 + dw * (i + 0.5);
      soft(g, f, dw - 0.035, h - plinth - loft - 0.06, 0.06, x, plinth + 0.03, front, 0.02);
      soft(g, f, dw - 0.035, loft - 0.06, 0.06, x, h - loft + 0.01, front, 0.02);
      const hx = i % 2 === 0 ? x + dw / 2 - 0.16 : x - dw / 2 + 0.16;
      barHandle(g, hx, 2.3, front + 0.06, 1.1, true);
      barHandle(g, x, h - loft + 0.12, front + 0.06, 0.45);
    }
  } },
  dresser:     { name: 'Dresser + mirror', cat: 'Bedroom', w: 3, d: 1.5, fin: 'walnut', build: (g, f, w, d) => {
    legs4(g, f, w, d, 0.35, 0.15, 0.06, 0.045);
    soft(g, f, w, 2.25, d, 0, 0.35, 0, 0.05);
    for (let r = 0; r < 3; r++) { const y = 0.42 + r * 0.72; soft(g, f, w - 0.12, 0.64, 0.05, 0, y, d / 2, 0.02); barHandle(g, 0, y + 0.45, d / 2 + 0.05, 0.6); }
    soft(g, f, 1.9, 3.0, 0.1, 0, 2.62, -d / 2 + 0.08, 0.08); soft(g, MIRROR, 1.65, 2.75, 0.03, 0, 2.74, -d / 2 + 0.14, 0.06);
    cyl(g, mat(0xcfa98a, { roughness: 0.2 }), 0.08, 0.08, 0.3, -w / 2 + 0.4, 2.6, 0.2, 16);
    cyl(g, mat(0x9fb6bd, { transparent: true, opacity: 0.7, roughness: 0.1 }), 0.1, 0.12, 0.22, -w / 2 + 0.65, 2.6, 0.25, 16);
    soft(g, CERAMIC_WARM, 0.6, 0.06, 0.4, w / 2 - 0.5, 2.6, 0.15, 0.02);
  } },
  desk:        { name: 'Study desk', cat: 'Bedroom', w: 3.5, d: 1.8, fin: 'oak', resize: 'w', build: (g, f, w, d) => {
    const topY = 2.42, dwW = Math.min(1.4, w * 0.35), dx = w / 2 - dwW / 2 - 0.15;
    soft(g, f, w, 0.1, d, 0, topY, 0, 0.04);
    legs4(g, MAT.dark, w, d, topY, 0.12, 0.045, 0.04);
    soft(g, f, dwW, 0.34, d - 0.25, dx, topY - 0.34, -0.05, 0.03); barHandle(g, dx, topY - 0.18, d / 2 - 0.12, 0.4);
    const screens = Math.max(1, Math.floor(w / 3));
    for (let i = 0; i < screens; i++) {
      const sx = -w / 2 + (w / screens) * (i + 0.5) - (screens === 1 ? 0.3 : 0);
      soft(g, MAT.dark, 0.55, 0.03, 0.35, sx, topY + 0.1, -d / 2 + 0.35, 0.02);
      cyl(g, MAT.dark, 0.04, 0.04, 0.5, sx, topY + 0.12, -d / 2 + 0.3, 10);
      soft(g, MAT.dark, 1.75, 1.05, 0.07, sx, topY + 0.5, -d / 2 + 0.3, 0.03);
      soft(g, MAT.screen, 1.65, 0.95, 0.02, sx, topY + 0.55, -d / 2 + 0.345, 0.01);
      soft(g, mat(0xe5e2dc, { roughness: 0.6 }), 1.15, 0.04, 0.38, sx, topY + 0.1, 0.12, 0.02);
    }
    const L = new THREE.Group(); L.position.set(w / 2 - 0.3, topY + 0.1, -d / 2 + 0.3); g.add(L);     // desk lamp
    cyl(L, MAT.dark, 0.16, 0.18, 0.05, 0, 0, 0, 18); cyl(L, MAT.dark, 0.025, 0.025, 1.05, 0, 0.05, 0, 8);
    const arm = cyl(L, MAT.dark, 0.022, 0.022, 0.6, -0.3, 0.78, 0, 8); arm.rotation.z = Math.PI / 2;
    cyl(L, MAT.dark, 0.06, 0.2, 0.25, -0.6, 0.85, 0, 18);
    cyl(g, mat(0xc97c5d, { roughness: 0.5 }), 0.09, 0.08, 0.2, w / 2 - 0.75, topY + 0.1, 0.25, 16);
  } },
  deskChair:   { name: 'Desk chair', cat: 'Bedroom', w: 1.8, d: 1.8, fin: 'charcoal', build: (g, f) => {
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Group(); p.rotation.y = (i * Math.PI * 2) / 5; g.add(p);
      soft(p, MAT.dark, 0.85, 0.08, 0.12, 0.42, 0.18, 0, 0.03); ball(p, MAT.dark, 0.07, 0.8, 0.08, 0);
    }
    cyl(g, CHROME, 0.06, 0.06, 1.0, 0, 0.25, 0, 12);
    soft(g, f, 1.6, 0.3, 1.5, 0, 1.22, 0.05, 0.13);
    const b = soft(g, f, 1.5, 1.7, 0.2, 0, 1.62, -0.72, 0.14); b.rotation.x = -0.12;
    soft(g, MAT.dark, 0.12, 0.6, 0.1, 0, 1.3, -0.68, 0.03);
    [-1, 1].forEach(s => { soft(g, MAT.dark, 0.08, 0.5, 0.08, s * 0.72, 1.4, 0.05, 0.03); soft(g, MAT.dark, 0.14, 0.07, 0.75, s * 0.72, 1.9, 0.05, 0.03); });
  } },
  sofa3:       { name: 'Sofa, 3 seat', cat: 'Living', w: 7, d: 3, fin: 'linen', build: (g, f, w, d) => sofa(g, f, w, d, 3) },
  loveseat:    { name: 'Sofa, 2 seat', cat: 'Living', w: 5, d: 3, fin: 'sage', build: (g, f, w, d) => sofa(g, f, w, d, 2) },
  lSofa:       { name: 'L-shaped sofa', cat: 'Living', w: 8, d: 6, fin: 'linen', build: (g, f, w, d) => {
    const sd = 3;
    const run = new THREE.Group(); plush(run, f, w, sd, { back: true, left: true, pillows: 2 }); run.position.z = -d / 2 + sd / 2; g.add(run);
    const chaise = new THREE.Group(); plush(chaise, f, sd, d - sd, { right: true, pillows: 0, throw: false }); chaise.position.set(w / 2 - sd / 2, 0, sd / 2); g.add(chaise);
  } },
  /* Modular sofa: line these up and turn them to build straight runs or L-shapes. They snap edge to edge while dragging. */
  sofaArmless: { name: 'Sofa module, no arms', cat: 'Living', w: 2.6, d: 3, fin: 'sage', resize: 'w', module: true, build: (g, f, w, d) => sofaModule(g, f, w, d, { back: true }) },
  sofaArmL:    { name: 'Sofa module, arm left', cat: 'Living', w: 3.2, d: 3, fin: 'sage', module: true, build: (g, f, w, d) => sofaModule(g, f, w, d, { back: true, left: true }) },
  sofaArmR:    { name: 'Sofa module, arm right', cat: 'Living', w: 3.2, d: 3, fin: 'sage', module: true, build: (g, f, w, d) => sofaModule(g, f, w, d, { back: true, right: true }) },
  sofaCorner:  { name: 'Sofa corner module', cat: 'Living', w: 3, d: 3, fin: 'sage', module: true, build: (g, f, w, d) => sofaModule(g, f, w, d, { back: true, backLeft: true }) },
  sofaOttoman: { name: 'Sofa ottoman', cat: 'Living', w: 2.6, d: 2.6, fin: 'sage', resize: 'wd', module: true, build: (g, f, w, d) => sofaModule(g, f, w, d, {}) },
  armchair:    { name: 'Armchair', cat: 'Living', w: 2.8, d: 2.8, fin: 'linen', build: (g, f, w, d) => plush(g, f, w, d, { back: true, left: true, right: true, pillows: 1, accent: 1 }) },
  coffeeTable: { name: 'Coffee table', cat: 'Living', w: 3.6, d: 2, fin: 'oak', build: (g, f, w, d) => {
    soft(g, f, w, 0.18, d, 0, 1.12, 0, 0.06);
    soft(g, f, w - 0.35, 0.08, d - 0.35, 0, 0.32, 0, 0.03);
    legs4(g, f, w, d, 1.12, 0.18, 0.08, 0.06);
    soft(g, mat(0x395b64), 0.75, 0.1, 0.55, -w / 2 + 0.7, 1.3, -0.15, 0.02); soft(g, mat(0xd9c7a0), 0.68, 0.08, 0.5, -w / 2 + 0.72, 1.4, -0.14, 0.02);
    budVase(g, -w / 2 + 0.72, 1.48, -0.14);
    soft(g, fin('walnut'), 1.0, 0.05, 0.6, w / 2 - 0.8, 1.3, 0.1, 0.03);
    cyl(g, MAT.ceramic, 0.09, 0.08, 0.16, w / 2 - 1.0, 1.35, 0.1, 16); cyl(g, MAT.ceramic, 0.09, 0.08, 0.16, w / 2 - 0.6, 1.35, 0.15, 16);
    soft(g, mat(0x2f4a3a), 0.5, 0.06, 0.6, 0.05, 0.4, 0.05, 0.02); soft(g, mat(0xa3442f), 0.45, 0.06, 0.55, 0.0, 0.46, 0.0, 0.02);
  } },
  roundCoffee: { name: 'Round coffee table', cat: 'Living', w: 2.6, d: 2.6, fin: 'walnut', build: (g, f, w) => {
    cyl(g, f, w / 2, w / 2 - 0.03, 0.14, 0, 1.15, 0, 40);
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3, p = new THREE.Group(); p.rotation.y = -a; g.add(p);
      const l = cyl(p, f, 0.06, 0.045, 1.2, 0, 0, 0, 10); l.position.set(w * 0.27, 0.58, 0); l.rotation.z = -0.14;
    }
    budVase(g, 0.25, 1.29, -0.1); soft(g, mat(0xd9c7a0), 0.6, 0.07, 0.45, -0.35, 1.29, 0.2, 0.02);
  } },
  /* The flat's own TV wall unit (from the entrance photo): a tall dark-wood back panel on the wall,
     a floating base cabinet with a white drawer in the middle, and a column of small open shelves on each side. */
  tvUnit:      { name: 'TV wall unit', cat: 'Living', w: 5, d: 1.4, fin: 'wenge', resize: 'w', build: (g, f, w, d) => {
    const top = 6.6, lift = 0.4, cabH = 1.15, panelD = 0.12, colW = 0.72, shelfD = 0.62;
    box(g, f, w, top - lift, panelD, 0, lift, -d / 2 + panelD / 2);                    // back panel
    box(g, f, w, cabH, d - panelD, 0, lift, panelD / 2);                               // floating base cabinet
    box(g, MAT.seam, w - 0.1, 0.03, 0.02, 0, lift + 0.08, d / 2 + 0.01);
    box(g, MAT.dark, 1.62, 0.72, 0.03, 0, lift + 0.22, d / 2 + 0.01);                  // drawer frame
    box(g, MAT.doorWhite, 1.48, 0.6, 0.04, 0, lift + 0.28, d / 2 + 0.02);              // white drawer front
    [-1, 1].forEach(s => box(g, MAT.seam, 0.03, cabH - 0.25, 0.02, s * (w / 2 - colW), lift + 0.15, d / 2 + 0.01));
    const y0 = lift + cabH, zc = -d / 2 + panelD + shelfD / 2;
    [-1, 1].forEach(s => {
      const outer = s * (w / 2 - 0.04), inner = s * (w / 2 - colW + 0.04), cx = s * (w / 2 - colW / 2);
      box(g, f, 0.08, top - y0, shelfD, outer, y0, zc);
      box(g, f, 0.08, top - y0, shelfD, inner, y0, zc);
      for (let k = 1; k <= 5; k++) box(g, f, colW - 0.08, 0.06, shelfD, cx, y0 + k * ((top - y0) / 5.4), zc);
    });
    box(g, MAT.doorWhite, 0.24, 0.24, 0.02, 0, 3.0, -d / 2 + panelD + 0.01);           // socket plate
  } },
  wallTV:      { name: 'Wall-mounted TV', cat: 'Living', w: 4.2, d: 0.35, fin: 'charcoal', elev: 2.4, build: (g, f, w, d) => {
    soft(g, MAT.dark, w, 2.45, 0.1, 0, 0, 0, 0.03);
    soft(g, mat(0x1a2330, { roughness: 0.15, metalness: 0.3 }), w - 0.1, 2.35, 0.02, 0, 0.05, 0.055, 0.01);
    soft(g, MAT.dark, 0.6, 0.05, 0.05, 0, -0.08, 0.04, 0.02);
  } },
  bookshelf:   { name: 'Bookshelf', cat: 'Living', w: 3, d: 1.2, fin: 'oak', build: (g, f, w, d) => {
    _seed = 11;
    const h = 6.5, n = 5, gap = (h - 0.4) / n;
    soft(g, f, 0.1, h, d, -w / 2 + 0.05, 0, 0, 0.03); soft(g, f, 0.1, h, d, w / 2 - 0.05, 0, 0, 0.03);
    box(g, f, w - 0.1, h - 0.1, 0.05, 0, 0.05, -d / 2 + 0.03);
    box(g, MAT.dark, w - 0.2, 0.3, d - 0.2, 0, 0, -0.05);
    for (let i = 0; i <= n; i++) soft(g, f, w - 0.1, 0.08, d - 0.05, 0, 0.3 + i * gap - (i === n ? 0.08 : 0), 0, 0.02);
    for (let i = 0; i < n; i++) {
      const y = 0.38 + i * gap, x0 = -w / 2 + 0.15, x1 = w / 2 - 0.15;
      if (i === 1) { bookRow(g, x0, x0 + 1.4, y, 0.02, d, gap - 0.25); budVase(g, x1 - 0.45, y, 0.05); }
      else if (i === 3) { potWithPlant(g, fin('clay'), x0 + 0.4, y, 0.05, 0.55); bookRow(g, x0 + 0.95, x1, y, 0.02, d, gap - 0.25); }
      else bookRow(g, x0, x1, y, 0.02, d, gap - 0.25);
    }
  } },
  rug:         { name: 'Rug', cat: 'Living', w: 8, d: 5, fin: 'linen', resize: 'wd', build: (g, f, w, d) => {
    soft(g, f, w, 0.05, d, 0, 0, 0, 0.02);
    const B = PILLOWS[2];
    [-1, 1].forEach(s => { box(g, B, w - 0.7, 0.008, 0.1, 0, 0.05, s * (d / 2 - 0.35)); box(g, B, 0.1, 0.008, d - 0.7, s * (w / 2 - 0.35), 0.05, 0); });
    [-1, 1].forEach(s => { box(g, B, w - 1.1, 0.006, 0.04, 0, 0.05, s * (d / 2 - 0.55)); box(g, B, 0.04, 0.006, d - 1.1, s * (w / 2 - 0.55), 0.05, 0); });
    const fr = mat(0xece3d2, { roughness: 1 });
    [-1, 1].forEach(s => { for (let k = 0; k < Math.floor(d / 0.12); k++) box(g, fr, 0.22, 0.015, 0.035, s * (w / 2 + 0.1), 0, -d / 2 + 0.06 + k * 0.12); });
  } },
  floorLamp:   { name: 'Floor lamp', cat: 'Living', w: 1.2, d: 1.2, fin: 'white', build: (g, f) => {
    const H = 4.3;
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Group(); p.rotation.y = -(i * 2 * Math.PI) / 3 - 0.5; g.add(p);
      const leg = cyl(p, fin('oak'), 0.035, 0.045, H, 0, 0, 0, 8); leg.position.set(0.27, H / 2, 0); leg.rotation.z = 0.12;
    }
    cyl(g, texMat(0xf1e8d6, 'fabric', 1, 0.01), 0.55, 0.62, 0.85, 0, H - 0.15, 0, 32);
  } },
  plant:       { name: 'Potted plant', cat: 'Living', w: 1.3, d: 1.3, fin: 'clay', build: (g, f) => potWithPlant(g, f, 0, 0, 0, 1.25) },
  /* Dining sets come laid: placemats, plates, glasses and a fruit-bowl centrepiece on a runner.
     Chairs are pulled out by slightly different amounts so the set looks used rather than lined up. */
  dining4:     { name: 'Dining set, 4', cat: 'Dining', w: 4.2, d: 6.2, fin: 'oak', build: (g, f) => {
    const y = diningTable(g, f, 4.2, 3); centrepiece(g, 2.6, y, 'x');
    [[-1, -1, 0.05], [1, -1, -0.1], [-1, 1, 0.12], [1, 1, 0]].forEach(([a, b, p], i) => {
      const rz = b < 0 ? 0 : Math.PI; chair(g, f, a * 1.0, b * (2.05 + p), rz + (i % 2 ? 0.05 : -0.04));
      placeSetting(g, a * 1.0, b * 1.05, rz, y);
    });
  } },
  dining6:     { name: 'Dining set, 6', cat: 'Dining', w: 6.4, d: 7, fin: 'oak', build: (g, f) => {
    const y = diningTable(g, f, 6.4, 3.3); centrepiece(g, 4.4, y, 'x');
    [-2.1, 0, 2.1].forEach((x, i) => {
      chair(g, f, x, -(2.25 + [0.05, -0.08, 0.12][i]), [0.04, 0, -0.05][i]);
      chair(g, f, x, 2.25 + [-0.05, 0.1, 0][i], Math.PI + [0, 0.05, -0.03][i]);
      placeSetting(g, x, -1.12, 0, y); placeSetting(g, x, 1.12, Math.PI, y);
    });
  } },
  dining6Bench: { name: 'Dining set, bench', cat: 'Dining', w: 6.4, d: 6.8, fin: 'walnut', build: (g, f) => {
    const y = diningTable(g, f, 6.4, 3.2); centrepiece(g, 4.4, y, 'x');
    [-2.1, 0, 2.1].forEach((x, i) => { chair(g, f, x, -(2.2 + [0.05, -0.08, 0.1][i]), [0.04, 0, -0.05][i]); placeSetting(g, x, -1.1, 0, y); placeSetting(g, x, 1.1, Math.PI, y); });
    // upholstered bench on the other side
    [-1, 1].forEach(a => [-1, 1].forEach(b => { const l = cyl(g, f, 0.06, 0.045, 1.38, a * 2.65, 0, 2.15 + b * 0.42, 4); l.rotation.y = Math.PI / 4; }));
    soft(g, f, 5.7, 0.14, 1.2, 0, 1.36, 2.15, 0.04); soft(g, SEAT_PAD, 5.5, 0.18, 1.05, 0, 1.48, 2.15, 0.08);
  } },
  roundDining: { name: 'Round dining, 4', cat: 'Dining', w: 6, d: 6, fin: 'walnut', build: (g, f) => {
    const y = 2.4;
    cyl(g, f, 1.85, 1.85, 0.14, 0, y - 0.14, 0, 48); cyl(g, f, 1.7, 1.75, 0.1, 0, y - 0.24, 0, 48);
    cyl(g, f, 0.2, 0.26, y - 0.5, 0, 0.26, 0, 20); cyl(g, f, 0.3, 0.85, 0.26, 0, 0, 0, 28);
    cyl(g, RUNNER, 0.75, 0.75, 0.01, 0, y, 0, 32); centrepiece(g, 0.01, y, 'x');
    [[0, -1, 0], [0, 1, Math.PI], [-1, 0, Math.PI / 2], [1, 0, -Math.PI / 2]].forEach(([a, b, r], i) => {
      const pull = 2.3 + [0.05, -0.1, 0.12, 0][i];
      chair(g, f, a * pull, b * pull, r + [0.06, -0.04, 0, 0.05][i]); placeSetting(g, a * 1.25, b * 1.25, r, y);
    });
  } },
  diningChair: { name: 'Dining chair', cat: 'Dining', w: 1.5, d: 1.5, fin: 'oak', build: (g, f) => chair(g, f, 0, 0, 0) },
  sideboard:   { name: 'Sideboard', cat: 'Dining', w: 5, d: 1.6, fin: 'walnut', build: (g, f, w, d) => {
    legs4(g, f, w, d, 0.5, 0.18, 0.07, 0.05);
    soft(g, f, w, 2.0, d, 0, 0.5, 0, 0.05);
    const n = 3, dw = (w - 0.1) / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 0.05 + dw * (i + 0.5);
      for (let k = 0; k < 8; k++) box(g, MAT.seam, 0.02, 1.7, 0.01, x - dw / 2 + 0.12 + (k * (dw - 0.24)) / 7, 0.65, d / 2 + 0.005);
      knob(g, x + (i === n - 1 ? -dw / 2 + 0.16 : dw / 2 - 0.16), 1.5, d / 2 + 0.05);
    }
    tableLamp(g, -w / 2 + 0.6, 2.5, -0.1); budVase(g, w / 2 - 0.55, 2.5, -0.1);
    soft(g, mat(0x395b64), 0.7, 0.08, 0.5, 0.2, 2.5, 0, 0.02); soft(g, CERAMIC_WARM, 0.5, 0.18, 0.5, 0.25, 2.58, 0, 0.08);
  } },
  counter:     { name: 'Kitchen counter', cat: 'Kitchen', w: 6, d: 2, fin: 'charcoal', resize: 'w', build: (g, f, w, d) => {
    box(g, MAT.dark, w, 0.3, d - 0.35, 0, 0, -0.17);
    soft(g, f, w, 2.58, d - 0.1, 0, 0.3, -0.05, 0.02);
    const n = Math.max(1, Math.round(w / 2)), dw = w / n, front = d / 2 - 0.08;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + dw * (i + 0.5);
      if (i === n - 1 && n > 1) [0, 0.82, 1.64].forEach(y => { soft(g, f, dw - 0.05, 0.77, 0.05, x, 0.34 + y, front, 0.02); barHandle(g, x, 0.34 + y + 0.62, front + 0.06, 0.6, false, CHROME); });
      else { soft(g, f, dw - 0.05, 2.46, 0.05, x, 0.34, front, 0.02); barHandle(g, x, 2.6, front + 0.06, 0.7, false, CHROME); }
    }
    soft(g, MAT.granite, w, 0.12, d + 0.05, 0, 2.88, 0.02, 0.02);
    box(g, texMat(0xe9e2d6, 'tile', 0.4, 0.003), w, 1.7, 0.04, 0, 3.0, -d / 2 + 0.02);   // tiled backsplash
  } },
  kitchenSink: { name: 'Kitchen sink', cat: 'Kitchen', w: 2.6, d: 1.7, fin: 'white', elev: 3.0, build: (g) => {
    soft(g, STEEL, 2.4, 0.05, 1.5, 0, 0, 0, 0.02);
    const bowl = mat(0x9a9ea2, { roughness: 0.3, metalness: 0.2 });
    soft(g, bowl, 1.05, 0.02, 1.05, -0.5, 0.04, 0.1, 0.06); soft(g, bowl, 0.62, 0.02, 1.05, 0.45, 0.04, 0.1, 0.06);
    [-0.5, 0.45].forEach(x => cyl(g, MAT.dark, 0.06, 0.06, 0.01, x, 0.065, 0.1, 14));
    cyl(g, CHROME, 0.06, 0.07, 0.95, 0, 0.02, -0.6, 14);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 10, 24, Math.PI), CHROME); arc.position.set(0, 0.97, -0.35); arc.rotation.y = Math.PI / 2; g.add(arc);
    cyl(g, CHROME, 0.04, 0.04, 0.15, 0, 0.82, -0.1, 10);
    soft(g, mat(0xe8c04a, { roughness: 0.9 }), 0.28, 0.1, 0.18, 0.95, 0.05, -0.5, 0.03);
  } },
  hob:         { name: 'Gas hob', cat: 'Kitchen', w: 2.2, d: 1.7, fin: 'charcoal', elev: 3.0, build: (g) => {
    soft(g, MAT.screen, 2.2, 0.05, 1.6, 0, 0, 0, 0.03);
    [[-0.5, -0.35, 0.24], [0.5, -0.35, 0.2], [-0.5, 0.35, 0.2], [0.5, 0.35, 0.26]].forEach(([a, b, r]) => {
      cyl(g, mat(0x4a4a4a, { metalness: 0.2, roughness: 0.5 }), r, r, 0.04, a, 0.05, b, 24);
      cyl(g, MAT.dark, r * 0.45, r * 0.45, 0.07, a, 0.06, b, 20);
      soft(g, MAT.dark, r * 2.4, 0.04, 0.04, a, 0.12, b, 0.01); soft(g, MAT.dark, 0.04, 0.04, r * 2.4, a, 0.12, b, 0.01);
    });
    [-0.75, -0.25, 0.25, 0.75].forEach(x => cyl(g, CHROME, 0.06, 0.06, 0.06, x, 0.05, 0.7, 14));
    lathe(g, mat(0xb8432e, { roughness: 0.35 }), [[0, 0], [0.24, 0], [0.27, 0.15], [0.23, 0.38], [0.1, 0.48], [0.05, 0.52], [0, 0.52]], -0.5, 0.16, 0.35, 24);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 20, Math.PI), MAT.dark); hd.position.set(-0.5, 0.66, 0.35); g.add(hd);
  } },
  wallCabinet: { name: 'Overhead cabinet', cat: 'Kitchen', w: 6, d: 1.1, fin: 'white', resize: 'w', elev: 5.0, build: (g, f, w, d) => {
    soft(g, f, w, 2.2, d - 0.05, 0, 0, -0.025, 0.02);
    const n = Math.max(1, Math.round(w / 1.5)), dw = w / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + dw * (i + 0.5);
      soft(g, f, dw - 0.04, 2.12, 0.05, x, 0.04, d / 2 - 0.02, 0.02);
      barHandle(g, x + (i % 2 ? -dw / 2 + 0.25 : dw / 2 - 0.25), 0.12, d / 2 + 0.03, 0.4, false, CHROME);
    }
  } },
  tallUnit:    { name: 'Tall pantry', cat: 'Kitchen', w: 2, d: 2, fin: 'charcoal', build: (g, f, w, d) => {
    soft(g, f, w, 7, d - 0.05, 0, 0, -0.025, 0.02);
    const fr = d / 2 - 0.02;
    soft(g, f, w - 0.06, 2.6, 0.05, 0, 0.25, fr, 0.02); barHandle(g, -w / 2 + 0.2, 1.9, fr + 0.06, 0.8, true, CHROME);
    soft(g, MAT.screen, w - 0.2, 1.25, 0.06, 0, 2.95, fr + 0.01, 0.03); barHandle(g, 0, 4.05, fr + 0.08, w - 0.5, false, CHROME);   // oven
    soft(g, MAT.screen, w - 0.2, 0.9, 0.06, 0, 4.35, fr + 0.01, 0.03);                                                            // microwave
    soft(g, f, w - 0.06, 1.55, 0.05, 0, 5.35, fr, 0.02); barHandle(g, -w / 2 + 0.2, 5.5, fr + 0.06, 0.5, true, CHROME);
  } },
  fridge:      { name: 'Fridge', cat: 'Kitchen', w: 2.5, d: 2.3, fin: 'white', build: (g, f, w, d) => {
    soft(g, f, w, 6, d - 0.1, 0, 0, -0.05, 0.08);
    const fr = d / 2 - 0.04;
    soft(g, f, w / 2 - 0.03, 3.9, 0.08, -w / 4, 2.0, fr, 0.04); soft(g, f, w / 2 - 0.03, 3.9, 0.08, w / 4, 2.0, fr, 0.04);
    soft(g, f, w - 0.04, 1.85, 0.08, 0, 0.1, fr, 0.04);
    [-1, 1].forEach(s => soft(g, CHROME, 0.06, 1.6, 0.08, s * 0.12, 3.0, fr + 0.08, 0.03));
    soft(g, CHROME, 1.4, 0.06, 0.08, 0, 1.75, fr + 0.08, 0.03);
    soft(g, MAT.screen, 0.45, 0.6, 0.02, -w / 4, 3.4, fr + 0.05, 0.03);
  } },
  island:      { name: 'Kitchen island', cat: 'Kitchen', w: 5, d: 3, fin: 'white', build: (g, f, w, d) => {
    box(g, MAT.dark, w - 0.4, 0.3, d - 0.4);
    soft(g, f, w - 0.1, 2.58, d - 0.6, 0, 0.3, -0.25, 0.02);
    const n = Math.max(2, Math.round(w / 1.6)), dw = (w - 0.1) / n;
    for (let i = 0; i < n; i++) { const x = -w / 2 + 0.05 + dw * (i + 0.5); soft(g, f, dw - 0.05, 2.4, 0.05, x, 0.36, -0.25 - (d - 0.6) / 2 - 0.02, 0.02); }
    soft(g, MAT.granite, w + 0.3, 0.12, d + 0.1, 0, 2.88, 0, 0.03);
    potWithPlant(g, CERAMIC_WARM, w / 2 - 0.6, 3.0, -0.4, 0.45); soft(g, fin('walnut'), 1.2, 0.08, 0.7, -0.6, 3.0, 0, 0.03);
  } },
  barStool:    { name: 'Bar stool', cat: 'Kitchen', w: 1.3, d: 1.3, fin: 'oak', build: (g, f) => {
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Group(); p.rotation.y = -(Math.PI / 4 + (i * Math.PI) / 2); g.add(p);
      const leg = cyl(p, f, 0.04, 0.05, 2.35, 0, 0, 0, 8); leg.position.set(0.33, 1.17, 0); leg.rotation.z = 0.12;
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 32), MAT.dark); ring.rotation.x = Math.PI / 2; ring.position.y = 0.85; g.add(ring);
    cyl(g, f, 0.62, 0.55, 0.12, 0, 2.3, 0, 32); cyl(g, SEAT_PAD, 0.57, 0.6, 0.08, 0, 2.42, 0, 32);
  } },
  wc:          { name: 'Toilet (WC)', cat: 'Bath & utility', w: 1.4, d: 2.3, fin: 'white', build: (g, f, w, d) => {
    const bowl = lathe(g, MAT.ceramic, [[0, 0], [0.3, 0], [0.33, 0.4], [0.48, 0.85], [0.6, 1.18], [0.6, 1.22], [0, 1.22]], 0, 0, 0.15, 32); bowl.scale.z = 1.35;
    const seat = cyl(g, mat(0xf4f3ef, { roughness: 0.3 }), 0.62, 0.62, 0.07, 0, 1.22, 0.15, 32); seat.scale.z = 1.35;
    soft(g, MAT.ceramic, 1.3, 1.25, 0.55, 0, 1.0, -d / 2 + 0.3, 0.12);
    cyl(g, CHROME, 0.1, 0.1, 0.03, 0, 2.25, -d / 2 + 0.3, 20);
  } },
  basin:       { name: 'Wash basin', cat: 'Bath & utility', w: 2, d: 1.6, fin: 'white', build: (g, f, w, d) => {
    soft(g, f, w, 1.4, d - 0.1, 0, 1.25, -0.05, 0.04);                                    // wall-hung vanity
    [-1, 1].forEach(s => { soft(g, f, w / 2 - 0.04, 1.32, 0.05, (s * w) / 4, 1.29, d / 2 - 0.08, 0.02); barHandle(g, s * 0.12, 2.25, d / 2 - 0.02, 0.35, true, CHROME); });
    soft(g, MAT.granite, w + 0.05, 0.08, d + 0.02, 0, 2.65, 0, 0.02);
    lathe(g, MAT.ceramic, [[0, 0], [0.3, 0], [0.45, 0.12], [0.5, 0.36], [0.46, 0.38], [0.4, 0.16], [0, 0.12]], 0, 2.73, 0.1, 32);
    cyl(g, CHROME, 0.045, 0.05, 0.85, 0, 2.73, -d / 2 + 0.25, 14); soft(g, CHROME, 0.06, 0.06, 0.42, 0, 3.52, -d / 2 + 0.44, 0.02);
    soft(g, f, w - 0.1, 2.2, 0.08, 0, 3.65, -d / 2 + 0.04, 0.14); soft(g, MIRROR, w - 0.3, 2.0, 0.03, 0, 3.75, -d / 2 + 0.09, 0.12);
    cyl(g, mat(0xb9a382, { roughness: 0.3 }), 0.08, 0.09, 0.3, w / 2 - 0.25, 2.73, -0.2, 14);
    potWithPlant(g, CERAMIC_WARM, -w / 2 + 0.25, 2.73, -0.25, 0.28);
  } },
  shower:      { name: 'Shower area', cat: 'Bath & utility', w: 3, d: 3, fin: 'white', resize: 'wd', build: (g, f, w, d) => {
    soft(g, MAT.ceramic, w, 0.12, d, 0, 0, 0, 0.03);
    soft(g, MAT.dark, Math.min(1.6, w * 0.6), 0.02, 0.1, 0, 0.12, -d / 2 + 0.3, 0.01);   // linear drain
    box(g, MAT.showerGlass, w - 0.1, 6.4, 0.04, 0, 0.12, d / 2 - 0.04);
    soft(g, CHROME, w, 0.06, 0.06, 0, 6.5, d / 2 - 0.04, 0.02); soft(g, CHROME, 0.06, 6.4, 0.06, -w / 2 + 0.04, 0.12, d / 2 - 0.04, 0.02);
    soft(g, CHROME, 0.06, 0.06, 0.95, 0, 6.6, -d / 2 + 0.48, 0.02); cyl(g, CHROME, 0.38, 0.38, 0.04, 0, 6.52, -d / 2 + 0.95, 32);
    soft(g, CHROME, 0.38, 0.38, 0.05, 0, 3.6, -d / 2 + 0.03, 0.06); cyl(g, CHROME, 0.08, 0.08, 0.14, 0, 3.72, -d / 2 + 0.1, 14);
    soft(g, THROW, 0.06, 1.3, 0.9, w / 2 - 0.05, 3.4, 0, 0.03);                            // towel on the side
  } },
  bathtub:     { name: 'Bathtub', cat: 'Bath & utility', w: 5.2, d: 2.5, fin: 'white', build: (g, f, w, d) => {
    soft(g, MAT.ceramic, w, 0.35, d, 0, 0, 0, 0.1);
    [-1, 1].forEach(s => { soft(g, MAT.ceramic, w, 1.5, 0.26, 0, 0.3, s * (d / 2 - 0.13), 0.12); soft(g, MAT.ceramic, 0.3, 1.5, d, s * (w / 2 - 0.15), 0.3, 0, 0.12); });
    soft(g, mat(0xd9e6ea, { roughness: 0.15 }), w - 0.55, 0.04, d - 0.5, 0, 1.35, 0, 0.15);
    soft(g, CHROME, 0.42, 0.08, 0.08, -w / 2 + 0.45, 1.85, 0, 0.03);
    soft(g, THROW, 0.9, 0.06, 0.5, w / 2 - 0.75, 1.8, d / 2 - 0.12, 0.02); soft(g, THROW, 0.9, 0.8, 0.05, w / 2 - 0.75, 1.05, d / 2 + 0.03, 0.02);
  } },
  washer:      { name: 'Washing machine', cat: 'Bath & utility', w: 2, d: 2, fin: 'white', build: (g, f, w, d) => {
    soft(g, f, w, 2.8, d, 0, 0, 0, 0.08);
    soft(g, mat(0xe6e4df), w - 0.1, 0.45, 0.04, 0, 2.25, d / 2 - 0.01, 0.03);
    soft(g, mat(0xd6d3cc), 0.55, 0.3, 0.05, -w / 2 + 0.4, 2.32, d / 2 + 0.01, 0.03);
    soft(g, MAT.screen, 0.4, 0.15, 0.02, 0.1, 2.4, d / 2 + 0.02, 0.02);
    const dial = cyl(g, CHROME, 0.14, 0.14, 0.06, 0, 0, 0, 20); dial.rotation.x = Math.PI / 2; dial.position.set(w / 2 - 0.4, 2.47, d / 2 + 0.03);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 12, 36), CHROME); ring.position.set(0, 1.2, d / 2 + 0.04); g.add(ring);
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.55, 36), mat(0x3d4b55, { roughness: 0.1, metalness: 0.3 })); win.position.set(0, 1.2, d / 2 + 0.03); g.add(win);
  } },
  utilitySink: { name: 'Utility sink unit', cat: 'Bath & utility', w: 2.2, d: 1.9, fin: 'white', build: (g, f, w, d) => {
    soft(g, f, w, 2.8, d - 0.1, 0, 0, -0.05, 0.03);
    [-1, 1].forEach(s => { soft(g, f, w / 2 - 0.04, 2.45, 0.05, (s * w) / 4, 0.2, d / 2 - 0.08, 0.02); barHandle(g, s * 0.12, 2.1, d / 2 - 0.02, 0.4, true, CHROME); });
    soft(g, MAT.granite, w, 0.1, d, 0, 2.8, 0, 0.02);
    soft(g, STEEL, 1.5, 0.04, 1.15, 0, 2.88, 0.1, 0.06); soft(g, mat(0x9a9ea2, { metalness: 0.2, roughness: 0.3 }), 1.3, 0.02, 0.95, 0, 2.9, 0.1, 0.08);
    cyl(g, CHROME, 0.04, 0.04, 0.9, 0, 2.9, -d / 2 + 0.2, 12); soft(g, CHROME, 0.06, 0.06, 0.4, 0, 3.75, -d / 2 + 0.38, 0.02);
    lathe(g, mat(0x5a8fb0, { roughness: 0.5 }), [[0, 0], [0.32, 0], [0.4, 0.75], [0.36, 0.75], [0, 0.05]], w / 2 + 0.45, 0, 0.2, 24);   // a bucket beside it
  } },
  pujaUnit:    { name: 'Puja unit', cat: 'Balcony & puja', w: 2.5, d: 1.4, fin: 'walnut', build: (g, f, w, d) => {
    soft(g, f, w, 2.2, d, 0, 0, 0, 0.04);
    [-1, 1].forEach(s => { soft(g, f, w / 2 - 0.05, 1.8, 0.05, (s * w) / 4, 0.2, d / 2, 0.02); knob(g, s * 0.12, 1.2, d / 2 + 0.05); });
    soft(g, f, w + 0.1, 0.12, d + 0.05, 0, 2.2, 0, 0.03);
    soft(g, f, w - 0.1, 2.3, 0.12, 0, 2.32, -d / 2 + 0.08, 0.04);
    soft(g, BRASS, w * 0.55, 1.6, 0.03, 0, 2.55, -d / 2 + 0.15, 0.3);                     // golden arch backdrop
    [-1, 1].forEach(s => [-1, 1].forEach(t => cyl(g, f, 0.07, 0.07, 2.2, s * (w / 2 - 0.15), 2.32, t * (d / 2 - 0.2), 12)));
    soft(g, f, w + 0.1, 0.15, d + 0.05, 0, 4.52, 0, 0.04);
    soft(g, f, w * 0.7, 0.18, d * 0.7, 0, 4.67, 0, 0.05); soft(g, f, w * 0.45, 0.18, d * 0.45, 0, 4.85, 0, 0.05);
    lathe(g, BRASS, [[0, 0], [0.22, 0], [0.2, 0.18], [0.09, 0.36], [0.03, 0.5], [0, 0.56]], 0, 5.03, 0, 20);
    lathe(g, BRASS, [[0, 0], [0.18, 0], [0.14, 0.2], [0.18, 0.45], [0.1, 0.65], [0.12, 0.8], [0, 0.9]], 0, 2.32, -0.15, 18);   // idol
    lathe(g, BRASS, [[0, 0], [0.1, 0], [0.13, 0.06], [0, 0.04]], -0.5, 2.32, 0.25, 16);                                      // diya
    ball(g, mat(0xffb347, { emissive: 0xff8a00, emissiveIntensity: 0.8 }), 0.04, -0.5, 2.42, 0.25);
    [-1, 1].forEach(s => { cyl(g, BRASS, 0.01, 0.01, 0.5, s * 0.55, 3.95, 0.25, 6); lathe(g, BRASS, [[0, 0], [0.09, 0], [0.07, 0.12], [0.03, 0.18], [0, 0.18]], s * 0.55, 3.78, 0.25, 16); });
    const marigold = [mat(0xf29a1f, { roughness: 0.8 }), mat(0xf6c33a, { roughness: 0.8 })];
    for (let t = 0; t <= 16; t++) ball(g, marigold[t % 2], 0.07, -w / 2 + 0.2 + (t * (w - 0.4)) / 16, 4.35 - Math.sin((Math.PI * t) / 16) * 0.45, d / 2 - 0.15);
  } },
  /* Foyer pieces */
  slatPartition: { name: 'Slatted partition', cat: 'Foyer', w: 3.4, d: 0.4, fin: 'oak', resize: 'w', build: (g, f, w, d) => {
    const H = 7.2; soft(g, f, w, 0.3, d, 0, 0, 0, 0.03); soft(g, f, w, 0.14, d, 0, H - 0.14, 0, 0.03);
    const n = Math.max(3, Math.floor(w / 0.27)); const step = (w - 0.12) / (n - 1);
    for (let i = 0; i < n; i++) box(g, f, 0.11, H - 0.44, d * 0.62, -w / 2 + 0.06 + i * step, 0.3, 0);
    // a trailing plant on the base for some life
    cyl(g, fin('white'), 0.28, 0.22, 0.45, w / 2 - 0.45, 0.3, 0.35, 18); ball(g, MAT.leaf, 0.38, w / 2 - 0.45, 1.05, 0.35); ball(g, MAT.leaf2, 0.26, w / 2 - 0.3, 1.25, 0.45);
  } },
  helmetRack:  { name: 'Helmet & key rack', cat: 'Foyer', w: 3, d: 0.7, fin: 'walnut', build: (g, f, w, d) => {
    const back = -d / 2;
    soft(g, f, w, 0.6, 0.08, 0, 4.85, back + 0.04, 0.03);                       // wall board
    soft(g, f, w, 0.07, 0.55, 0, 5.5, back + 0.28, 0.02);                       // small shelf for keys and wallets
    box(g, mat(0xd9cbb0), 0.5, 0.12, 0.35, -w / 2 + 0.5, 5.57, back + 0.3);      // key tray
    const pegs = [-1.05, -0.35, 0.35, 1.05].map(p => p * (w / 3));
    pegs.forEach(px => { const p = cyl(g, MAT.metal, 0.04, 0.04, 0.35, px, 0, 0, 10); p.rotation.x = Math.PI / 2; p.position.set(px, 5.12, back + 0.25); });
    const helmet = (px, col) => {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(col, { roughness: 0.35, side: THREE.DoubleSide }));
      shell.scale.set(1, 1.05, 1.12); shell.position.set(px, 4.55, back + 0.5); g.add(shell);
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.47, 28, 8, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.36, Math.PI * 0.2), mat(0x1b1d22, { roughness: 0.15, metalness: 0.3, side: THREE.DoubleSide }));
      visor.scale.copy(shell.scale); visor.position.copy(shell.position); g.add(visor);
    };
    helmet(pegs[0], 0xb3362c); helmet(pegs[1], 0x2a2a2c);
    soft(g, mat(0x6f8a9a), 0.75, 1.1, 0.18, pegs[3], 4.1, back + 0.32, 0.08);   // a tote bag on the last peg
    box(g, MAT.metal, 0.08, 0.3, 0.03, pegs[2], 4.8, back + 0.36);              // keys
  } },
  shoeBench:   { name: 'Shoe bench', cat: 'Foyer', w: 2.6, d: 1.3, fin: 'oak', build: (g, f, w, d) => {
    soft(g, f, 0.1, 1.45, d, -w / 2 + 0.05, 0, 0, 0.03); soft(g, f, 0.1, 1.45, d, w / 2 - 0.05, 0, 0, 0.03);
    soft(g, f, w, 0.1, d, 0, 0.3, 0, 0.02); soft(g, f, w, 0.1, d, 0, 1.35, 0, 0.03);
    soft(g, SEAT_PAD, w - 0.12, 0.18, d - 0.1, 0, 1.45, 0, 0.08);
    const shoe = (x, z, col) => { soft(g, mat(col), 0.32, 0.24, 0.9, x, 0.4, z, 0.1); };
    shoe(-0.8, 0.05, 0x3a2c22); shoe(-0.42, 0.05, 0x3a2c22); shoe(0.25, 0.1, 0xd9d4ca); shoe(0.62, 0.1, 0xd9d4ca);
  } },
  doormat:     { name: 'Door mat', cat: 'Foyer', w: 3, d: 1.8, fin: 'clay', resize: 'wd', build: (g, f, w, d) => {
    soft(g, COIR, w, 0.06, d, 0, 0, 0, 0.02);
    const B = mat(0x6b4a2c, { roughness: 1 });
    [-1, 1].forEach(s => { box(g, B, w - 0.2, 0.01, 0.1, 0, 0.06, s * (d / 2 - 0.15)); box(g, B, 0.1, 0.01, d - 0.2, s * (w / 2 - 0.15), 0.06, 0); });
  } },
  shoeRack:    { name: 'Shoe cabinet', cat: 'Foyer', w: 3.5, d: 1.1, fin: 'white', build: (g, f, w, d) => {
    legs4(g, fin('oak'), w, d, 0.3, 0.15, 0.05, 0.04);
    soft(g, f, w, 2.7, d, 0, 0.3, 0, 0.04);
    [-1, 1].forEach(s => {
      for (let k = 0; k < 11; k++) box(g, MAT.seam, w / 2 - 0.3, 0.025, 0.01, (s * w) / 4, 0.48 + k * 0.21, d / 2 + 0.005);
      knob(g, s * 0.14, 1.7, d / 2 + 0.05);
    });
    lathe(g, CERAMIC_WARM, [[0, 0], [0.2, 0], [0.26, 0.1], [0.24, 0.12], [0, 0.04]], -w / 2 + 0.5, 3.0, 0, 20);   // key bowl
    potWithPlant(g, fin('clay'), w / 2 - 0.45, 3.0, 0, 0.42);
  } },
  bistroTable: { name: 'Bistro table', cat: 'Balcony & puja', w: 2, d: 2, fin: 'charcoal', build: (g, f) => {
    cyl(g, f, 0.95, 0.95, 0.06, 0, 2.3, 0, 36);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.03, 8, 40), f); rim.rotation.x = Math.PI / 2; rim.position.y = 2.33; g.add(rim);
    cyl(g, f, 0.05, 0.05, 2.3, 0, 0, 0, 12);
    for (let i = 0; i < 3; i++) { const p = new THREE.Group(); p.rotation.y = (i * 2 * Math.PI) / 3; g.add(p); soft(p, f, 0.7, 0.06, 0.1, 0.35, 0, 0, 0.03); }
    potWithPlant(g, fin('clay'), 0.3, 2.36, -0.2, 0.35);
    cyl(g, MAT.ceramic, 0.1, 0.09, 0.18, -0.3, 2.36, 0.25, 16); cyl(g, MAT.ceramic, 0.1, 0.09, 0.18, -0.45, 2.36, -0.1, 16);
  } },
  balconyChair:{ name: 'Balcony chair', cat: 'Balcony & puja', w: 1.6, d: 1.6, fin: 'charcoal', build: (g, f) => chair(g, f, 0, 0, 0, PILLOWS[0]) },
  swing:       { name: 'Swing chair', cat: 'Balcony & puja', w: 3, d: 3, fin: 'oak', build: (g, f) => {
    cyl(g, MAT.dark, 1.1, 1.2, 0.12, 0, 0, 0, 32);
    soft(g, MAT.dark, 0.14, 6.2, 0.14, 0, 0.1, -1.15, 0.05); soft(g, MAT.dark, 0.14, 0.14, 1.25, 0, 6.2, -0.55, 0.05);
    cyl(g, CHROME, 0.025, 0.025, 1.7, 0, 4.45, 0, 8);
    const egg = new THREE.Mesh(new THREE.SphereGeometry(1.15, 30, 22, Math.PI * 0.75, Math.PI * 1.5, Math.PI * 0.22, Math.PI * 0.72), RATTAN);
    egg.position.set(0, 3.15, 0); egg.scale.set(1, 1.15, 1); g.add(egg);
    cyl(g, SEAT_PAD, 0.85, 0.9, 0.25, 0, 2.15, 0.05, 28);
    const p = soft(g, PILLOWS[0], 1.1, 1.0, 0.35, 0, 2.45, -0.6, 0.15); p.rotation.x = -0.3;
  } },
};
const CAT_ORDER = ['Foyer', 'Bedroom', 'Living', 'Dining', 'Kitchen', 'Bath & utility', 'Balcony & puja'];

/* ---------- State ---------- */
let state = loadState() || sampleState();
let undoStack = [];
let mode = 'select', view = 'iso';
let wallH = 6.5, fullH = 10, reveal = 'low', showLabels = true, showFurniture = true;
let look = 'illustrated', showDims = true;
try { const lk = JSON.parse(localStorage.getItem(STORE_KEY + '-look2') || 'null'); if (lk) { look = ['technical', 'illustrated'].includes(lk.look) ? lk.look : 'illustrated'; showDims = lk.dims !== false; } } catch (e) { /* ignore */ }
let selection = null; // {kind:'item', id} | {kind:'opening', idx} | {kind:'wall', idx}
const PAINTS = {
  white:    { name: 'Warm white',  hex: 0xf1e8d8, css: '#f1e8d8' },
  putty:    { name: 'Putty',       hex: 0xe4d8c4, css: '#e4d8c4' },
  peach:    { name: 'Peach',       hex: 0xeac0a0, css: '#eac0a0' },
  terracotta: { name: 'Terracotta', hex: 0xc97c5d, css: '#c97c5d' },
  sage:     { name: 'Sage',        hex: 0xc4ccb4, css: '#c4ccb4' },
  tile:     { name: 'Wall tiles',  hex: 0xe9e2d6, css: 'repeating-linear-gradient(0deg,#e9e2d6 0 6px,#c9bfae 6px 7px),#e9e2d6', tex: 'tile' },
  slate:    { name: 'Slate',       hex: 0xb9bec3, css: '#b9bec3' },
  charcoal: { name: 'Charcoal',    hex: 0x5a5855, css: '#5a5855' }
};
/* Ink outlines for the illustrated look: every visible solid gets its creases drawn in brown ink. */
const INK = new THREE.LineBasicMaterial({ color: 0x4a3828, transparent: true, opacity: 0.78 });
const DIM_INK = new THREE.LineBasicMaterial({ color: 0x6b5440 });
const noRay = () => {};
function inkify(root, angle) {
  if (look === 'technical' || !root) return;
  const meshes = []; root.traverse(o => { if (o.isMesh && o.material !== PROXY) meshes.push(o); });
  meshes.forEach(m => {
    const mt = Array.isArray(m.material) ? m.material[0] : m.material;
    if (mt && mt.transparent && mt.opacity < 0.4) return;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, angle || 30), INK); e.raycast = noRay; m.add(e);
  });
}
function capMat() { return look !== 'technical' ? mat(0xf7f0e3, { roughness: 0.9 }) : MAT.wallTop; }
const KIND_NAMES = { ext: 'Outer wall', int: 'Inner wall', railing: 'Balcony railing' };
const itemObjs = new Map();
let selHelper = null;

function serialize() { return JSON.stringify({ walls: state.walls, openings: state.openings, items: state.items, labels: state.labels, baseFloor: state.baseFloor, nextId: state.nextId, migrations: state.migrations || { study2: true } }); }
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!Array.isArray(s.walls) || !Array.isArray(s.items)) return null;
    s.items = s.items.filter(it => CATALOG[it.type]);
    return migrate(s);
  } catch (e) { return null; }
}
function save() { try { localStorage.setItem(STORE_KEY, serialize()); } catch (e) { /* storage unavailable: keep working in memory */ } }
function pushUndo(snapshot) { undoStack.push(snapshot || serialize()); if (undoStack.length > 80) undoStack.shift(); }
function undo() {
  const prev = undoStack.pop();
  if (!prev) { setStatus('Nothing to undo.'); return; }
  state = JSON.parse(prev);
  selection = null; rebuildAll(); save(); setStatus('Undone.');
}

/* ---------- Structure: floor, walls, openings ---------- */
const V2 = (p) => new THREE.Vector2(p[0], p[1]);
function wallFrame(w) {
  const A = V2(w.a), B = V2(w.b); const dir = B.clone().sub(A); const L = dir.length(); dir.divideScalar(L || 1);
  return { A, B, dir, L, n: new THREE.Vector2(-dir.y, dir.x) };
}
function matchWall(op) {
  for (let i = 0; i < state.walls.length; i++) {
    const w = state.walls[i]; if (w.kind === 'railing') continue;
    const f = wallFrame(w); if (f.L < 0.01) continue;
    const ta = V2(op.a).sub(f.A), tb = V2(op.b).sub(f.A);
    const da = Math.abs(ta.x * f.n.x + ta.y * f.n.y), db = Math.abs(tb.x * f.n.x + tb.y * f.n.y);
    const pa = ta.dot(f.dir), pb = tb.dot(f.dir);
    if (da < 0.3 && db < 0.3 && Math.min(pa, pb) > -0.05 && Math.max(pa, pb) < f.L + 0.05) return { i, t0: Math.min(pa, pb), t1: Math.max(pa, pb), f };
  }
  return null;
}
/* Wall reveal: how tall each wall is drawn. A height set on the wall itself wins, except in "Down". */
const camXZ = () => new THREE.Vector2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
function isFarWall(f) {
  const mid = f.A.clone().add(f.dir.clone().multiplyScalar(f.L / 2));
  const c = camXZ(); if (c.lengthSq() < 0.01) return true;
  return mid.sub(new THREE.Vector2(CENTER.x, CENTER.z)).dot(c.normalize()) < -0.5;
}
function autoHeight(w, f) {
  if (reveal === 'full') return fullH;
  if (reveal === 'low') return wallH;
  return (w.kind === 'ext' && isFarWall(f)) ? fullH : wallH;
}
function wallHeight(w, f) {
  if (view === 'walk') return w.h != null ? w.h : fullH;
  if (reveal === 'down') return 0.35;
  return w.h != null ? w.h : autoHeight(w, f);
}
function wallThick(w) { return w.t || (w.kind === 'ext' ? 0.6 : 0.36); }
function sideMat(w, wi) {
  if (selection && selection.kind === 'wall' && selection.idx === wi) return mat(0xe9c79a, { roughness: 0.9 });
  const p = PAINTS[w.paint] || PAINTS.white;
  // plain matt paint; only the wall-tile finish carries a texture
  return p.tex ? texMat(p.hex, p.tex, 0.5, 0.004) : mat(p.hex, { roughness: 0.95 });
}
/* Simple wall linework: ink only the outline of each wall's top, no vertical seams where wall pieces meet. */
function inkTop(m) {
  if (look === 'technical') return;
  const edges = new THREE.EdgesGeometry(m.geometry, 20); const p = edges.attributes.position; const top = m.geometry.parameters.height / 2 - 1e-4;
  const keep = [];
  for (let i = 0; i < p.count; i += 2) if (p.getY(i) > top && p.getY(i + 1) > top) keep.push(p.getX(i), p.getY(i), p.getZ(i), p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1));
  edges.dispose();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  const l = new THREE.LineSegments(g, INK); l.raycast = noRay; m.add(l);
}
function wallPiece(parent, f, t0, t1, y0, y1, thick, userData, extendStart, extendEnd, side) {
  if (y1 - y0 < 0.01) return;
  const s = t0 - (extendStart ? thick / 2 : 0), e = t1 + (extendEnd ? thick / 2 : 0);
  const len = e - s; if (len < 0.01) return;
  const mid = f.A.clone().add(f.dir.clone().multiplyScalar((s + e) / 2));
  const S = side || MAT.wallSide;
  const m = new THREE.Mesh(scaleBoxUV(new THREE.BoxGeometry(len, y1 - y0, thick), len, y1 - y0, thick), [S, S, capMat(), S, S, S]);
  m.position.set(mid.x, (y0 + y1) / 2, mid.y);
  m.rotation.y = Math.atan2(-f.dir.y, f.dir.x);
  // Visible walls never cast shadows: how far they are cut away is only a viewing aid.
  // Shadows come from the invisible full-height walls and roof instead.
  m.castShadow = false; m.receiveShadow = true; m.userData = userData;
  parent.add(m); inkTop(m);
}
function orientedBox(parent, material, p0, p1, thick, y0, h, userData, casts) {
  const d = p1.clone().sub(p0); const len = d.length(); if (len < 0.01) return null;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), material);
  const mid = p0.clone().add(p1).multiplyScalar(0.5);
  m.position.set(mid.x, y0 + h / 2, mid.y); m.rotation.y = Math.atan2(-d.y, d.x);
  m.castShadow = !!casts; m.receiveShadow = true; if (userData) m.userData = userData;
  parent.add(m); return m;
}
const arcMat = new THREE.LineDashedMaterial({ color: 0x8a847a, dashSize: 0.3, gapSize: 0.2 });
const selArcMat = new THREE.LineDashedMaterial({ color: 0x93531a, dashSize: 0.3, gapSize: 0.15 });
function swingArc(parent, H, from, to, selected) {
  const a0 = Math.atan2(from.y - H.y, from.x - H.x); let a1 = Math.atan2(to.y - H.y, to.x - H.x);
  let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  const r = from.distanceTo(H); const pts = [];
  for (let i = 0; i <= 24; i++) { const a = a0 + (da * i) / 24; pts.push(new THREE.Vector3(H.x + Math.cos(a) * r, 0.04, H.y + Math.sin(a) * r)); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), selected ? selArcMat : arcMat);
  line.computeLineDistances(); parent.add(line);
}
function doorLeaf(parent, H, swingDir, len, material, ud, selected, wh) {
  const tip = H.clone().add(swingDir.clone().multiplyScalar(len));
  // the leaf is drawn cut to the visible wall height, but its shadow is the full 7 ft door
  inkify(orientedBox(parent, selected ? mat(0xf1e1cb) : material, H, tip, 0.13, 0.02, Math.min(DOOR_HEAD, Math.max(wh, 0.5)) - 0.05, ud, false));
  const shadowLeaf = orientedBox(proxyRoot, PROXY, H, tip, 0.13, 0.02, DOOR_HEAD - 0.05, null, true);
  return tip;
}

/* ---------- Daylight through windows ----------
   Sky light: every window, glass door and open railing is a light source. For each spot on the floor we add up
   the light from every point along those openings that it can actually see (walls block it, doors let it through),
   weighted by angle and distance. The result is baked into a light map on the floor, so rooms are bright by
   their windows, fall off towards the back, and light spills through open doorways into passages. */
let daylightTex = null, daylightBox = null, windowLight = 1.0;
function wallsBox() {
  if (state.baseFloor) { const xs = FOOTPRINT.map(p => p[0]), zs = FOOTPRINT.map(p => p[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; }
  if (!state.walls.length) return null;
  let a = [Infinity, Infinity, -Infinity, -Infinity];
  state.walls.forEach(w => [w.a, w.b].forEach(p => { a[0] = Math.min(a[0], p[0]); a[1] = Math.min(a[1], p[1]); a[2] = Math.max(a[2], p[0]); a[3] = Math.max(a[3], p[1]); }));
  return a;
}
function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}
function bakeDaylight() {
  const box = wallsBox(); if (!box) { daylightTex = null; return; }
  const [minX, minZ, maxX, maxZ] = box; const res = 0.3;
  const W = Math.max(2, Math.ceil((maxX - minX) / res)), H = Math.max(2, Math.ceil((maxZ - minZ) / res));
  // light sources: sample points along each opening
  const src = [];
  // Daylight arrives through every opening, but openings facing the sun's side get more of it,
  // and the lower the sun, the stronger that bias.
  const sd = sunH; const sunDeg = sunElev;
  const sunBias = 1.9 * (1 - (sunDeg - 10) / 130);
  const cxB = (box[0] + box[2]) / 2, czB = (box[1] + box[3]) / 2;
  lightGeo.src.forEach(([a, b]) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.1) return;
    const n = Math.max(2, Math.ceil(L / 0.5)), nx = -dz / L, nz = dx / L;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; const out = (mx - cxB) * nx + (mz - czB) * nz >= 0 ? 1 : -1;
    const facing = Math.max(0, (nx * out) * sd[0] + (nz * out) * sd[1]);
    const strength = 1 + sunBias * facing;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; src.push(a[0] + dx * t, a[1] + dz * t, nx, nz, (L / n) * strength); }
  });
  const occ = new Float64Array(lightGeo.occ.length * 4);
  lightGeo.occ.forEach((s, i) => { occ[i * 4] = s[0][0]; occ[i * 4 + 1] = s[0][1]; occ[i * 4 + 2] = s[1][0]; occ[i * 4 + 3] = s[1][1]; });
  const nOcc = lightGeo.occ.length;
  const val = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const px = minX + (i + 0.5) * res, pz = minZ + (j + 0.5) * res;
    if (state.baseFloor && !inPoly(px, pz, FOOTPRINT)) continue;
    let sum = 0;
    for (let s = 0; s < src.length; s += 5) {
      const sx = src[s], sz = src[s + 1];
      const rx = sx - px, rz = sz - pz; const d2 = rx * rx + rz * rz; if (d2 > 1600 || d2 < 1e-4) continue;
      const d = Math.sqrt(d2); const cos = Math.abs(rx * src[s + 2] + rz * src[s + 3]) / d; if (cos < 0.04) continue;
      let blocked = false;
      for (let k = 0; k < nOcc; k++) {
        const ax = occ[k * 4], az = occ[k * 4 + 1], bx = occ[k * 4 + 2], bz = occ[k * 4 + 3];
        const ex = bx - ax, ez = bz - az; const den = rx * ez - rz * ex; if (Math.abs(den) < 1e-9) continue;
        const qx = ax - px, qz = az - pz;
        const t = (qx * ez - qz * ex) / den, u = (qx * rz - qz * rx) / den;
        if (t > 0.0005 && t < 0.985 && u >= 0 && u <= 1) { blocked = true; break; }
      }
      if (!blocked) sum += (src[s + 4] * cos) / (d + 1.2);
    }
    val[j * W + i] = sum;
  }
  // soften, then scale so the brighter floor near windows reads as full daylight
  for (let pass = 0; pass < 2; pass++) {
    const copy = val.slice();
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let s = 0, c = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < W && y < H && copy[y * W + x] > 0) { s += copy[y * W + x]; c++; } }
      if (copy[j * W + i] > 0) val[j * W + i] = s / c;
    }
  }
  const p92 = arr => { const s = Array.from(arr).filter(v => v > 0).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length * 0.92)] || 1 : 1; };
  const ref = p92(val);
  const direct = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) direct[k] = Math.min(1.2, Math.pow(val[k] / ref, 0.8));

  /* Bounce light. Sunlit and sky-lit floor and walls reflect light back into the room, which then reflects again.
     On a coarser 0.9 ft grid, light keeps spreading to neighbouring cells unless a wall stands between them,
     so it fills each room evenly and leaks through doorways, but never through solid walls. */
  const S = 3, CW = Math.ceil(W / S), CH = Math.ceil(H / S), cres = res * S;
  const cDirect = new Float32Array(CW * CH), cMask = new Uint8Array(CW * CH);
  for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
    const px = minX + (i + 0.5) * cres, pz = minZ + (j + 0.5) * cres;
    cMask[j * CW + i] = (!state.baseFloor || inPoly(px, pz, FOOTPRINT)) ? 1 : 0;
    let s = 0, n = 0;
    for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) { const x = i * S + a, y = j * S + b; if (x < W && y < H) { s += direct[y * W + x]; n++; } }
    cDirect[j * CW + i] = n ? s / n : 0;
  }
  const crosses = (x1, z1, x2, z2) => {
    const rx = x2 - x1, rz = z2 - z1;
    for (let k = 0; k < nOcc; k++) {
      const ax = occ[k * 4], az = occ[k * 4 + 1], ex = occ[k * 4 + 2] - ax, ez = occ[k * 4 + 3] - az;
      const den = rx * ez - rz * ex; if (Math.abs(den) < 1e-9) continue;
      const qx = ax - x1, qz = az - z1; const t = (qx * ez - qz * ex) / den, u = (qx * rz - qz * rx) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
    }
    return false;
  };
  const openR = new Uint8Array(CW * CH), openD = new Uint8Array(CW * CH);
  for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
    const k = j * CW + i; if (!cMask[k]) continue;
    const px = minX + (i + 0.5) * cres, pz = minZ + (j + 0.5) * cres;
    if (i + 1 < CW && cMask[k + 1] && !crosses(px, pz, px + cres, pz)) openR[k] = 1;
    if (j + 1 < CH && cMask[k + CW] && !crosses(px, pz, px, pz + cres)) openD[k] = 1;
  }
  let bnc = new Float32Array(CW * CH);
  for (let it = 0; it < 160; it++) {
    const next = new Float32Array(CW * CH);
    for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
      const k = j * CW + i; if (!cMask[k]) continue;
      let s = bnc[k], n = 1;
      if (openR[k]) { s += bnc[k + 1]; n++; }
      if (i > 0 && openR[k - 1]) { s += bnc[k - 1]; n++; }
      if (openD[k]) { s += bnc[k + CW]; n++; }
      if (j > 0 && openD[k - CW]) { s += bnc[k - CW]; n++; }
      next[k] = 0.985 * (s / n) + cDirect[k];
    }
    bnc = next;
  }
  const bref = p92(bnc);
  const bounce = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    // bilinear upsample from the coarse grid
    const fx = Math.max(0, Math.min(CW - 1.001, (i + 0.5) / S - 0.5)), fz = Math.max(0, Math.min(CH - 1.001, (j + 0.5) / S - 0.5));
    const x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
    const at = (x, z) => { const k = z * CW + x; return cMask[k] ? bnc[k] : bnc[z0 * CW + x0]; };
    const x1 = Math.min(CW - 1, x0 + 1), z1 = Math.min(CH - 1, z0 + 1);
    const v = (at(x0, z0) * (1 - tx) + at(x1, z0) * tx) * (1 - tz) + (at(x0, z1) * (1 - tx) + at(x1, z1) * tx) * tz;
    bounce[j * W + i] = v / bref;
  }
  lastBake = { W, H, direct, bounce, box };
  composeDaylight();
}
let lastBake = null, bounceAmt = 1.0, dayCanvas = null, aoCanvas = null, aoTex = null;
/* Contact shadows from daylight. Under a roof the sun only reaches the window patches, but the soft sky and
   bounce light are blocked by furniture too: dark right underneath a piece, fading out over about a foot around it.
   Taller, solid pieces (wardrobes, beds, sofas) block more than open ones (tables on legs, chairs). */
const AO_STRENGTH = {
  wardrobe: 0.72, tallUnit: 0.7, fridge: 0.68, bookshelf: 0.62, dresser: 0.6, sideboard: 0.6, counter: 0.62, island: 0.6, shoeRack: 0.55, tvUnit: 0.3, wallTV: 0, slatPartition: 0.3, helmetRack: 0, shoeBench: 0.38, doormat: 0,
  queenBed: 0.6, kingBed: 0.6, singleBed: 0.58, bunkBed: 0.55, sofa3: 0.58, loveseat: 0.58, lSofa: 0.58, armchair: 0.52, bathtub: 0.6,
  sofaArmless: 0.56, sofaArmL: 0.56, sofaArmR: 0.56, sofaCorner: 0.58, sofaOttoman: 0.5,
  washer: 0.55, utilitySink: 0.5, basin: 0.45, wc: 0.4, pujaUnit: 0.55, bedside: 0.45,
  desk: 0.3, coffeeTable: 0.32, roundCoffee: 0.32, dining4: 0.36, dining6: 0.36, dining6Bench: 0.4, roundDining: 0.36, diningChair: 0.26, deskChair: 0.24,
  barStool: 0.2, bistroTable: 0.24, balconyChair: 0.26, plant: 0.32, floorLamp: 0.15, swing: 0.3, shower: 0.12,
  wallCabinet: 0.12, rug: 0, kitchenSink: 0, hob: 0
};
function computeAO(W, H, box) {
  const res = (box[2] - box[0]) / W, resz = (box[3] - box[1]) / H;
  const keep = new Float32Array(W * H).fill(1);
  if (!showFurniture) return keep;
  state.items.forEach(it => {
    const k = AO_STRENGTH[it.type] != null ? AO_STRENGTH[it.type] : 0.45; if (k <= 0) return;
    const { w, d } = dims(it); const c = Math.cos(it.rot || 0), s = Math.sin(it.rot || 0);
    const reach = Math.hypot(w, d) / 2 + 1.6;
    const i0 = Math.max(0, Math.floor((it.x - reach - box[0]) / res)), i1 = Math.min(W - 1, Math.ceil((it.x + reach - box[0]) / res));
    const j0 = Math.max(0, Math.floor((it.z - reach - box[1]) / resz)), j1 = Math.min(H - 1, Math.ceil((it.z + reach - box[1]) / resz));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = box[0] + (i + 0.5) * res - it.x, dz = box[1] + (j + 0.5) * resz - it.z;
      const lx = c * dx - s * dz, lz = s * dx + c * dz;
      const ox = Math.max(Math.abs(lx) - w / 2, 0), oz = Math.max(Math.abs(lz) - d / 2, 0);
      const dist = Math.hypot(ox, oz);
      let occ;
      if (dist === 0) { const edge = Math.min(w / 2 - Math.abs(lx), d / 2 - Math.abs(lz)); occ = k * (0.78 + 0.22 * Math.min(1, edge / 0.8)); }
      else occ = k * 0.72 * Math.exp(-dist / 0.5);
      keep[j * W + i] *= 1 - occ;
    }
  });
  return keep;
}
/* Final light map = (direct window light + reflected light + a small floor so nothing goes fully black) × furniture shadow. */
function composeDaylight() {
  if (!lastBake) return;
  const { W, H, direct, bounce, box } = lastBake;
  const ao = computeAO(W, H, box);
  const fresh = !dayCanvas || dayCanvas.width !== W || dayCanvas.height !== H || daylightBox !== box;
  if (fresh) {
    dayCanvas = document.createElement('canvas'); dayCanvas.width = W; dayCanvas.height = H;
    aoCanvas = document.createElement('canvas'); aoCanvas.width = W; aoCanvas.height = H;
  }
  const g = dayCanvas.getContext('2d'); const img = g.createImageData(W, H); const aoImg = g.createImageData(W, H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i;
    // the fill light and sky already reach the floor, so the light map only adds the window-driven variation
    const v = Math.min(0.75, direct[k] * 0.42 + bounce[k] * 0.18 * bounceAmt);
    const o = ((H - 1 - j) * W + i) * 4;
    img.data[o] = 255 * v; img.data[o + 1] = 246 * v; img.data[o + 2] = 230 * v; img.data[o + 3] = 255;
    const a = 255 * ao[k]; aoImg.data[o] = a; aoImg.data[o + 1] = a; aoImg.data[o + 2] = a; aoImg.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  aoCanvas.getContext('2d').putImageData(aoImg, 0, 0);
  if (fresh || !daylightTex) {
    if (daylightTex) daylightTex.dispose(); if (aoTex) aoTex.dispose();
    daylightTex = new THREE.CanvasTexture(dayCanvas); daylightTex.magFilter = THREE.LinearFilter; daylightBox = box;
    aoTex = new THREE.CanvasTexture(aoCanvas); aoTex.magFilter = THREE.LinearFilter;
  } else { daylightTex.needsUpdate = true; aoTex.needsUpdate = true; }
  hemi.intensity = 0.46 + 0.14 * bounceAmt;
  fill.intensity = 0.2 + 0.08 * bounceAmt;
  return fresh;
}
/* Watch the furniture and refresh its floor shadows whenever a piece moves, turns, resizes or is added. */
let aoKey = '', aoLast = 0;
function watchFurnitureShadows(now) {
  if (!lastBake || now - aoLast < 120) return; aoLast = now;
  const key = showFurniture + '|' + state.items.map(it => it.type + it.x + ',' + it.z + ',' + (it.rot || 0) + ',' + (it.w || '') + ',' + (it.d || '')).join(';');
  if (key === aoKey) return; aoKey = key;
  if (composeDaylight()) buildFloor();
}
function setUv2(geo, offX, offZ) {
  const pos = geo.attributes.position; const [minX, minZ, maxX, maxZ] = daylightBox; const uv2 = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv2[i * 2] = (pos.getX(i) + offX - minX) / (maxX - minX); uv2[i * 2 + 1] = (pos.getZ(i) + offZ - minZ) / (maxZ - minZ); }
  geo.setAttribute('uv2', new THREE.BufferAttribute(uv2, 2));
}
function floorMat(map, rough) {
  // light map adds the window light; the furniture shadow map darkens all the soft (sky, bounce, window) light under each piece
  return new THREE.MeshStandardMaterial({ map, roughness: rough, lightMap: daylightTex, lightMapIntensity: windowLight, aoMap: aoTex, aoMapIntensity: 1 });
}
function buildFloor() {
  floorRoot.clear();
  const box = wallsBox(); if (!box) return;
  if (daylightTex && !daylightBox) daylightBox = box;
  let g;
  if (state.baseFloor) {
    g = new THREE.ShapeGeometry(new THREE.Shape(FOOTPRINT.map(p => new THREE.Vector2(p[0], -p[1])))); g.rotateX(-Math.PI / 2);
  } else {
    const [x0, z0, x1, z1] = box; g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));
  }
  if (daylightTex) setUv2(g, 0, 0);
  const floor = new THREE.Mesh(g, floorMat(look !== 'technical' ? floorTexIllus : floorTex, 0.55)); floor.receiveShadow = true; floorRoot.add(floor);
  if (!state.baseFloor) return;
  WET.forEach(([p0, p1]) => {
    const w = Math.abs(p1[0] - p0[0]), d = Math.abs(p1[1] - p0[1]);
    const t = wetTexBase.clone(); t.needsUpdate = true; t.repeat.set(w, d);
    const geo = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2); const cx = (p0[0] + p1[0]) / 2, cz = (p0[1] + p1[1]) / 2;
    if (daylightTex) setUv2(geo, cx, cz);
    const m = new THREE.Mesh(geo, floorMat(t, 0.7));
    m.position.set(cx, 0.006, cz); m.receiveShadow = true; floorRoot.add(m);
  });
}
let relightTimer = null, lastLightKey = '';
function scheduleRelight(delay) {
  // the bake depends only on walls, openings and the floor outline, not on how walls are revealed
  const key = JSON.stringify(lightGeo) + '|' + state.baseFloor + '|' + sunKey;
  if (key === lastLightKey && floorRoot.children.length) return;
  clearTimeout(relightTimer);
  relightTimer = setTimeout(() => { lastLightKey = key; bakeDaylight(); buildFloor(); }, delay == null ? 350 : delay);
}
function proxyPiece(f, t0, t1, y0, y1, thick) {
  if (y1 - y0 < 0.01 || t1 - t0 < 0.01) return;
  const s = t0 - thick / 2, e = t1 + thick / 2; const mid = f.A.clone().add(f.dir.clone().multiplyScalar((s + e) / 2));
  const m = new THREE.Mesh(new THREE.BoxGeometry(e - s, y1 - y0, thick + 0.1), PROXY);
  m.position.set(mid.x, (y0 + y1) / 2, mid.y); m.rotation.y = Math.atan2(-f.dir.y, f.dir.x); m.castShadow = true;
  proxyRoot.add(m);
}
const ptAt = (f, t) => { const p = f.A.clone().add(f.dir.clone().multiplyScalar(t)); return [p.x, p.y]; };

let walkSegs = [];
const CEILING = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 1, emissive: 0xe9e3d6, emissiveIntensity: 0.42 });
function buildStructure() {
  structureRoot.clear(); proxyRoot.clear();
  lightGeo = { occ: [], src: [] }; walkSegs = [];
  const ceil = fullH;
  const perWall = state.walls.map(() => []);
  state.openings.forEach((op, idx) => { const m = matchWall(op); if (m) perWall[m.i].push({ op, idx, t0: m.t0, t1: m.t1 }); });
  state.walls.forEach((w, wi) => {
    const f = wallFrame(w); if (f.L < 0.05) return;
    const ud = { wallIdx: wi };
    if (w.kind === 'railing') {
      orientedBox(structureRoot, MAT.showerGlass, f.A, f.B, 0.08, 0, 3.3, ud);
      orientedBox(structureRoot, MAT.metal, f.A, f.B, 0.16, 3.3, 0.12, ud);
      proxyPiece(f, 0, f.L, 0, 3.3, 0.1);
      lightGeo.src.push([w.a, w.b]); walkSegs.push([ptAt(f, 0), ptAt(f, f.L), 0.2]);
      return;
    }
    const thick = wallThick(w);
    const wh = wallHeight(w, f);
    const side = sideMat(w, wi);
    const ops = perWall[wi].sort((a, b) => a.t0 - b.t0);
    let cursor = 0;
    const solid = (t0, t1) => { if (t1 - t0 < 0.01) return; proxyPiece(f, t0, t1, 0, ceil, thick); lightGeo.occ.push([ptAt(f, t0), ptAt(f, t1)]); walkSegs.push([ptAt(f, t0), ptAt(f, t1), thick]); };
    ops.forEach(o => {
      if (o.t0 > cursor) { wallPiece(structureRoot, f, cursor, o.t0, 0, wh, thick, ud, cursor === 0, false, side); solid(cursor, o.t0); }
      const oud = { openingIdx: o.idx, wallIdx: wi };
      if (o.op.type === 'window' || o.op.type === 'double') lightGeo.src.push([ptAt(f, o.t0), ptAt(f, o.t1)]);
      if (o.op.type === 'window') { const sl = o.op.sill == null ? 3 : o.op.sill; proxyPiece(f, o.t0, o.t1, 0, sl, thick); walkSegs.push([ptAt(f, o.t0), ptAt(f, o.t1), thick]); }
      proxyPiece(f, o.t0, o.t1, DOOR_HEAD, ceil, thick);
      if (o.op.type === 'window') {
        const sill = o.op.sill == null ? 3 : o.op.sill;
        wallPiece(structureRoot, f, o.t0, o.t1, 0, Math.min(sill, wh), thick, oud, false, false, side);
        if (wh > DOOR_HEAD) wallPiece(structureRoot, f, o.t0, o.t1, DOOR_HEAD, wh, thick, oud, false, false, side);
        if (wh > sill) {
          const p0 = f.A.clone().add(f.dir.clone().multiplyScalar(o.t0)), p1 = f.A.clone().add(f.dir.clone().multiplyScalar(o.t1));
          const top = Math.min(DOOR_HEAD, wh);
          const sel = selection && selection.kind === 'opening' && selection.idx === o.idx;
          orientedBox(structureRoot, sel ? mat(0xe2b67c, { transparent: true, opacity: 0.7 }) : MAT.glass, p0, p1, 0.08, sill, top - sill, oud);
          orientedBox(structureRoot, MAT.dark, p0, p1, thick * 0.6, top - 0.06, 0.06, oud);
        }
      } else {
        if (wh > DOOR_HEAD) wallPiece(structureRoot, f, o.t0, o.t1, DOOR_HEAD, wh, thick, oud, false, false, side);
        buildDoor(o.op, o.idx, wh);
      }
      cursor = Math.max(cursor, o.t1);
    });
    if (cursor < f.L) { wallPiece(structureRoot, f, cursor, f.L, 0, wh, thick, ud, cursor === 0, true, side); solid(cursor, f.L); }
  });
  // roof slab over the whole plan
  const box = wallsBox();
  if (box) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(box[2] - box[0] + 1, 0.3, box[3] - box[1] + 1), PROXY);
    slab.position.set((box[0] + box[2]) / 2, ceil + 0.15, (box[1] + box[3]) / 2); slab.castShadow = true; proxyRoot.add(slab);
    if (view === 'walk') {   // a painted ceiling overhead when you're inside
      const c = new THREE.Mesh(new THREE.PlaneGeometry(box[2] - box[0] + 0.6, box[3] - box[1] + 0.6).rotateX(Math.PI / 2), CEILING);
      c.position.set((box[0] + box[2]) / 2, ceil, (box[1] + box[3]) / 2); c.raycast = noRay; structureRoot.add(c);
    }
  }
  scheduleRelight();
  buildDims();
}
function buildDoor(op, idx, wh) {
  const a = V2(op.a), b = V2(op.b); const sw = V2(op.swing).normalize();
  const ud = { openingIdx: idx };
  const sel = selection && selection.kind === 'opening' && selection.idx === idx;
  if (op.type === 'double') {
    const mid = a.clone().add(b).multiplyScalar(0.5); const half = a.distanceTo(b) / 2;
    [a, b].forEach(H => { const tip = doorLeaf(structureRoot, H, sw, half, MAT.doorWhite, ud, sel, wh); swingArc(structureRoot, H, mid, tip, sel); });
    return;
  }
  const H = op.hinge ? b : a, O = op.hinge ? a : b; const w = a.distanceTo(b);
  const tip = doorLeaf(structureRoot, H, sw, w, op.wood ? MAT.doorWood : MAT.doorWhite, ud, sel, wh);
  swingArc(structureRoot, H, O, tip, sel);
}

/* Hand-lettered dimension strings around the outer walls, like an architect's presentation drawing.
   Lengths come from the drawn plan, which was proportioned from a sketch, so they read as approximate (~). */
const dimsRoot = new THREE.Group(); scene.add(dimsRoot);
function ftIn(L) { const t = Math.round(L * 12); return `~${Math.floor(t / 12)}' ${t % 12}"`; }
function textPlane(text, hFt) {
  const c = document.createElement('canvas'); const g = c.getContext('2d'); const px = 56;
  const font = `${px}px "Architects Daughter", "Segoe Print", "Comic Sans MS", cursive`;
  g.font = font; c.width = Math.ceil(g.measureText(text).width) + 20; c.height = px + 20;
  g.font = font; g.fillStyle = '#5b4632'; g.textBaseline = 'middle'; g.fillText(text, 10, c.height / 2);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(hFt * (c.width / c.height), hFt), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.raycast = noRay; return m;
}
function buildDims() {
  dimsRoot.traverse(o => { if (o.material && o.material.map) o.material.map.dispose(); if (o.geometry) o.geometry.dispose(); });
  dimsRoot.clear(); dimsRoot.visible = showDims && view !== 'walk';
  const box = wallsBox(); if (!box) return;
  const cx = (box[0] + box[2]) / 2, cz = (box[1] + box[3]) / 2;
  const pts = [];
  state.walls.forEach(w => {
    if (w.kind === 'int') return;
    const f = wallFrame(w); if (f.L < 2) return;
    const mid = f.A.clone().add(f.dir.clone().multiplyScalar(f.L / 2));
    const n = f.n.clone(); if ((mid.x - cx) * n.x + (mid.y - cz) * n.y < 0) n.negate();
    const off = 2.6, P2 = (base, k) => base.clone().add(n.clone().multiplyScalar(k));
    const a = P2(f.A, off), b = P2(f.B, off);
    pts.push(a, b, P2(f.A, 0.8), P2(f.A, off + 0.5), P2(f.B, 0.8), P2(f.B, off + 0.5));
    const tick = f.dir.clone().add(n).normalize().multiplyScalar(0.32);
    [a, b].forEach(p => pts.push(p.clone().sub(tick), p.clone().add(tick)));
    const label = textPlane(ftIn(f.L), 0.95);
    let ang = Math.atan2(-f.dir.y, f.dir.x);
    if (f.dir.x < -0.01 || (Math.abs(f.dir.x) <= 0.01 && f.dir.y > 0)) ang += Math.PI;
    label.rotation.set(-Math.PI / 2, ang, 0, 'YXZ');
    const lp = P2(mid, off + 0.8); label.position.set(lp.x, 0.07, lp.y);
    dimsRoot.add(label);
  });
  const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, 0.06, p.y)));
  const lines = new THREE.LineSegments(geo, DIM_INK); lines.raycast = noRay; dimsRoot.add(lines);
}

/* Room names lie flat on the floor, like a printed plan. */
function buildLabels() {
  labelsRoot.clear();
  labelsRoot.visible = showLabels;
  (state.labels || []).forEach(l => {
    const c = document.createElement('canvas'); const g = c.getContext('2d');
    const px = l.small ? 44 : 58; const font = `600 ${px}px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif`;
    g.font = font; const text = l.text.split('').join(String.fromCharCode(8202));
    const tw = Math.ceil(g.measureText(text).width) + 24; c.width = tw; c.height = px + 24;
    g.font = font; g.fillStyle = '#2a2826'; g.textBaseline = 'middle'; g.fillText(text, 12, c.height / 2);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    const hFt = l.small ? 0.62 : 0.82; const wFt = hFt * (c.width / c.height);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wFt, hFt), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; if (l.rot) m.rotation.z = Math.PI / 2;
    m.position.set(l.p[0], 0.05, l.p[1]); m.renderOrder = 2;
    labelsRoot.add(m);
  });
}

/* ---------- Furniture ---------- */
function dims(it) { const d = CATALOG[it.type]; return { w: it.w || d.w, d: it.d || d.d }; }
function buildItem(it) {
  const old = itemObjs.get(it.id); if (old) itemsRoot.remove(old);
  const def = CATALOG[it.type]; const g = new THREE.Group(); const { w, d } = dims(it);
  def.build(g, fin(it.finish || def.fin), w, d);
  g.traverse(o => { if (o.isMesh) { o.castShadow = !(o.material && o.material.transparent); o.receiveShadow = true; } });
  inkify(g, 28);
  g.position.set(it.x, def.elev || 0, it.z); g.rotation.y = it.rot || 0;
  g.userData.itemId = it.id;
  itemsRoot.add(g); itemObjs.set(it.id, g);
  return g;
}
function buildItems() {
  itemsRoot.clear(); itemObjs.clear();
  state.items.forEach(buildItem);
  itemsRoot.visible = showFurniture;
}
function rebuildAll() { buildStructure(); buildItems(); refreshSelection(); updateMeta(); }

/* ---------- Selection & inspector ---------- */
const inspector = document.getElementById('inspector');
function itemById(id) { return state.items.find(i => i.id === id); }
function refreshSelection() {
  if (selHelper) { scene.remove(selHelper); selHelper = null; }
  if (selection && selection.kind === 'item') {
    const obj = itemObjs.get(selection.id);
    if (!obj || !itemById(selection.id)) { selection = null; }
    else { selHelper = new THREE.BoxHelper(obj, 0x93531a); scene.add(selHelper); }
  }
  renderInspector();
}
function select(sel) {
  const structural = s => s && (s.kind === 'opening' || s.kind === 'wall');
  const was = structural(selection);
  selection = sel;
  if (was || structural(sel)) buildStructure();
  refreshSelection();
}
function fmt(n) { return (Math.round(n * 10) / 10).toString(); }
let inspCollapsed = true;
function renderInspector() {
  renderInspectorBody();
  if (inspector.hidden) return;
  inspector.classList.toggle('collapsed', inspCollapsed);
  inspector.insertAdjacentHTML('afterbegin', `<div class="insp-ui"><button type="button" class="insp-more" data-ui="more" aria-expanded="${!inspCollapsed}">${inspCollapsed ? 'Edit ▾' : 'Less ▴'}</button><button type="button" data-ui="close" aria-label="Close">✕</button></div>`);
}
function renderInspectorBody() {
  if (!selection) { inspector.hidden = true; inspector.innerHTML = ''; return; }
  inspector.hidden = false;
  if (selection.kind === 'item') {
    const it = itemById(selection.id); const def = CATALOG[it.type]; const { w, d } = dims(it);
    const deg = Math.round(((it.rot || 0) * 180) / Math.PI);
    let html = `<div><h2>${def.name}</h2><div class="dims">${fmt(w)} × ${fmt(d)} ft · at ${fmt(it.x)}, ${fmt(it.z)} · ${((deg % 360) + 360) % 360}°</div></div>`;
    html += `<div class="row"><span class="label">Turn</span><button class="mini" data-act="rotL" type="button" aria-label="Turn left 90 degrees">⟲ 90°</button><button class="mini" data-act="rot15L" type="button">−15°</button><button class="mini" data-act="rot15R" type="button">+15°</button><button class="mini" data-act="rotR" type="button" aria-label="Turn right 90 degrees">90° ⟳</button></div>`;
    if (def.resize) {
      html += `<div class="row"><span class="label">Size</span><button class="mini" data-act="wMinus" type="button">Width −</button><button class="mini" data-act="wPlus" type="button">Width +</button>`;
      if (def.resize === 'wd') html += `<button class="mini" data-act="dMinus" type="button">Depth −</button><button class="mini" data-act="dPlus" type="button">Depth +</button>`;
      html += `</div>`;
    }
    html += `<div class="row"><span class="label">Finish · ${FINISHES[it.finish] ? FINISHES[it.finish].name : ''}</span>` +
      Object.keys(FINISHES).map(k => `<button class="swatch" type="button" data-fin="${k}" aria-label="${FINISHES[k].name}" aria-pressed="${it.finish === k}" style="background:${FIN_CSS[k]}"></button>`).join('') + `</div>`;
    html += `<div class="row"><button class="mini" data-act="dup" type="button">Duplicate</button><button class="mini danger" data-act="del" type="button">Delete</button></div>`;
    inspector.innerHTML = html;
  } else if (selection.kind === 'wall') {
    const w = state.walls[selection.idx]; if (!w) { selection = null; inspector.hidden = true; return; }
    const f = wallFrame(w); const rail = w.kind === 'railing';
    const shown = rail ? 3.3 : wallHeight(w, f);
    let html = `<div><h2>${KIND_NAMES[w.kind] || 'Wall'}</h2><div class="dims">${fmt(f.L)} ft long${rail ? '' : ' · ' + fmt(wallThick(w) * 12) + ' in thick · ' + fmt(shown) + ' ft tall' + (w.h != null ? ' (custom)' : ' (auto)')}</div></div>`;
    if (!rail) {
      html += `<div class="row"><span class="label">Height${reveal === 'down' ? ' · walls are down' : ''}</span><button class="mini" data-act="hMinus" type="button">Lower</button><button class="mini" data-act="hPlus" type="button">Higher</button><button class="mini" data-act="hAuto" type="button" aria-pressed="${w.h == null}">Follow reveal</button></div>`;
      html += `<div class="row"><span class="label">Thickness</span><button class="mini" data-act="tMinus" type="button">Thinner</button><button class="mini" data-act="tPlus" type="button">Thicker</button></div>`;
      html += `<div class="row"><span class="label">Paint · ${(PAINTS[w.paint] || PAINTS.white).name}</span>` +
        Object.keys(PAINTS).map(k => `<button class="swatch" type="button" data-paint="${k}" aria-label="${PAINTS[k].name}" aria-pressed="${(w.paint || 'white') === k}" style="background:${PAINTS[k].css}"></button>`).join('') + `</div>`;
    }
    html += `<div class="row"><span class="label">Type</span>` + ['ext', 'int', 'railing'].map(k => `<button class="mini" type="button" data-kind="${k}" aria-pressed="${w.kind === k}">${KIND_NAMES[k]}</button>`).join('') + `</div>`;
    html += `<div class="row"><button class="mini danger" data-act="wdel" type="button">Delete wall</button></div>`;
    inspector.innerHTML = html;
  } else {
    const op = state.openings[selection.idx]; if (!op) { selection = null; inspector.hidden = true; return; }
    const w = V2(op.a).distanceTo(V2(op.b));
    const name = op.type === 'window' ? 'Window' : op.type === 'double' ? 'Double door' : (op.wood ? 'Main door' : 'Door');
    let html = `<div><h2>${name}</h2><div class="dims">${fmt(w)} ft wide${op.type === 'window' ? ' · sill ' + fmt(op.sill == null ? 3 : op.sill) + ' ft' : ''}</div></div>`;
    html += `<div class="row"><span class="label">Size</span><button class="mini" data-act="owMinus" type="button">Narrower</button><button class="mini" data-act="owPlus" type="button">Wider</button></div>`;
    if (op.type !== 'window') html += `<div class="row"><span class="label">Swing</span><button class="mini" data-act="flipSide" type="button">Open other side</button>${op.type === 'door' ? '<button class="mini" data-act="flipHinge" type="button">Move hinge</button>' : ''}</div>`;
    else html += `<div class="row"><span class="label">Sill height</span><button class="mini" data-act="sillMinus" type="button">Lower</button><button class="mini" data-act="sillPlus" type="button">Higher</button></div>`;
    html += `<div class="row"><button class="mini danger" data-act="odel" type="button">Delete</button></div>`;
    inspector.innerHTML = html;
  }
}
inspector.addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn || !selection) return;
  if (btn.dataset.ui === 'close') { select(null); return; }
  if (btn.dataset.ui === 'more') { inspCollapsed = !inspCollapsed; renderInspector(); return; }
  if (btn.dataset.fin && selection.kind === 'item') { const it = itemById(selection.id); pushUndo(); it.finish = btn.dataset.fin; buildItem(it); refreshSelection(); save(); return; }
  if (selection.kind === 'wall') { wallAction(btn.dataset.act, btn.dataset); return; }
  const act = btn.dataset.act;
  if (selection.kind === 'item') itemAction(act); else openingAction(act);
});
function wallAction(act, data) {
  const w = state.walls[selection.idx]; if (!w) return;
  const f = wallFrame(w);
  pushUndo();
  if (data.paint) w.paint = data.paint;
  else if (data.kind) { w.kind = data.kind; delete w.t; }
  else switch (act) {
    case 'hMinus': w.h = Math.max(0.5, (w.h != null ? w.h : autoHeight(w, f)) - 0.5); break;
    case 'hPlus': w.h = Math.min(14, (w.h != null ? w.h : autoHeight(w, f)) + 0.5); break;
    case 'hAuto': delete w.h; break;
    case 'tMinus': w.t = Math.max(0.15, +(wallThick(w) - 0.05).toFixed(2)); break;
    case 'tPlus': w.t = Math.min(1.5, +(wallThick(w) + 0.05).toFixed(2)); break;
    case 'wdel': state.walls.splice(selection.idx, 1); selection = null; buildStructure(); refreshSelection(); save(); updateMeta(); setStatus('Wall removed.'); return;
    default: undoStack.pop(); return;
  }
  buildStructure(); refreshSelection(); save();
}
function itemAction(act) {
  const it = itemById(selection.id); if (!it) return; const def = CATALOG[it.type];
  pushUndo();
  const turn = a => { it.rot = ((it.rot || 0) + a) % (Math.PI * 2); };
  switch (act) {
    case 'rotL': turn(Math.PI / 2); break;
    case 'rotR': turn(-Math.PI / 2); break;
    case 'rot15L': turn(Math.PI / 12); break;
    case 'rot15R': turn(-Math.PI / 12); break;
    case 'wMinus': it.w = Math.max(1, dims(it).w - 0.5); break;
    case 'wPlus': it.w = Math.min(30, dims(it).w + 0.5); break;
    case 'dMinus': it.d = Math.max(1, dims(it).d - 0.5); break;
    case 'dPlus': it.d = Math.min(30, dims(it).d + 0.5); break;
    case 'dup': { const c = Object.assign({}, it, { id: 'i' + state.nextId++, x: it.x + 1, z: it.z + 1 }); state.items.push(c); buildItem(c); selection = { kind: 'item', id: c.id }; refreshSelection(); save(); updateMeta(); setStatus(def.name + ' duplicated.'); return; }
    case 'del': deleteItem(it.id); return;
    default: undoStack.pop(); return;
  }
  buildItem(it); refreshSelection(); save();
}
function deleteItem(id) {
  const it = itemById(id); if (!it) return;
  state.items = state.items.filter(i => i.id !== id);
  const obj = itemObjs.get(id); if (obj) itemsRoot.remove(obj); itemObjs.delete(id);
  if (selection && selection.id === id) selection = null;
  refreshSelection(); save(); updateMeta(); setStatus(CATALOG[it.type].name + ' removed.');
}
function openingAction(act) {
  const op = state.openings[selection.idx]; if (!op) return;
  pushUndo();
  const a = V2(op.a), b = V2(op.b); const mid = a.clone().add(b).multiplyScalar(0.5); const dir = b.clone().sub(a).normalize(); const w = a.distanceTo(b);
  const resize = nw => { const h = nw / 2; op.a = [mid.x - dir.x * h, mid.y - dir.y * h]; op.b = [mid.x + dir.x * h, mid.y + dir.y * h]; };
  switch (act) {
    case 'owMinus': resize(Math.max(1.5, w - 0.5)); break;
    case 'owPlus': resize(Math.min(12, w + 0.5)); break;
    case 'flipSide': op.swing = [-op.swing[0], -op.swing[1]]; break;
    case 'flipHinge': op.hinge = op.hinge ? 0 : 1; break;
    case 'sillMinus': op.sill = Math.max(0, (op.sill == null ? 3 : op.sill) - 0.5); break;
    case 'sillPlus': op.sill = Math.min(6, (op.sill == null ? 3 : op.sill) + 0.5); break;
    case 'odel': state.openings.splice(selection.idx, 1); selection = null; buildStructure(); refreshSelection(); save(); updateMeta(); setStatus('Opening removed.'); return;
    default: undoStack.pop(); return;
  }
  buildStructure(); refreshSelection(); save();
}

/* ---------- Catalog UI ---------- */
const catalogList = document.getElementById('catalogList');
function renderCatalog(filter) {
  const q = (filter || '').trim().toLowerCase();
  catalogList.innerHTML = CAT_ORDER.map(cat => {
    const keys = Object.keys(CATALOG).filter(k => CATALOG[k].cat === cat && (!q || CATALOG[k].name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)));
    if (!keys.length) return '';
    return `<section class="cat"><h3>${cat}</h3><div class="cat-grid">` + keys.map(k => {
      const d = CATALOG[k];
      return `<button type="button" class="item-btn" draggable="true" data-type="${k}"><b>${d.name}</b><span>${fmt(d.w)} × ${fmt(d.d)} ft</span></button>`;
    }).join('') + `</div></section>`;
  }).join('') || '<p style="color:var(--muted);margin:12px 4px">No furniture matches that search.</p>';
}
renderCatalog('');
document.getElementById('search').addEventListener('input', e => renderCatalog(e.target.value));
catalogList.addEventListener('click', e => {
  const btn = e.target.closest('.item-btn'); if (!btn) return;
  const p = floorAtScreen(0.5, 0.5, true) || CENTER;
  addItem(btn.dataset.type, p.x, p.z);
  if (window.matchMedia('(max-width: 860px)').matches) toggleCatalog(false);
});
catalogList.addEventListener('dragstart', e => {
  const btn = e.target.closest('.item-btn'); if (!btn) return;
  e.dataTransfer.setData('text/plain', btn.dataset.type); e.dataTransfer.effectAllowed = 'copy';
});
renderer.domElement.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
renderer.domElement.addEventListener('drop', e => {
  e.preventDefault(); const type = e.dataTransfer.getData('text/plain'); if (!CATALOG[type]) return;
  const r = renderer.domElement.getBoundingClientRect();
  const p = floorAtScreen((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, false);
  if (p) addItem(type, p.x, p.z);
});
function addItem(type, x, z) {
  const def = CATALOG[type]; pushUndo();
  const it = { id: 'i' + state.nextId++, type, x: snap(x, 0.25), z: snap(z, 0.25), rot: 0, finish: def.fin };
  state.items.push(it); buildItem(it);
  if (!showFurniture) setFurniture(true);
  select({ kind: 'item', id: it.id }); save(); updateMeta();
  setStatus(def.name + ' added. Drag it into place; R turns it.');
}
const catalogEl = document.getElementById('catalog');
const catalogToggle = document.getElementById('catalogToggle');
function toggleCatalog(open) { catalogEl.classList.toggle('open', open); catalogToggle.setAttribute('aria-expanded', String(open)); }
catalogToggle.addEventListener('click', () => { toggleOpts(false); toggleCatalog(!catalogEl.classList.contains('open')); });
const barEl = document.querySelector('.bar'), optsToggle = document.getElementById('optsToggle');
function toggleOpts(open) { barEl.classList.toggle('opts-open', open); optsToggle.setAttribute('aria-expanded', String(open)); }
optsToggle.addEventListener('click', () => { toggleCatalog(false); toggleMore(false); toggleOpts(!barEl.classList.contains('opts-open')); });
const moreBtn = document.getElementById('moreBtn'), moreMenu = document.getElementById('moreMenu');
function toggleMore(open) { moreMenu.classList.toggle('open', open); moreBtn.setAttribute('aria-expanded', String(open)); }
moreBtn.addEventListener('click', () => { toggleOpts(false); toggleMore(!moreMenu.classList.contains('open')); });
document.getElementById('keepBtn').addEventListener('click', () => setTimeout(() => toggleMore(false), 450));
/* Popovers close when you press anywhere outside them, or Esc. */
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('#opts, #optsToggle')) toggleOpts(false);
  if (!e.target.closest('#moreMenu, #moreBtn')) toggleMore(false);
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { toggleOpts(false); toggleMore(false); } });
/* Sliders show their filled part. */
function paintRange(r) { const t = (r.value - r.min) / (r.max - r.min || 1); r.style.setProperty('--fill', (t * 100) + '%'); }
function paintRanges() { document.querySelectorAll('input[type=range]').forEach(paintRange); }
document.addEventListener('input', e => { if (e.target.type === 'range') paintRange(e.target); });
/* The how-to hint shows when the view or tool changes, then fades so the drawing stays clear. */
const hintEl = document.getElementById('hintTop'); let hintTimer = null;
new MutationObserver(() => { hintEl.classList.remove('faded'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hintEl.classList.add('faded'), 6000); }).observe(hintEl, { childList: true, characterData: true, subtree: true });
hintTimer = setTimeout(() => hintEl.classList.add('faded'), 7000);
// tapping the 3D view closes the drop-down sheets on a phone
renderer.domElement.addEventListener('pointerdown', () => { if (window.matchMedia('(max-width: 860px)').matches) { toggleOpts(false); toggleCatalog(false); } });

/* ---------- Picking ---------- */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let lastPtrType = 'mouse';
function setNdc(e) { lastPtrType = e.pointerType || 'mouse'; const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
function floorAtNdc() { raycaster.setFromCamera(ndc, camera); const p = new THREE.Vector3(); return raycaster.ray.intersectPlane(floorPlane, p) ? p : null; }
function floorAtScreen(u, v, centerFallback) { ndc.set(u * 2 - 1, -(v * 2 - 1)); const p = floorAtNdc(); return p || (centerFallback ? CENTER.clone() : null); }
function pick(root) {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(root.children, true);
  if (hits.length || lastPtrType !== 'touch' || root !== itemsRoot) return hits.length ? hits[0] : null;
  // A fingertip is wide: if nothing is exactly under it, look in a small ring around the touch point.
  const r = renderer.domElement.getBoundingClientRect(), base = ndc.clone();
  for (const rad of [12, 22]) for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ndc.set(base.x + Math.cos(a) * rad * 2 / r.width, base.y + Math.sin(a) * rad * 2 / r.height);
    raycaster.setFromCamera(ndc, camera);
    const h = raycaster.intersectObjects(root.children, true);
    if (h.length) { ndc.copy(base); return h[0]; }
  }
  ndc.copy(base); return null;
}
function itemFromHit(hit) { let o = hit && hit.object; while (o && !o.userData.itemId) o = o.parent; return o ? o.userData.itemId : null; }
const snap = (v, s) => Math.round(v / s) * s;

/* ---------- Wall drawing ---------- */
let wallStart = null;
const preview = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.36), new THREE.MeshBasicMaterial({ color: 0x93531a, transparent: true, opacity: 0.55 }));
preview.visible = false; scene.add(preview);
const cursorDot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20), new THREE.MeshBasicMaterial({ color: 0x93531a }));
cursorDot.visible = false; scene.add(cursorDot);
function snapPoint(p, from, free) {
  let x = snap(p.x, 0.5), z = snap(p.z, 0.5);
  let best = null, bd = 0.8;
  state.walls.forEach(w => [w.a, w.b].forEach(q => { const d = Math.hypot(q[0] - p.x, q[1] - p.z); if (d < bd) { bd = d; best = q; } }));
  if (best) { x = best[0]; z = best[1]; }
  if (from && !free && !best) { if (Math.abs(x - from[0]) > Math.abs(z - from[1])) z = from[1]; else x = from[0]; }
  return [x, z];
}
function updateWallPreview(p, shift) {
  const q = snapPoint(p, wallStart, shift);
  cursorDot.visible = true; cursorDot.position.set(q[0], 0.05, q[1]);
  if (!wallStart) { preview.visible = false; return; }
  const a = V2(wallStart), b = V2(q); const d = b.clone().sub(a); const len = d.length();
  if (len < 0.05) { preview.visible = false; return; }
  preview.visible = true; preview.scale.set(len, wallH, 1);
  const mid = a.clone().add(b).multiplyScalar(0.5); preview.position.set(mid.x, wallH / 2, mid.y); preview.rotation.y = Math.atan2(-d.y, d.x);
  setStatus(`Wall ${fmt(len)} ft. Click to place, Esc to stop. Hold Shift for any angle.`);
}
function endWallChain() { wallStart = null; preview.visible = false; }
document.getElementById('wallDone').addEventListener('click', () => { endWallChain(); setStatus('Wall finished. Click to start another.'); });

/* ---------- Pointer handling ---------- */
let down = null, drag = null;
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || view === 'walk' || browsing) return;
  setNdc(e); down = { x: e.clientX, y: e.clientY, hitSomething: false };
  if (mode === 'select') {
    const hitItem = showFurniture ? pick(itemsRoot) : null;
    const hitStruct = pick(structureRoot);
    const itemId = itemFromHit(hitItem);
    const opIdx = hitStruct && hitStruct.object.userData.openingIdx;
    const itemCloser = itemId && (!hitStruct || hitItem.distance <= hitStruct.distance + 0.01);
    if (itemCloser) {
      down.hitSomething = true;
      const it = itemById(itemId); const fp = floorAtNdc();
      if (!selection || selection.id !== itemId) select({ kind: 'item', id: itemId });
      if (fp) { drag = { id: itemId, ox: it.x - fp.x, oz: it.z - fp.z, before: serialize(), moved: false }; controls.enabled = false; canvas.setPointerCapture(e.pointerId); document.body.classList.add('dragging-piece'); if (e.pointerType === 'touch' && navigator.vibrate) navigator.vibrate(8); }
    } else if (opIdx != null) {
      down.hitSomething = true; select({ kind: 'opening', idx: opIdx });
    } else if (hitStruct && hitStruct.object.userData.wallIdx != null) {
      down.hitSomething = true; select({ kind: 'wall', idx: hitStruct.object.userData.wallIdx });
    }
  } else if (mode === 'wall') {
    const fp = floorAtNdc(); if (!fp) return;
    const q = snapPoint(fp, wallStart, e.shiftKey);
    if (!wallStart) { wallStart = q; setStatus('Click the wall\'s end point.'); }
    else {
      if (Math.hypot(q[0] - wallStart[0], q[1] - wallStart[1]) > 0.3) {
        pushUndo(); state.walls.push({ a: wallStart.slice(), b: q.slice(), kind: 'int' }); buildStructure(); save(); updateMeta();
      }
      wallStart = q;
    }
    updateWallPreview(fp, e.shiftKey);
  } else if (mode === 'door' || mode === 'window') {
    const hit = pick(structureRoot);
    const wi = hit && hit.object.userData.wallIdx;
    if (wi == null || state.walls[wi].kind === 'railing') { setStatus('Click on a wall to add a ' + mode + '.'); return; }
    const f = wallFrame(state.walls[wi]); const p = new THREE.Vector2(hit.point.x, hit.point.z);
    const width = mode === 'door' ? 3 : 4; if (f.L < width + 0.2) { setStatus('That wall is too short for a ' + mode + '.'); return; }
    let t = p.clone().sub(f.A).dot(f.dir); t = Math.min(Math.max(snap(t, 0.25), width / 2 + 0.1), f.L - width / 2 - 0.1);
    const a = f.A.clone().add(f.dir.clone().multiplyScalar(t - width / 2)), b = f.A.clone().add(f.dir.clone().multiplyScalar(t + width / 2));
    const camSide = new THREE.Vector2(camera.position.x - hit.point.x, camera.position.z - hit.point.z);
    const sgn = camSide.dot(f.n) >= 0 ? 1 : -1;
    pushUndo();
    const op = mode === 'door' ? { type: 'door', a: [a.x, a.y], b: [b.x, b.y], hinge: 0, swing: [f.n.x * sgn, f.n.y * sgn] } : { type: 'window', a: [a.x, a.y], b: [b.x, b.y], sill: 3 };
    state.openings.push(op); buildStructure(); save(); updateMeta();
    setStatus((mode === 'door' ? 'Door' : 'Window') + ' added. Switch to Select and click it to adjust.');
  } else if (mode === 'erase') {
    const hitItem = showFurniture ? pick(itemsRoot) : null; const hitStruct = pick(structureRoot);
    const itemId = itemFromHit(hitItem);
    if (itemId && (!hitStruct || hitItem.distance <= hitStruct.distance + 0.01)) { pushUndo(); deleteItem(itemId); return; }
    if (hitStruct) {
      const ud = hitStruct.object.userData;
      pushUndo();
      if (ud.openingIdx != null) { state.openings.splice(ud.openingIdx, 1); setStatus('Opening removed.'); }
      else if (ud.wallIdx != null) { state.walls.splice(ud.wallIdx, 1); setStatus('Wall removed.'); }
      else { undoStack.pop(); return; }
      selection = null; buildStructure(); refreshSelection(); save(); updateMeta();
    }
  }
}, { capture: true });

canvas.addEventListener('pointermove', e => {
  if (view === 'walk' || browsing) { if (browsing) canvas.style.cursor = ''; return; }
  setNdc(e);
  if (drag) {
    const fp = floorAtNdc(); if (!fp) return;
    const it = itemById(drag.id); const step = e.altKey ? 0.05 : 0.25;
    let nx = snap(fp.x + drag.ox, step), nz = snap(fp.z + drag.oz, step);
    if (CATALOG[it.type].module && !e.altKey) [nx, nz] = snapModule(it, nx, nz);
    if (nx !== it.x || nz !== it.z) { it.x = nx; it.z = nz; drag.moved = true; const o = itemObjs.get(it.id); o.position.x = nx; o.position.z = nz; if (selHelper) selHelper.update(); }
    return;
  }
  if (mode === 'wall') { const fp = floorAtNdc(); if (fp) updateWallPreview(fp, e.shiftKey); }
  else cursorDot.visible = false;
  if (mode === 'select' && showFurniture && !down) {
    const id = itemFromHit(pick(itemsRoot)); canvas.style.cursor = id ? 'grab' : '';
  } else if (mode !== 'select') canvas.style.cursor = mode === 'erase' ? 'not-allowed' : 'crosshair';
});
window.addEventListener('pointerup', e => {
  if (drag) {
    controls.enabled = true; document.body.classList.remove('dragging-piece');
    if (drag.moved) { pushUndo(drag.before); save(); renderInspector(); }
    drag = null;
  } else if (down && mode === 'select' && !down.hitSomething) {
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) select(null);
  }
  down = null;
});
canvas.addEventListener('dblclick', () => { if (mode === 'wall') { endWallChain(); setStatus('Wall finished. Click to start another.'); } });
canvas.addEventListener('contextmenu', e => { if (mode === 'wall' && wallStart) { e.preventDefault(); endWallChain(); setStatus('Wall finished.'); } });

/* ---------- Toolbar ---------- */
const HINTS = {
  select: 'Click a piece, door, window or wall to edit it. Drag pieces to move them.',
  wall: 'Click to start a wall, click again to end it. Walls chain; Esc or double-click stops.',
  door: 'Click any wall to add a 3 ft door.',
  window: 'Click any wall to add a 4 ft window.',
  erase: 'Click a piece, door, window or wall to remove it.'
};
function setMode(m) {
  mode = m; endWallChain(); cursorDot.visible = false; document.body.classList.toggle('tool-active', m !== 'select');
  document.querySelectorAll('#tools button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  if (m !== 'select') select(null);
  canvas.style.cursor = m === 'select' ? '' : m === 'erase' ? 'not-allowed' : 'crosshair';
  applyControls(); setStatus(HINTS[m]);
}
document.getElementById('tools').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });

function applyControls() {
  const tool = mode !== 'select' && !browsing;
  controls.enableRotate = view === 'iso';
  controls.mouseButtons = { LEFT: tool ? -1 : (view === 'iso' ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN), MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: tool ? -1 : (view === 'iso' ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN), TWO: THREE.TOUCH.DOLLY_PAN };
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (view === 'walk') { document.getElementById('hintTop').textContent = touch ? 'Joystick to walk · drag to look · double-tap the floor to go there · spread two fingers to step' : 'WASD or arrows to walk · drag to look · double-click the floor to go there · Shift to hurry · Esc to leave'; return; }
  if (browsing) { document.getElementById('hintTop').textContent = touch ? (view === 'iso' ? 'Drag to turn · two fingers to pan and zoom' : 'Drag to pan · pinch to zoom') : (view === 'iso' ? 'Drag to turn · right-drag to pan · scroll to zoom' : 'Drag to pan · scroll to zoom'); return; }
  document.getElementById('hintTop').textContent = touch
    ? (view === 'iso' ? (tool ? 'Two fingers: pan and pinch to zoom' : 'One finger orbits · two fingers pan and zoom') : 'Drag to pan · pinch to zoom')
    : view === 'iso'
      ? (tool ? 'Right-drag to pan · scroll to zoom' : 'Drag empty floor to orbit · right-drag to pan · scroll to zoom')
      : 'Drag to pan · scroll to zoom';
}
let lastPlanView = 'iso';
let browsing = false;
function setBrowsing(on) {
  browsing = on; document.body.classList.toggle('browsing', on);
  document.getElementById('browseBtn').setAttribute('aria-pressed', String(!on));
  if (on) { setMode('select'); select(null); toggleCatalog(false); }
  applyControls();
  if (!on) setStatus(HINTS[mode]);
  try { localStorage.setItem(STORE_KEY + '-browse', on ? '1' : '0'); } catch (e) { /* ignore */ }
  requestAnimationFrame(resize);
}
document.getElementById('browseBtn').addEventListener('click', () => { toggleOpts(false); setBrowsing(!browsing); });
function setView(v) {
  const was = view; view = v;
  if (v !== 'walk') lastPlanView = v;
  document.querySelectorAll('#views button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  document.body.classList.toggle('walking', v === 'walk');
    if (v === 'walk') { if (was !== 'walk') enterWalk(); return; }
  if (was === 'walk') leaveWalk();
  const t = controls.target;
  if (v === 'top') camera.position.set(t.x, t.y + 120, t.z + 0.001);
  else camera.position.set(t.x - 46, t.y + 64, t.z + 46); // isometric-style, seen from the lower-left corner
  camera.up.set(0, 1, 0); camera.lookAt(t); controls.update(); applyControls();
  fitView();
}
/* Frame the whole flat: centred in the space left between the floating bars, and zoomed to fill it. */
function fitView() {
  const b = wallsBox(); if (!b) return;
  const sw = stage.clientWidth, sh = stage.clientHeight; if (!sw || !sh) return;
  camera.updateMatrixWorld();
  const inv = camera.matrixWorldInverse, v = new THREE.Vector3(), m = showDims ? 1.6 : 0.5;
  const topY = reveal === 'down' ? 0.4 : reveal === 'low' ? wallH : fullH;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const x of [b[0] - m, b[2] + m]) for (const z of [b[1] - m, b[3] + m]) for (const y of [0, topY]) {
    v.set(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
  }
  const narrow = window.matchMedia('(max-width: 860px)').matches;
  const top = 52, bottom = narrow && !browsing ? 92 : (narrow ? 16 : 70);
  const vw = camera.right - camera.left, vh = camera.top - camera.bottom;
  const zoom = Math.max(controls.minZoom, Math.min(controls.maxZoom, Math.min((vw * 0.97) / (x1 - x0), (vh * (1 - (top + bottom) / sh)) / (y1 - y0))));
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const lift = ((top - bottom) / 2 / sh) * vh / zoom;   // nudge so the flat sits in the clear middle band
  const shift = right.multiplyScalar((x0 + x1) / 2).add(up.multiplyScalar((y0 + y1) / 2 + lift));
  camera.position.add(shift); controls.target.add(shift);
  camera.zoom = zoom; camera.updateProjectionMatrix(); controls.update();
}
document.getElementById('walkBtn').addEventListener('click', () => setView(view === 'walk' ? lastPlanView : 'walk'));

/* ---------- Walk around at eye level ----------
   A person-height camera you steer with WASD/arrows, a drag to look around, double-click (or double-tap)
   on the floor to stroll there, and an on-screen joystick on phones. Walls, window sills, railings and
   furniture you can't walk through stop you; doorways let you through. */
const EYE = 5.1, BODY = 0.6;
/* Daylight bouncing around a room reaches the walls from every side. In the cut-away views that is read from
   above; at eye level it needs a gentle sideways fill, which lights walls and furniture sides but not the floor. */
const walkFill = new THREE.Group(); walkFill.visible = false; scene.add(walkFill);
[[1, 0.45], [-1, -0.45], [0.45, -1], [-0.45, 1]].forEach(([x, z]) => { const l = new THREE.DirectionalLight(0xfff6ea, 0.2); l.position.set(x, 0, z); l.target.position.set(0, 0, 0); walkFill.add(l, l.target); });
const walkCam = new THREE.PerspectiveCamera(70, 1, 0.12, 400); walkCam.rotation.order = 'YXZ';
const walk = { x: 18.2, z: 6.6, yaw: Math.PI, pitch: -0.12, keys: {}, joy: [0, 0], goal: null, blockers: [], bob: 0, last: 0, look: null, lastTap: 0 };
function computeBlockers() {
  walk.blockers = [];
  if (!showFurniture) return;
  const b = new THREE.Box3();
  state.items.forEach(it => {
    const o = itemObjs.get(it.id); if (!o) return;
    b.setFromObject(o); if (b.isEmpty()) return;
    if (b.max.y < 0.6 || b.min.y > 3.4) return;        // rugs and mats underfoot; wall cabinets overhead
    const sh = 0.12;
    walk.blockers.push([b.min.x + sh - BODY * 0.7, b.min.z + sh - BODY * 0.7, b.max.x - sh + BODY * 0.7, b.max.z - sh + BODY * 0.7]);
  });
}
function segDist2(x, z, s) {
  const a = s[0], b = s[1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9;
  const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
  const px = a[0] + u * dx - x, pz = a[1] + u * dz - z; return px * px + pz * pz;
}
const inBox = (x, z, q) => x > q[0] && x < q[2] && z > q[1] && z < q[3];
/* A move is refused only if it takes you further into something, so you can always step back out. */
function walkBlocked(x, z, ox, oz) {
  for (const s of walkSegs) { const r = BODY + s[2] / 2, d = segDist2(x, z, s); if (d < r * r && d < segDist2(ox, oz, s) - 1e-6) return true; }
  for (const q of walk.blockers) if (inBox(x, z, q) && !inBox(ox, oz, q)) return true;
  const bx = wallsBox();   // open doorways lead in and out of rooms, never off the edge of the flat
  if (bx && !inBox(x, z, [bx[0] + BODY, bx[1] + BODY, bx[2] - BODY, bx[3] - BODY]) && inBox(ox, oz, [bx[0] + BODY, bx[1] + BODY, bx[2] - BODY, bx[3] - BODY])) return true;
  return false;
}
function tryMove(x, z) { if (walkBlocked(x, z, walk.x, walk.z)) return false; walk.x = x; walk.z = z; return true; }
function updateWalk(now) {
  const dt = Math.min(0.05, Math.max(0, (now - (walk.last || now)) / 1000)); walk.last = now;
  const k = walk.keys;
  let f = ((k.w || k.arrowup) ? 1 : 0) - ((k.s || k.arrowdown) ? 1 : 0) - walk.joy[1];
  let sd = (k.d ? 1 : 0) - (k.a ? 1 : 0) + walk.joy[0];
  walk.yaw += (((k.arrowleft || k.q) ? 1 : 0) - ((k.arrowright || k.e) ? 1 : 0)) * 1.9 * dt;
  const fx = -Math.sin(walk.yaw), fz = -Math.cos(walk.yaw), rx = -fz, rz = fx;
  let mx = 0, mz = 0, speed = 4.4 * (k.shift ? 1.8 : 1);
  const n = Math.hypot(f, sd);
  if (n > 0.05) {
    walk.goal = null; const m = Math.min(1, n);
    mx = (fx * f + rx * sd) / n * m; mz = (fz * f + rz * sd) / n * m;
  } else if (walk.goal) {
    const gx = walk.goal[0] - walk.x, gz = walk.goal[1] - walk.z, d = Math.hypot(gx, gz);
    if (d < 0.25) walk.goal = null;
    else {
      mx = gx / d; mz = gz / d; speed = Math.min(5.5, 1.2 + d * 2.5);
      let dy = Math.atan2(-gx, -gz) - walk.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      walk.yaw += dy * Math.min(1, dt * 3.5);
    }
  }
  if (mx || mz) {
    const st = speed * dt, nx = walk.x + mx * st, nz = walk.z + mz * st;
    const moved = tryMove(nx, nz) || tryMove(nx, walk.z) || tryMove(walk.x, nz);
    if (moved) walk.bob += st; else walk.goal = null;
  }
  walkCam.position.set(walk.x, EYE + Math.sin(walk.bob * 2.2) * 0.04, walk.z);
  walkCam.rotation.set(walk.pitch, walk.yaw, 0);
}
function sizeWalkCam() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  walkCam.aspect = w / h; walkCam.fov = w < h ? 82 : 68; walkCam.updateProjectionMatrix();
}
function enterWalk() {
  setMode('select'); select(null); toggleOpts(false); toggleCatalog(false);
  controls.enabled = false; walkFill.visible = true; buildStructure(); computeBlockers(); sizeWalkCam();
  walk.keys = {}; walk.goal = null; walk.last = 0;
  updateWalk(performance.now());
  setStatus('You’re standing just inside the main door. Wander through the rooms; Esc takes you back to the plan.');
}
function leaveWalk() {
  controls.enabled = true; walkFill.visible = false; walk.keys = {}; walk.goal = null; resetJoy();
  buildStructure(); setStatus(HINTS[mode]);
}
/* Look around by dragging; double-click / double-tap the floor to stroll there; scroll to step. */
const floorRay = new THREE.Raycaster();
const walkPtrs = new Map(); let pinchD = 0;
canvas.addEventListener('pointerdown', e => { if (view === 'walk') walkPtrs.set(e.pointerId, [e.clientX, e.clientY]); });
['pointerup', 'pointercancel'].forEach(t => canvas.addEventListener(t, e => { walkPtrs.delete(e.pointerId); pinchD = 0; }));
/* Two fingers: spread to step forward, pinch to step back. */
canvas.addEventListener('pointermove', e => {
  if (view !== 'walk' || !walkPtrs.has(e.pointerId)) return;
  walkPtrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (walkPtrs.size !== 2) return;
  const [a, b] = [...walkPtrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
  if (pinchD) { const st = (d - pinchD) * 0.035, nx = walk.x - Math.sin(walk.yaw) * st, nz = walk.z - Math.cos(walk.yaw) * st; tryMove(nx, nz) || tryMove(nx, walk.z) || tryMove(walk.x, nz); }
  pinchD = d; walk.look = null;
});
canvas.addEventListener('pointerdown', e => {
  if (view !== 'walk' || walkPtrs.size > 1) { walk.look = null; return; }
  walk.look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (view !== 'walk' || !walk.look || walk.look.id !== e.pointerId) return;
  const k = e.pointerType === 'touch' ? 0.006 : 0.0045;
  walk.yaw += (e.clientX - walk.look.x) * k;
  walk.pitch = Math.max(-1.2, Math.min(1.1, walk.pitch + (e.clientY - walk.look.y) * k));
  walk.look.x = e.clientX; walk.look.y = e.clientY;
});
canvas.addEventListener('pointerup', e => {
  if (view !== 'walk' || !walk.look || walk.look.id !== e.pointerId) return;
  const tap = Math.hypot(e.clientX - walk.look.sx, e.clientY - walk.look.sy) < 8 && performance.now() - walk.look.t < 350;
  walk.look = null;
  if (!tap) return;
  const now = performance.now();
  if (now - walk.lastTap < 380) {
    walk.lastTap = 0; setNdc(e); floorRay.setFromCamera(ndc, walkCam);
    const p = new THREE.Vector3();
    if (floorRay.ray.direction.y < -0.02 && floorRay.ray.intersectPlane(floorPlane, p) && Math.hypot(p.x - walk.x, p.z - walk.z) < 45) walk.goal = [p.x, p.z];
  } else walk.lastTap = now;
});
canvas.addEventListener('wheel', e => {
  if (view !== 'walk') return; e.preventDefault();
  const st = Math.max(-1.2, Math.min(1.2, -e.deltaY * 0.01));
  const nx = walk.x - Math.sin(walk.yaw) * st, nz = walk.z - Math.cos(walk.yaw) * st;
  tryMove(nx, nz) || tryMove(nx, walk.z) || tryMove(walk.x, nz);
}, { passive: false });
/* On-screen joystick */
const joyEl = document.getElementById('joy'), joyKnob = joyEl.querySelector('i');
let joyId = null;
function joySet(e) {
  const r = joyEl.getBoundingClientRect(), R = r.width / 2 - 10;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
  joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  walk.joy = [dx / R, dy / R];
}
function resetJoy() { joyId = null; walk.joy = [0, 0]; joyKnob.style.transform = ''; }
joyEl.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); joyId = e.pointerId; joyEl.setPointerCapture(e.pointerId); joySet(e); });
joyEl.addEventListener('pointermove', e => { if (e.pointerId === joyId) joySet(e); });
['pointerup', 'pointercancel'].forEach(t => joyEl.addEventListener(t, e => { if (e.pointerId === joyId) resetJoy(); }));
window.addEventListener('keyup', e => { delete walk.keys[e.key.toLowerCase()]; });
window.addEventListener('blur', () => { walk.keys = {}; resetJoy(); });
document.getElementById('views').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); });

const wallHIn = document.getElementById('wallH'), wallHOut = document.getElementById('wallHOut');
wallHIn.addEventListener('input', () => { wallH = +wallHIn.value; wallHOut.textContent = wallH + ' ft'; buildStructure(); renderInspector(); });
const fullHIn = document.getElementById('fullH'), fullHOut = document.getElementById('fullHOut');
fullHIn.addEventListener('input', () => { fullH = +fullHIn.value; fullHOut.textContent = fullH + ' ft'; buildStructure(); renderInspector(); });
function setReveal(r) {
  reveal = r;
  document.querySelectorAll('#reveal button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.reveal === r)));
  document.getElementById('wallHWrap').hidden = !(r === 'cut' || r === 'low');
  document.getElementById('fullHWrap').hidden = !(r === 'cut' || r === 'full');
  lastFarKey = ''; buildStructure(); renderInspector();
  try { localStorage.setItem(STORE_KEY + '-reveal2', JSON.stringify({ reveal, wallH, fullH })); } catch (e) { /* ignore */ }
}
document.getElementById('reveal').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setReveal(b.dataset.reveal); });
/* In Cutaway the far outer walls change as you orbit, so rebuild only when that set changes. */
let lastFarKey = '';
controls.addEventListener('change', () => {
  if (reveal !== 'cut' || drag) return;
  const key = state.walls.map(w => (w.kind === 'ext' && isFarWall(wallFrame(w))) ? 1 : 0).join('');
  if (key !== lastFarKey) { lastFarKey = key; buildStructure(); }
});
/* The sun follows its real path over Bengaluru (12.97° N). The flat's main door faces east, which is the
   top edge of the plan, so north is to the plan's left. Morning sun pours in from the entrance side,
   afternoon sun from the far side; in winter it leans south, in summer slightly north. */
const LAT = 12.97 * Math.PI / 180;
const DECL = { summer: 23.0, equinox: 0, winter: -23.0 };
const WORLD = { east: [0, -1], north: [-1, 0] };   // plan directions as [x, z]
const timeIn = document.getElementById('sunTime'), timeOut = document.getElementById('sunTimeOut');
let season = (() => { const m = new Date().getMonth(); return m >= 3 && m <= 7 ? 'summer' : (m >= 10 || m <= 1) ? 'winter' : 'equinox'; })();
let sunH = [0, -1], sunElev = 35, sunKey = '';
const fmtTime = t => { const h = Math.floor(t), m = Math.round((t - h) * 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
function setSun() {
  const t = +timeIn.value; timeOut.textContent = fmtTime(t);
  const d = DECL[season] * Math.PI / 180, H = (t - 12.33) * 15 * Math.PI / 180;   // solar noon is about 12:20 in Bengaluru
  const E = -Math.cos(d) * Math.sin(H), N = Math.cos(LAT) * Math.sin(d) - Math.sin(LAT) * Math.cos(d) * Math.cos(H);
  let U = Math.sin(LAT) * Math.sin(d) + Math.cos(LAT) * Math.cos(d) * Math.cos(H);
  U = Math.max(U, 0.17);                                   // keep the earliest/latest light just above the horizon
  let hx = E * WORLD.east[0] + N * WORLD.north[0], hz = E * WORLD.east[1] + N * WORLD.north[1];
  const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
  const el = Math.atan2(U, Math.hypot(E, N)); const deg = el * 180 / Math.PI;
  sunH = [hx, hz]; sunElev = deg;
  const dir = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el));
  sun.position.copy(CENTER).add(dir.multiplyScalar(90));
  const low = Math.max(0, Math.min(1, 1 - (deg - 10) / 65)); sun.color.setRGB(1, 0.95 - low * 0.12, 0.88 - low * 0.26);
  sun.intensity = 0.55 + (1 - low) * 0.25;
  document.querySelectorAll('#season button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.season === season)));
  sunKey = season + t;
  if (lightGeo.src.length) scheduleRelight();
  try { localStorage.setItem(STORE_KEY + '-sun2', JSON.stringify({ t, season })); } catch (e) { /* ignore */ }
}
timeIn.addEventListener('input', setSun);
document.getElementById('season').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { season = b.dataset.season; setSun(); } });
try { const sv = JSON.parse(localStorage.getItem(STORE_KEY + '-sun2') || 'null'); if (sv) { if (DECL[sv.season] != null) season = sv.season; if (sv.t) timeIn.value = sv.t; } } catch (e) { /* ignore */ }
/* Compass: turns with the view so N always points to real north. */
const compassRose = document.getElementById('compassRose'); let compassLast = '';
const _cf = new THREE.Vector3(), _cu = new THREE.Vector3();
function updateCompass(cam) {
  cam.getWorldDirection(_cf);
  let ux, uz;
  if (Math.abs(_cf.y) < 0.98) { ux = _cf.x; uz = _cf.z; } else { _cu.set(0, 1, 0).applyQuaternion(cam.quaternion); ux = _cu.x; uz = _cu.z; }
  const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l;
  const rx = -uz, rz = ux, N = WORLD.north;
  const a = Math.round(Math.atan2(N[0] * rx + N[1] * rz, N[0] * ux + N[1] * uz) * 180 / Math.PI);
  const k = String(a); if (k !== compassLast) { compassLast = k; compassRose.setAttribute('transform', `rotate(${a} 27 27)`); }
}

const winIn = document.getElementById('winLight'), winOut = document.getElementById('winLightOut');
windowLight = +winIn.value;
winIn.addEventListener('input', () => {
  windowLight = +winIn.value; winOut.textContent = windowLight.toFixed(1) + '×';
  floorRoot.traverse(o => { if (o.isMesh && o.material.lightMap !== undefined) o.material.lightMapIntensity = windowLight; });
});
const bounceIn = document.getElementById('bounce'), bounceOut = document.getElementById('bounceOut');
bounceIn.addEventListener('input', () => { bounceAmt = +bounceIn.value; bounceOut.textContent = bounceAmt.toFixed(1) + '×'; if (composeDaylight()) buildFloor(); });

/* Look: Illustrated (warm paper, cream wall caps, ink outlines, dimensions) or Technical (black poché wall caps, no ink). */
function applyLookChrome() {
  const ill = look !== 'technical';
  renderer.setClearColor(ill ? 0xf1e9da : 0xe8e5de);
  ground.material.color.set(ill ? 0xf0e7d6 : 0xe6e2da);
  document.querySelectorAll('#looks button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.look === look)));
  document.getElementById('toggleDims').setAttribute('aria-pressed', String(showDims));
  try { localStorage.setItem(STORE_KEY + '-look2', JSON.stringify({ look, dims: showDims })); } catch (e) { /* ignore */ }
}
function setLook(l) { look = l; applyLookChrome(); buildStructure(); buildItems(); buildFloor(); refreshSelection(); }
document.getElementById('looks').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLook(b.dataset.look); });
document.getElementById('toggleDims').addEventListener('click', () => { showDims = !showDims; dimsRoot.visible = showDims && view !== 'walk'; applyLookChrome(); });
function setFurniture(on) { showFurniture = on; itemsRoot.visible = on; if (selHelper) selHelper.visible = on; document.getElementById('toggleFurniture').setAttribute('aria-pressed', String(on)); }
document.getElementById('toggleFurniture').addEventListener('click', () => setFurniture(!showFurniture));
document.getElementById('undoBtn').addEventListener('click', undo);

function twoStep(btn, idleText, armedText, run) {
  let armed = false, timer = null;
  btn.addEventListener('click', () => {
    if (!armed) { armed = true; btn.textContent = armedText; btn.classList.add('warn'); timer = setTimeout(() => { armed = false; btn.textContent = idleText; btn.classList.remove('warn'); }, 3500); return; }
    clearTimeout(timer); armed = false; btn.textContent = idleText; btn.classList.remove('warn'); run();
  });
}
/* "Keep this layout" stores the current plan as your own baseline; "Reset to my flat" returns to it (or to the built-in layout if none is kept). */
const KEEP_KEY = STORE_KEY + '-kept';
function keptLayout() { try { const k = localStorage.getItem(KEEP_KEY); return k ? migrate(JSON.parse(k)) : null; } catch (e) { return null; } }
document.getElementById('keepBtn').addEventListener('click', () => {
  try { localStorage.setItem(KEEP_KEY, serialize()); setStatus('Layout kept. "Reset to my flat" now brings back exactly this arrangement.'); }
  catch (e) { setStatus('This browser would not store the layout, so Reset still uses the built-in one.'); }
});
twoStep(document.getElementById('resetBtn'), 'Reset to my flat', 'Tap again to reset', () => {
  pushUndo(); const kept = keptLayout(); state = kept || sampleState(); selection = null; rebuildAll(); save();
  setStatus((kept ? 'Back to your kept layout.' : 'Back to the built-in layout.') + ' Undo brings your changes back.');
});
twoStep(document.getElementById('blankBtn'), 'Blank sheet', 'Tap again to clear', () => {
  pushUndo(); state = { walls: [], openings: [], items: [], labels: [], baseFloor: false, nextId: 1 }; selection = null; rebuildAll(); save(); setMode('wall'); setStatus('Blank sheet. Click to start drawing walls.');
});

/* Keyboard */
window.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  const k = e.key.toLowerCase();
  if (view === 'walk') {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === 'escape') { setView(lastPlanView); return; }
    if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { e.preventDefault(); walk.keys[k] = true; }
    return;
  }
  if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); undo(); return; }
  if ((e.metaKey || e.ctrlKey) && k === 'd') { if (selection && selection.kind === 'item') { e.preventDefault(); itemAction('dup'); } return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (k === 'escape') { if (wallStart) { endWallChain(); setStatus('Wall finished.'); } else select(null); return; }
  if (browsing) { if (k === 't') setView(view === 'iso' ? 'top' : 'iso'); return; }
  if (k === 'v') setMode('select'); else if (k === 'w') setMode('wall'); else if (k === 'o') setMode('door'); else if (k === 'n') setMode('window'); else if (k === 'x') setMode('erase');
  else if (k === 't') setView(view === 'iso' ? 'top' : 'iso');
  else if (selection && selection.kind === 'item') {
    if (k === 'r') itemAction('rotR'); else if (k === 'q') itemAction('rot15L'); else if (k === 'e') itemAction('rot15R');
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); pushUndo(); deleteItem(selection.id); }
    else if (k.startsWith('arrow')) {
      e.preventDefault(); const it = itemById(selection.id); pushUndo(); const s = e.shiftKey ? 1 : 0.25;
      if (k === 'arrowleft') it.x -= s; if (k === 'arrowright') it.x += s; if (k === 'arrowup') it.z -= s; if (k === 'arrowdown') it.z += s;
      buildItem(it); refreshSelection(); save();
    }
  } else if (selection && selection.kind === 'opening' && (k === 'delete' || k === 'backspace')) { e.preventDefault(); openingAction('odel'); }
  else if (selection && selection.kind === 'wall' && (k === 'delete' || k === 'backspace')) { e.preventDefault(); wallAction('wdel', {}); }
});

/* Status */
const statusText = document.getElementById('statusText'), statusMeta = document.getElementById('statusMeta');
const coarse = window.matchMedia('(pointer: coarse)');
function setStatus(t) {
  if (coarse.matches) t = t.replace(/Esc or double-click stops/, 'tap Done to stop').replace(/Double-click/g, 'Double-tap').replace(/double-click/g, 'double-tap').replace(/\bClick/g, 'Tap').replace(/\bclick/g, 'tap')
    .replace(/; R turns it\./, '; the panel below turns it.').replace(/Right-click or /g, '').replace(/ or press Esc/g, '');
  statusText.textContent = t;
}
function updateMeta() {
  const doors = state.openings.filter(o => o.type !== 'window').length, wins = state.openings.length - doors;
  statusMeta.textContent = `${state.items.length} pieces · ${state.walls.length} walls · ${doors} doors · ${wins} windows · sizes in feet`;
}

/* ---------- Resize & render loop ---------- */
const FRUSTUM = 50;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); if (typeof sizeWalkCam === 'function') sizeWalkCam();
  const aspect = w / h; const fh = aspect < 1 ? FRUSTUM / aspect * 0.75 : FRUSTUM;
  camera.left = (-fh * aspect) / 2; camera.right = (fh * aspect) / 2; camera.top = fh / 2; camera.bottom = -fh / 2;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

function renderFrame() {
  const cam = view === 'walk' ? walkCam : camera;
  updateCompass(cam);
  renderer.render(scene, cam);
}
const wallDoneEl = document.getElementById('wallDone');
function loop(now) { const wd = !(mode === 'wall' && wallStart); if (wallDoneEl.hidden !== wd) wallDoneEl.hidden = wd; if (view === 'walk') updateWalk(now || performance.now()); else controls.update(); watchFurnitureShadows(now || 0); renderFrame(); requestAnimationFrame(loop); }

setSun();
try {
  const r = JSON.parse(localStorage.getItem(STORE_KEY + '-reveal2') || 'null');
  if (r) { wallH = r.wallH || 6.5; fullH = r.fullH || 10; reveal = r.reveal || 'low'; }
} catch (e) { /* ignore */ }
wallHIn.value = wallH; wallHOut.textContent = wallH + ' ft'; fullHIn.value = fullH; fullHOut.textContent = fullH + ' ft';
applyLookChrome();
rebuildAll();
if (document.fonts && document.fonts.load) document.fonts.load('56px "Architects Daughter"').then(buildDims).catch(() => {});
setView('iso');
setReveal(reveal);
setMode('select');
{ let b = null; try { b = localStorage.getItem(STORE_KEY + '-browse'); } catch (e) { /* ignore */ }
  setBrowsing(b != null ? b === '1' : window.matchMedia('(max-width: 860px)').matches); }
fitView();
paintRanges();
setStatus(state.items.length ? 'Your flat is loaded with sample furniture. Click a piece to move, turn or restyle it.' : HINTS.select);
loop();
})();
