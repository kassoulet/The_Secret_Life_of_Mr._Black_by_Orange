// Scene 4 (IT orders 8-9, ~58-72 s): red/orange particle ring. Port of the frame function 0x1010e8 (init 0x10159e 0x100996), same cloud as fx03 (cloud.js) but the points are first shifted
// by w*0x80 (wrap at 16 bit), the depth gets + (x^2+y^2)>>14 + an offset that drifts in order 9 from row 0x30, and the buffer is shown through a 16 KB colour table (buffer<<8 | picture).
// Feedback buffer -> replayed from the scene start. Tables come from the oracle's first call (tools/export_s03_04.py -> assets/s04.bin).
import { PAD, SZ, project, blur } from './cloud.js';
let T, pts, pic, tab, pal0, acc0, b300, A, B, acc, b30, last;
export const scr = new Uint8Array(64000);
export async function init() {
  const u = new Uint8Array(await (await fetch('assets/s04.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  const i32 = (o, n) => Int32Array.from({ length: n }, (_, i) => dv.getInt32(o + 4 * i, true));
  let o = 0; T = i32(o, 5122); o += 5122 * 4; pts = i32(o, 6144); o += 6144 * 4; pic = u.subarray(o, o += 64000); tab = u.subarray(o, o += 16384); pal0 = u.subarray(o, o += 768);
  acc0 = dv.getInt32(o, true); b300 = dv.getInt32(o + 4, true); reset();
}
export function reset() { A = new Uint8Array(SZ); B = new Uint8Array(SZ); acc = acc0; b30 = b300; last = null; }
export function call(w, order, row) {
  w |= 0; const S = i => T[i], sx = k => Math.imul(w, k) >> 10 & 0xfff, a = (w + 0x4000) >> 10 & 0xfff;
  if (order === 9 && row >= 0x30) b30 = (b30 + acc - w) | 0;
  acc = w;
  let n = Math.imul(w, 4) >> 10; n = n > 0x800 ? 0x800 : n + 1;
  project(A, T, pts, n, { o10: S(sx(6)) << 4, o08: S(sx(5)) << 4, o0c: S(sx(7)) << 4, a1c: a, a20: a, a24: a, m: S(a), pre: Math.imul(w, 0x80), z: (x, y, z) => (z + ((Math.imul(x, x) + Math.imul(y, y)) >> 14) + b30) | 0 });
  blur(A, B); [A, B] = [B, A];
  for (let i = 0; i < 64000; i++) scr[i] = tab[A[PAD + i] << 8 | pic[i]];
  return pal0;
}
// Player: calls every DT word units (oracle mean, machine dependent); word = 0 at clock T0 (the oracle's first call); order/row derived from the word (9 rows/s, 64 rows per order).
export let T0 = 57.3777, DT = 1871.5, next = 0;
export function render(t, ctx) {
  const W = (t - T0) * 65536, k = W < 0 ? 0 : Math.floor(W / DT) + 1;
  if (k < next) { reset(); next = 0; }
  while (next < k) { const w = Math.round(next * DT), r = Math.floor(w * 9 / 65536); last = call(w, 8 + (r >> 6), r & 63); next++; }
  ctx.h = 200;
  if (!last) { ctx.idx.fill(0, 0, 64000); return; }
  ctx.idx.set(scr); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(last[i] * 255 / 63);
}
