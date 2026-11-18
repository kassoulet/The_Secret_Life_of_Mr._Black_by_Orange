// Scene 0 (intro, orders 0-1). Replays the recorded per-frame inputs [virtual clock s, time word, row, order] (assets/intro_frames.json,
// captured from the original running under Unicorn) through the literal port in intro.js. Accumulating state => seek = replay from frame 0 (~1 ms/frame).
import { init as mk, step, pageIdx } from './intro.js';
let A, st, k;
const get = async (n, j) => { const r = await fetch('assets/' + n); return j ? r.json() : new Uint8Array(await r.arrayBuffer()); };
export async function init() { A = { ani: await get('pallo64.ani'), pal: await get('intro_pal.bin'), tab: await get('intro_tab.json', 1), fr: await get('intro_frames.json', 1) }; st = null; }
export function render(t, ctx) {
  const F = A.fr; let n = 0; while (n + 1 < F.length && F[n + 1][0] <= t) n++;
  if (!st || n < k) { st = mk(A); k = -1; }
  // time word = elapsed music clock (65536/s); the oracle's word is 0xF1.. = negative as int32, so its scroll branch never fires (see re/NOTES.md)
  while (k < n) { k++; step(st, (F[k][0] * 65536) >>> 0, F[k][2], F[k][3]); }
  ctx.h = 400; ctx.idx.set(pageIdx(st, st.a2));      // page drawn by the previous frame = what the CRT showed during frame k
  for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(st.pal[i] * 255 / 63);
}
