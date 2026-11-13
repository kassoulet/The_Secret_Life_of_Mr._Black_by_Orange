import assert from 'node:assert/strict';
import { FX, DUR, fxAt, displaySize } from './web/timetable.js';
assert.equal(FX.length, 13); FX.forEach((e, i) => { assert.equal(fxAt(e.t0 + 0.01), i); if (i) assert.equal(fxAt(e.t0 - 0.01), i - 1); });
assert.equal(fxAt(DUR - 0.01), 12);
assert.deepEqual(displaySize(1000, 1000, 1), { w: 960, h: 720 });
console.log('ok');
