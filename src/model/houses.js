import { startingLayouts } from './starting-layouts.js';

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
  template: () => structuredClone(startingLayouts.btm),
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
  template: () => structuredClone(startingLayouts.sunny)
};

export const HOUSES = { btm, sunny };
export const HOUSE_IDS = Object.keys(HOUSES);
export const houseOf = layout => HOUSES[layout?.house] || btm;
