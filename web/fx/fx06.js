// Scene 06 (IT orders 12-14, ~86-108 s: swirling light-trail flowers): port of the frame function 0x101834 (shared point-cloud code in trail.js). Feedback buffer, so the player replays from the scene start.
// Tables and the initial variables come from the oracle's first call (tools/export_s06_11.py -> assets/s06.bin).
import { PAD, SZ, frame, blur } from './trail.js';
const im = Math.imul;
let T, st0, tab, pic, pal0, A, B, st, last;
export const scr = new Uint8Array(64000);
export async function init() {
  const u = new Uint8Array(await (await fetch('assets/s06.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  const i32 = (o, n) => Int32Array.from({ length: n }, (_, i) => dv.getInt32(o + 4 * i, true));
  let o = 0; T = i32(o, 5122); o += 5122 * 4; const v = i32(o, 8); o += 32; tab = u.subarray(o, o += 16384); pic = u.subarray(o, o += 64000); pal0 = u.subarray(o, o += 768);
  st0 = { s5f4: v[0], s5f8: v[1], s5fc: v[2], s600: v[3], s604: v[4], s608: v[5], s638: v[6], prev: v[7] }; reset();
}
export function reset() { A = new Uint8Array(SZ); B = new Uint8Array(SZ); st = { ...st0 }; last = null; }
const cfg = { passes: 64, inner: 64, lcg0: 0x5c23, sh: 16, ox: 0x9f80, oy: 0x6380, fix: (q, o) => (q + o) >> 8, r: p => 0x80 + 8 * p, c: p => 0x1500 - 0x50 * p,
  ang: (s, c) => [-(im(s.s5f4, c) >> 12) + (s.s600 >> 17), -(im(s.s5f8, c) >> 12) + (s.s604 >> 17), -(im(s.s5fc, c) >> 12) + (s.s608 >> 17)] };
export function call(w) {
  w |= 0; frame(A, T, st, cfg); blur(A, B, 3); [A, B] = [B, A];
  for (let i = 0; i < 64000; i++) scr[i] = tab[A[PAD + i] << 8 | pic[i]];
  const S = i => T[i & 0xfff], d = (w - st.prev) | 0;
  st.s5f4 = S(w >> 10); st.s5f8 = S(im(w, -3) >> 10); st.s5fc = S(im(w, 2) >> 10);
  st.s604 = (st.s604 + im(d, st.s5f8)) | 0; st.s600 = (st.s600 + im(d, st.s5f4)) | 0; st.s608 = (st.s608 + im(d, st.s5fc)) | 0; st.prev = w; st.s638 = 0x7ff;
  return pal0;
}
// Player: calls DT word units apart (oracle mean; the time word runs backwards here: -1 at clock T0, then -65536/s); seek = restore the nearest checkpoint (every 25 calls) and replay.
export let T0 = 86.0546, DT = 1872.2, next = 0;
const ck = new Map();
export function render(t, ctx) {
  const W = (t - T0) * 65536, k = W < 0 ? 0 : Math.floor(W / DT) + 1;
  if (k < next) {
    let b = 0; for (const j of ck.keys()) if (j <= k && j > b) b = j;
    if (b) { const c = ck.get(b); A = c.A.slice(); B = c.B.slice(); st = { ...c.st }; next = b; last = pal0; } else { reset(); next = 0; }
  }
  while (next < k) {
    if (next % 25 === 0 && next && !ck.has(next)) ck.set(next, { A: A.slice(), B: B.slice(), st: { ...st } });
    last = call(-1 - Math.round(next * DT)); next++;
  }
  ctx.h = 200;
  if (!last) { ctx.idx.fill(0, 0, 64000); return; }
  ctx.idx.set(scr); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(last[i] * 255 / 63);
}
