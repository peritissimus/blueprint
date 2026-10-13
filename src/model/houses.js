// Houses the app knows about. Each layout document names its house (`layout.house`);
// layouts without one predate this field and are the BTM flat.
// Plan coordinates are feet: x to the right of the drawing, z down the drawing.

const P = (x, y) => [+((x - 70) / 26).toFixed(3), +((y - 70) / 26).toFixed(3)];

const btm = {
  id: 'btm',
  name: 'BTM 3BHK',
  subtitle: 'BTM 3BHK · east entrance',
  // The main door faces east, which is the top edge of the plan, so north is to the plan's left.
  east: [0, -1], north: [-1, 0],
  lat: 12.97, solarNoon: 12.33,
  footprint: [[356, 161], [590, 161], [590, 70], [980, 70], [980, 1084], [70, 1084], [70, 408], [356, 408]].map(([x, y]) => P(x, y)),
  wet: [[200, 928, 356, 1084], [655, 785, 785, 1019], [655, 1019, 980, 1084], [902, 395, 980, 707]].map(([x1, y1, x2, y2]) => [P(x1, y1), P(x2, y2)]),
  walk: [18.2, 6.6, Math.PI]
};

/* Hallmark Sunny Side, ground floor, 1345 sq ft (registration plan).
   Room sizes are the clear dimensions printed on the plan:
     top row     Guest bed 12'7½"×10'0" · Common toilet 4'10½"×6'4¾" · Children's bed 12'0"×10'0"
     middle row  Sit-out 4'3"×10'4" · Dining 12'11"×10'4" · Drawing 12'4"×10'4" (dining and drawing are one hall)
     bottom row  Master bed 13'5½"×11'3½" · Attached toilet 5'5"×8'0½" · Kitchen 10'8"×7'10½" with a 3'5" wash behind it
   Wall centrelines: outer walls 0.6 ft, inner walls 0.36 ft. The corridor and main door are on the right;
   the top, left and bottom are open to sky, and the sit-out on the left has a railing.
   The plan carries no north arrow: the top of the plan is taken as north, so the main door faces east. */
