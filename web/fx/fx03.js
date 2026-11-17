// Scene 3 (IT orders 6-7, ~44-58 s): white particle cloud. Port of the frame function 0x100b9c (init 0x102ffc 0x100ab2): 1..2048 points of a fixed table (0x200b38), rotated/bent
// by the time word, splatted into a feedback buffer, blurred with decay (0x100856 / 0x101053), shown as buffer + picture (dword add with carry between bytes) with a time-driven palette.
// State accumulates (feedback buffer), so the player replays from the scene start. Tables come from the oracle's first call (tools/export_s03_04.py -> assets/s03.bin).
import { PAD, SZ, project, blur } from './cloud.js';
let T, pts, pic, zadd, A, B, last;
export const scr = new Uint8Array(64000);
export async function init() {
  const u = new Uint8Array(await (await fetch('assets/s03.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  const i32 = (o, n) => Int32Array.from({ length: n }, (_, i) => dv.getInt32(o + 4 * i, true));
  T = i32(0, 5122); pts = i32(5122 * 4, 6144); pic = u.subarray(5122 * 4 + 6144 * 4, 5122 * 4 + 6144 * 4 + 64000); zadd = dv.getInt32(5122 * 4 + 6144 * 4 + 64000, true);
  reset();
}
export function reset() { A = new Uint8Array(SZ); B = new Uint8Array(SZ); last = null; }
// one call with the time word w -> 6-bit DAC (768); frame in `scr`
export function call(w) {
  const sx = (k) => Math.imul(w, k) >> 10 & 0xfff, S = i => T[i], a = (w >>> 10) & 0xfff;
  let n = Math.imul(w, 0x20) >> 10; n = n > 0x800 ? 0x800 : n + 1;
  project(A, T, pts, n, { o10: S(sx(6)) << 4, o08: S(sx(5)) << 4, o0c: S(sx(7)) << 4, a1c: a, a20: a, a24: a, m: S(a), z: (x, y, z) => z + zadd });
  const pal = new Uint8Array(768), i0 = [sx(0xe), sx(0xb), sx(-29)];
  for (let e = 0; e < 256; e++) for (let c = 0; c < 3; c++) { let v = Math.imul(S(i0[c]) + 0x4400, e) >> 13; if (v >= 0x3f) v = 0x3f; pal[e * 3 + c] = v; }
  blur(A, B); [A, B] = [B, A];
  for (let i = 0; i < 64000; i += 4) {
    const o = PAD + i, s = (A[o] | A[o + 1] << 8 | A[o + 2] << 16 | A[o + 3] << 24) + (pic[i] | pic[i + 1] << 8 | pic[i + 2] << 16 | pic[i + 3] << 24) | 0;
    scr[i] = s; scr[i + 1] = s >> 8; scr[i + 2] = s >> 16; scr[i + 3] = s >> 24;
  }
  return pal;
}
// Player: the oracle's calls came every DT word units on average (machine dependent); word = 0 at clock T0 (the oracle's first call).
export let T0 = 43.1199, DT = 1793.2, next = 0;
export function render(t, ctx) {
  const W = (t - T0) * 65536, k = W < 0 ? 0 : Math.floor(W / DT) + 1;
  if (k < next) { reset(); next = 0; }
  while (next < k) { last = call(Math.round(next * DT)); next++; }
  ctx.h = 200;
  if (!last) { ctx.idx.fill(0, 0, 64000); return; }
  ctx.idx.set(scr); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(last[i] * 255 / 63);
}
