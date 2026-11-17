// Scene 5 (IT orders 10-11, ~72-86 s): glowing blob spiral + scrolling pi digits. Port of the frame function 0x10314d (init 0x101590 0x1034da 0x102c16, params 0x10300a, scroller 0x103542).
// Per call: params (blob.js) -> 256 blits of the blob (radius shrinks by 4 per blob) on A -> scroller update (0x103542, 384x64 strip buffer) -> DAC = pal*fade[row]>>8 ->
// screen = A/2, rows 90..159 add scroller/2 (saturating) -> A downscaled (every 2nd pixel, rows bottom-up, /2 - /2/32) and tiled 2x2 into B -> swap.
// State accumulates (feedback + scroller position), so the player replays from the scene start. Tables from the oracle's first call (tools/export_s04_10.py -> assets/s05.bin).
import { V, params, blit, w32, u32 } from './blob.js';
let D;
export async function init() {
  const u = new Uint8Array(await (await fetch('assets/s05.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  let o = 0; const take = n => { const r = u.subarray(o, o + n); o += n; return r; };
  D = { O: new Int32Array(0x1ada + 5122).map((_, i) => dv.getInt32(4 * i, true)) }; D.T = D.O.subarray(0x1ada); o = (0x1ada + 5122) * 4;
  D.st = new Int32Array(0xa0 / 4).map((_, i) => dv.getInt32(o + 4 * i, true)); o += 0xa0;
  D.spr = take(0x2800); D.fade = new Int32Array(256).map((_, i) => dv.getInt32(o + 4 * i, true)); o += 0x400; D.pal = take(768);
  D.scr = take(0x800); D.file = take(0xc800 + 0x400);
  D.first = new Int32Array(take(8).slice().buffer);   // [esi, ebp] raw at the first iteration of the first call (informational)
  reset();
}
// raw (unmasked) table indices of the first blob can reach below the table: read the data object (as dumped at the first call), 0 outside
const TT = i => (i >= -0x1ada && i < 5122 ? D.O[i + 0x1ada] : 0);

let mem, A, B, st, sc, strip, pal, nextCall;   // sc = scroller variables 0x212680 + 4*i
export function reset() { mem = new Uint8Array(0x2800 + 2 * 0xfa00 + 0x2000); mem.set(D.spr); A = 0x2800; B = 0x2800 + 0xfa00; st = Int32Array.from(D.st); sc = D.scr.slice(); strip = new Uint8Array(0x15c00); nextCall = 0; pal = new Uint8Array(768); }
const SV = a => a - 0x212680;   // byte offset in sc
const gs = a => u32(sc, SV(a)) | 0, ps = (a, v) => w32(sc, SV(a), v);
function scroller(w) {   // 0x103542
  ps(0x212694, gs(0x212694) + (w >>> 14));
  ps(0x212690, 0);
  const saved = gs(0x212694); ps(0x2126a0, 0); ps(0x212688, 0);
  for (let guard = 0; guard < 1000; guard++) {
    const ch = sc[SV(0x2129e9) + gs(0x21269c) + gs(0x2126a0)];
    ps(0x212698, gs(0x2126a4 + ch * 4));
    if (gs(0x212688) !== 0) ps(0x212694, 0);
    let ebx = gs(0x212698) + gs(0x212690);
    if (ebx > 0x180) { ebx = 0x180 - gs(0x212690); ps(0x212698, ebx); }
    ps(0x21268c, 0);
    if (gs(0x212690) >= 0) {
      ps(0x212688, 1);
      let dst = gs(0x212690), src = 0; for (let k = 0; k < ch; k++) src += gs(0x2126a4 + k * 4);
      src += gs(0x212694); const n = gs(0x212698) - gs(0x212694);
      if (n > 0) for (let r = 0; r < 64; r++) for (let x = 0; x < n; x++) strip[dst + r * 0x180 + x] = D.file[src + r * 0x320 + x];
    }
    ps(0x2126a0, gs(0x2126a0) + 1);
    ebx = gs(0x212698) - gs(0x212694);
    if (ebx <= 0) ps(0x21268c, 1);
    ps(0x212690, gs(0x212690) + ebx);
    if (gs(0x212690) >= 0x180) break;
  }
  ps(0x212694, saved);
  if (gs(0x21268c) === 1) { ps(0x21269c, gs(0x21269c) + 1); ps(0x212694, 0); }
}
export const scr = new Uint8Array(64000);
export function call(w, row) {
  w |= 0; params(st, D.T, w);
  const g = a => st[V(a)];
  let esi = g(0x211d2c), ebp = g(0x211d24);   // raw (unmasked) for the first blob only
  const x0 = g(0x211d34), y0 = g(0x211d38), x1 = g(0x211d3c), y1 = g(0x211d40);
  for (let n = 0; n < 256; n++) {
    const edx = 0x400 - 4 * n + ((TT(ebp) + 0x400) >> 4);
    const X = (Math.imul(Math.imul(TT(esi), 0x64) >> 10, edx) >> 10) + 0x90, Y = (Math.imul(Math.imul(TT(esi + 0x401), 0x50) >> 10, edx) >> 10) + 0x54;
    blit(mem, A, X, Y, x0, y0, x1, y1);
    esi = (esi + 0x30) & 0xfff; ebp = (ebp + 0x20) & 0xfff;
  }
  scroller(w);
  const f = D.fade[row];
  for (let i = 0; i < 768; i++) pal[i] = Math.min(0x3f, Math.imul(D.pal[i], f) >>> 8);
  for (let i = 0; i < 64000; i++) {
    let v = mem[A + i] >> 1;
    if (i >= 28800 && i < 51200) { const j = i - 28800, q = strip[0x40 + ((j / 320) | 0) * 0x180 + j % 320] >> 1; v += q; if (v > 255) v = 255; }
    scr[i] = v;
  }
  for (let r = 0; r < 100; r++) for (let c = 0; c < 40; c++) {
    const s = A + (199 - 2 * r) * 320 + c * 8;
    let v = ((mem[s] | mem[s + 2] << 8 | mem[s + 4] << 16 | mem[s + 6] << 24) >>> 1) & 0x7f7f7f7f; v -= (v >>> 5) & 0x07070707;
    const d = B + r * 320 + c * 4; w32(mem, d, v); w32(mem, d + 160, v); w32(mem, d + 32000, v); w32(mem, d + 32160, v);
  }
  [A, B] = [B, A];
  return pal;
}
// Player: the oracle's calls came every ~4682 word units on average (14 fps, machine dependent); word 0 at clock T0; rows 9/s (fade index, 64 per order).
export const T0 = 71.714758, DT = 4680.2;
let last = null;
export function render(t, ctx) {
  const W = (t - T0) * 65536, k = W < 0 ? 0 : Math.floor(W / DT) + 1;
  if (k < nextCall) { reset(); last = null; }
  while (nextCall < k) { const w = Math.round(nextCall * DT); last = call(w, Math.floor(w * 9 / 65536) % 64); nextCall++; }
  ctx.h = 200;
  if (!last) { ctx.idx.fill(0, 0, 64000); return; }
  ctx.idx.set(scr); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(last[i] * 255 / 63);
}