const X = 30.83, Z = 32.94;
const sunny = {
  id: 'sunny',
  name: 'Sunny Side',
  subtitle: 'Sunny Side 3BHK · 1345 sq ft',
  east: [1, 0], north: [0, -1],
  lat: 17.39, solarNoon: 12.27,
  footprint: [[0, 0], [X, 0], [X, Z], [0, Z]],
  wet: [
    [[13.29, 0.3], [18.17, 6.7]],      // common toilet
    [[14.12, 24.6], [19.54, 32.64]],   // attached toilet
    [[19.9, 29.6], [30.53, 32.64]],    // wash
    [[0.3, 10.66], [4.55, 20.99]]      // sit-out
  ],
  walk: [28.6, 13.8, Math.PI / 2],
  template() {
    const W = (x1, z1, x2, z2, kind) => ({ a: [x1, z1], b: [x2, z2], kind: kind || 'int' });
    const walls = [
      W(0, 0, X, 0, 'ext'), W(X, 0, X, Z, 'ext'), W(X, Z, 0, Z, 'ext'), W(0, Z, 0, 21.17, 'ext'),
      W(0, 21.17, 0, 10.48, 'railing'), W(0, 10.48, 0, 0, 'ext'),
      W(13.11, 0, 13.11, 10.48), W(18.345, 0, 18.345, 10.48), W(13.11, 6.88, 18.345, 6.88),   // common toilet and its passage
      W(0, 10.48, 13.11, 10.48), W(18.345, 10.48, X, 10.48),                                 // bedrooms / hall
      W(4.73, 10.48, 4.73, 21.17),                                                           // sit-out / dining
      W(0, 21.17, 13.94, 21.17), W(17.6, 21.17, X, 21.17),                                   // hall / bottom row
      W(13.94, 21.17, 13.94, Z), W(13.94, 24.42, 19.72, 24.42), W(19.72, 24.42, 19.72, Z),   // attached toilet and lobby
      W(19.72, 29.41, X, 29.41)                                                              // kitchen / wash
    ];
    const D = (a, b, hinge, swing, extra) => Object.assign({ type: 'door', a, b, hinge, swing }, extra || {});
    const Wn = (a, b, sill) => ({ type: 'window', a, b, sill: sill == null ? 3 : sill });
    const openings = [
      D([X, 12.0], [X, 15.4], 0, [-1, 0], { wood: true }),   // main door from the corridor
      D([13.11, 7.3], [13.11, 10.1], 1, [-1, 0]),             // guest bedroom
      D([18.345, 7.3], [18.345, 10.1], 1, [1, 0]),            // children's bedroom
      D([14.4, 6.88], [16.9, 6.88], 0, [0, -1]),              // common toilet
      D([10.6, 21.17], [13.6, 21.17], 1, [0, 1]),             // master bedroom
      D([13.94, 27.0], [13.94, 29.5], 0, [1, 0]),             // attached toilet, from the master bedroom
      D([21.0, 29.41], [23.6, 29.41], 0, [0, 1]),             // wash, from the kitchen
      { type: 'double', a: [4.73, 13.2], b: [4.73, 17.2], hinge: 0, swing: [-1, 0] },   // sit-out
      Wn([4, 0], [9, 0]), Wn([22.5, 0], [27.5, 0]), Wn([14.5, 0], [16.6, 0], 6),
      Wn([10.5, Z], [13.0, Z]), Wn([16.4, Z], [18.0, Z], 6), Wn([21.0, Z], [30.0, Z]),
      Wn([X, 21.9], [X, 24.6]), Wn([X, 17.6], [X, 20.3]),
      Wn([0, 7.13], [0, 9.63]), Wn([0, 22.44], [0, 26.44]) // left bedroom windows
    ];
    const R = Math.PI, H = Math.PI / 2;
    let n = 0;
    const I = (type, x, z, rot, finish, extra) => Object.assign({ id: 'i' + (++n), type, x, z, rot: rot || 0 }, finish ? { finish } : {}, extra || {});
    const items = [
      // Guest bedroom
      I('queenBed', 7.1, 6.85, R, 'oak'), I('bedside', 3.8, 9.55, R, 'oak'), I('bedside', 10.4, 9.55, R, 'oak'),
      I('wardrobe', 1.3, 3.7, H, 'walnut', { w: 6.5 }),
      // Common toilet
      I('shower', 16.0, 1.75, 0, 'white', { w: 3.4, d: 2.6 }), I('wc', 17.25, 4.6, -H), I('basin', 14.1, 4.7, H, 'white'),
      // Children's bedroom
      I('queenBed', 25.0, 6.85, R, 'oak'), I('bedside', 21.7, 9.55, R, 'oak'), I('bedside', 28.3, 9.55, R, 'oak'),
      I('wardrobe', 19.53, 3.7, H, 'walnut', { w: 6 }),
      // Hall: crockery unit, dining for six, drawing room facing the TV wall
      I('sideboard', 9.5, 11.5, 0, 'walnut'),
      I('dining6', 11.3, 15.9, H, 'walnut'),
      I('tvUnit', 24.0, 11.36, 0, 'wenge'), I('wallTV', 24.0, 10.96, 0),
      I('rug', 24.0, 15.9, 0, 'clay', { w: 8, d: 5.4 }),
      I('sofa3', 24.0, 19.35, R, 'linen'), I('coffeeTable', 24.0, 15.9, 0, 'oak'),
      I('armchair', 19.3, 15.6, H, 'linen'), I('armchair', 28.75, 17.9, -H, 'linen'),
      I('doormat', 29.45, 13.7, H, 'clay', { w: 3, d: 1.8 }),
      // Sit-out
      I('swing', 2.45, 13.0, H), I('plant', 1.2, 19.9, 0, 'clay'), I('plant', 3.7, 20.1, 0, 'white'),
      // Master bedroom
      I('kingBed', 7.0, 29.15, R, 'oak'), I('bedside', 3.25, 31.9, R, 'oak'), I('bedside', 10.75, 31.9, R, 'oak'),
      I('wardrobe', 5.4, 22.35, 0, 'walnut', { w: 8.5 }),
      // Lobby basin and attached toilet
      I('basin', 14.95, 22.8, H, 'white'),
      I('shower', 18.0, 26.2, 0, 'white', { w: 2.8, d: 2.8 }), I('wc', 15.6, 31.9, R), I('basin', 18.75, 30.0, -H, 'white'),
      // Kitchen along the corridor wall, fridge by the wash door
      I('counter', 29.5, 25.3, -H, 'charcoal', { w: 7.6 }), I('kitchenSink', 29.5, 23.2, -H), I('hob', 29.5, 27.1, -H),
      I('wallCabinet', 30.0, 25.3, -H, 'white', { w: 7.6 }),
      I('fridge', 26.2, 28.05, R, 'white'),
      // Wash
      I('washer', 29.3, 31.55, R), I('utilitySink', 26.7, 31.6, R, 'white')
    ];
    return { house: 'sunny', walls, openings, items, labels: [], baseFloor: true, nextId: n + 1 };
  }
};

export const HOUSES = { btm, sunny };
export const HOUSE_IDS = Object.keys(HOUSES);
export const houseOf = layout => HOUSES[layout?.house] || btm;
