// Scene 11 (IT orders 22-23, ~158-172 s: starburst with colour trails): port of the frame function 0x101d10 (shared point-cloud code in trail.js). Feedback buffer, so the player replays from the scene start.
// Tables and the initial variables come from the oracle's first call (tools/export_s06_11.py -> assets/s11.bin).
import { PAD, SZ, frame, blur } from './trail.js';
const im = Math.imul;
let fadeT, T, st0, tab, pic, pal0, A, B, st, last;
export const scr = new Uint8Array(64000);
export async function init() {
  const u = new Uint8Array(await (await fetch('assets/s11.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  const i32 = (o, n) => Int32Array.from({ length: n }, (_, i) => dv.getInt32(o + 4 * i, true));
  let o = 0; T = i32(o, 5122); o += 5122 * 4; const v = i32(o, 8); o += 32; tab = u.subarray(o, o += 16384); pic = u.subarray(o, o += 64000); pal0 = u.subarray(o, o += 768); fadeT = i32(o, 64);
  st0 = { s5f4: v[0], s5f8: v[1], s5fc: v[2], s600: v[3], s604: v[4], s608: v[5], s638: v[6], prev: v[7] }; reset();
}
export function reset() { A = new Uint8Array(SZ); B = new Uint8Array(SZ); st = { ...st0 }; last = null; }
const cfg = { passes: 64, inner: 128, lcg0: 1, sh: 8, ox: 0xa0, oy: 0x64, fix: (q, o) => q + o, r: p => (0x1000 + (p * (p + 1) * (2 * p + 1)) / 6) >> 5, c: p => 0x400 - 16 * p,
  ang: (s, c) => [im(s.s5f4, c) >> 11, im(s.s5f8, c) >> 11, im(s.s5fc, c) >> 11] };
export function call(w, order = 22, row = 0) {
  w |= 0; frame(A, T, st, cfg); blur(A, B, 2); [A, B] = [B, A];
  for (let i = 0; i < 64000; i++) scr[i] = tab[A[PAD + i] << 8 | pic[i]];
  const S = i => T[i & 0xfff];
  st.s5f4 = S(im(w, 11) >> 10); st.s5f8 = S(im(w, -13) >> 10); st.s5fc = S(im(w, 12) >> 10); st.prev = w; st.s638 = 0x7ff;
  if (order !== 24) return pal0;   // order 24 (the last calls): fade = table[row] + sine wobble, clamped at 0
  let f = fadeT[row] + ((T[(w >> 7) & 0xfff] - 0x400) >> 5); if (f < 0) f = 0;
  return pal0.map(v => im(v, f) >> 8 & 255);
}
// Player: calls DT word units apart (oracle mean; the time word runs backwards here: 0 at clock T0 (the oracle first call; scene 6: -1), then -65536/s); seek = restore the nearest checkpoint (every 25 calls) and replay.
export let T0 = 157.6028, DT = 2814.9, next = 0;
const ck = new Map();
export function render(t, ctx) {
  const W = (t - T0) * 65536, k = W < 0 ? 0 : Math.floor(W / DT) + 1;
  if (k < next) {
    let b = 0; for (const j of ck.keys()) if (j <= k && j > b) b = j;
    if (b) { const c = ck.get(b); A = c.A.slice(); B = c.B.slice(); st = { ...c.st }; next = b; last = pal0; } else { reset(); next = 0; }
  }
  while (next < k) {
    if (next % 25 === 0 && next && !ck.has(next)) ck.set(next, { A: A.slice(), B: B.slice(), st: { ...st } });
    { const w = -Math.round(next * DT), r = Math.floor(-w * 9 / 65536); last = call(w, 22 + (r >> 6), r & 63); } next++;
  }
  ctx.h = 200;
  if (!last) { ctx.idx.fill(0, 0, 64000); return; }
  ctx.idx.set(scr); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(last[i] * 255 / 63);
}
