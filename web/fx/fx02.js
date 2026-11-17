// Scene 2 (IT orders 4-5, ~29-44 s): green rings. Port of the frame function 0x102ce6 (init 0x104e26 0x102c16, params 0x10300a).
// Per call: params from the previous call's time word (0x10300a) -> 256 additive-saturating blits of a 32x32 blob (clipped to 320x200) on buffer A ->
// DAC = pal*fade[row]>>8 -> screen = A/2 + kk table (saturating) -> A downscaled (every 2nd pixel/row, /2) and tiled 2x2 into B -> swap A/B.
// State accumulates (feedback), so the player replays from the scene start. Tables come from the oracle's first call (tools/export_s04_10.py -> assets/s02.bin).
import { V, params, blit, w32 } from './blob.js';
let D;
export async function init() {
  const u = new Uint8Array(await (await fetch('assets/s02.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  let o = 0; const take = n => { const r = u.subarray(o, o + n); o += n; return r; };
  D = { T: new Int32Array(5122).map((_, i) => dv.getInt32(4 * i, true)) }; o = 5122 * 4;
  D.st = new Int32Array(0xa0 / 4).map((_, i) => dv.getInt32(o + 4 * i, true)); o += 0xa0;
  D.spr = take(0x2800); D.fade = new Int32Array(256).map((_, i) => dv.getInt32(o + 4 * i, true)); o += 0x400; D.pal = take(768); D.kk = take(64000);
  reset();
}
const S = i => D.T[i], C = i => D.T[i + 0x401];
let mem, A, B, st, nextCall, pal;   // mem = blob (0x2800) | A (0xfa00) | B (0xfa00) | slack; st = variables 0x211cf0 + 4*i
export function reset() { mem = new Uint8Array(0x2800 + 2 * 0xfa00 + 0x2000); mem.set(D.spr); A = 0x2800; B = 0x2800 + 0xfa00; st = Int32Array.from(D.st); nextCall = 0; pal = new Uint8Array(768); }
// one call with the time word w, row -> returns the 6-bit DAC; the frame is mem[A .. A+64000) before the downscale, kept in `scr`
export const scr = new Uint8Array(64000);
export function call(w, row) {
  w |= 0; params(st, D.T, w);
  const g = a => st[V(a)];
  let esi = g(0x211d20), edx = g(0x211d24) << 1, ebp = g(0x211d2c);
  const x0 = g(0x211d34), y0 = g(0x211d38), x1 = g(0x211d3c), y1 = g(0x211d40);
  for (let n = 0; n < 256; n++) {
    let r = ((S((edx >>> 2) & 0xfff) + 0x400 + S((ebp >>> 2) & 0xfff) + 0x400 + 0x400) >> 1), i = esi & 0xfff;
    let X = (Math.imul(Math.imul(S(i), 0x64) >> 10, r) >> 11) + 0x90, Y = (Math.imul(Math.imul(C(i), 0x50) >> 10, r) >> 11) + 0x54;
    blit(mem, A, X, Y, x0, y0, x1, y1);
    esi += 0x30; ebp += 0x2000; edx += g(0x211d18);
  }
  const f = D.fade[row];
  for (let i = 0; i < 768; i++) pal[i] = Math.min(0x3f, Math.imul(D.pal[i], f) >>> 8);
  for (let i = 0; i < 64000; i++) { const v = (mem[A + i] >> 1) + D.kk[i]; scr[i] = v > 255 ? 255 : v; }
  for (let r = 0; r < 100; r++) for (let c = 0; c < 40; c++) {
    const s = A + r * 640 + c * 8, v = ((mem[s] | mem[s + 2] << 8 | mem[s + 4] << 16 | mem[s + 6] << 24) >>> 1) & 0x7f7f7f7f, d = B + r * 320 + c * 4;
    w32(mem, d, v); w32(mem, d + 160, v); w32(mem, d + 32000, v); w32(mem, d + 32160, v);
  }
  [A, B] = [B, A];
  return pal;
}
// Player: the oracle's calls came every 4682.3 word units on average (14 fps, machine dependent, 3729..5624); word = 1 at clock T0; rows 9/s (fade index).
export const T0 = 28.75844, DT = 4682.3;
let last = null;
export function render(t, ctx) {
  const W = (t - T0) * 65536, k = W < 1 ? 0 : Math.floor((W - 1) / DT) + 1;
  if (k < nextCall) { reset(); last = null; }
  while (nextCall < k) { const w = 1 + Math.round(nextCall * DT); last = call(w, Math.floor(w * 9 / 65536) % 64); nextCall++; }
  ctx.h = 200;
  if (!last) { ctx.idx.fill(0, 0, 64000); return; }
  ctx.idx.set(scr); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(last[i] * 255 / 63);
}
