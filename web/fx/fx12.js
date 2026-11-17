// Scene 12 (IT orders 24-25, ~172 s to the end): blur feedback of ~645 dots. Port of the frame function 0x106263 (init 0x1061cd).
// Per call: (1) blur A -> B: per 8 bytes, raw unaligned dword adds with carry across bytes of the 4 neighbours (+-4 bytes... +-0x500 = 4 rows), >>2 & 0x3f3f3f3f, minus (v>>3-ish); swap A/B;
//  (2) DAC = min(63, pal*k>>8), k = 256 (order 25: fade table[row]); (3) 0x1060b2: every point (x, -y) * (0x2000 - min(0x2000, w>>7)) >> 12 + (160, 100), if on screen add a 16x16 sprite (one of 16, cycling) by dword adds (carry) at that pixel; (4) copy A to the screen.
// The buffer is a feedback (A depends on all previous calls), so the state is replayed from the scene start; the calls happen at a machine dependent rate (the oracle's mean spacing is used for the player).
let D; const u32 = (u, o) => (u[o] | u[o + 1] << 8 | u[o + 2] << 16 | u[o + 3] << 24) | 0;
const w32 = (u, o, v) => { u[o] = v; u[o + 1] = v >> 8; u[o + 2] = v >> 16; u[o + 3] = v >> 24; };
export async function init() {
  const u = new Uint8Array(await (await fetch('assets/s24.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  D = { pts: new Int32Array(0x285 * 2).map((_, i) => dv.getInt32(4 * i, true)), spr: u.subarray(5160, 5160 + 0x1500), pal: u.subarray(5160 + 0x1500, 5160 + 0x1500 + 768), fade: new Int32Array(256).map((_, i) => dv.getInt32(5160 + 0x1500 + 768 + 4 * i, true)) };
  reset();
}
let buf, A, B, nextCall;
export function reset() { buf = new Uint8Array(0x3e800 + 16); A = 0x7d00; B = 0x17700; nextCall = 0; }
export const calls = () => nextCall;
// one call with the time word t, row, order -> returns the DAC (6 bit); the frame is buf[A..A+64000)
export function call(w, row, order) {
  for (let e = 0; e < 0x1f40; e++) {
    const s = A + 8 * e;
    let a = (u32(buf, s - 4) + u32(buf, s + 4) + u32(buf, s - 0x500) + u32(buf, s + 0x500)) | 0, d = (u32(buf, s) + u32(buf, s + 8) + u32(buf, s - 0x4fc) + u32(buf, s + 0x504)) | 0;
    a = (a >>> 2) & 0x3f3f3f3f; d = (d >>> 2) & 0x3f3f3f3f;
    let b = (a >>> 2) & 0x3f3f3f3f, c = (d >>> 2) & 0x3f3f3f3f; b = (b >>> 1) & 0x3f3f3f3f; c = (c >>> 1) & 0x3f3f3f3f;
    w32(buf, B + 8 * e, a - b); w32(buf, B + 8 * e + 4, d - c);
  }
  [A, B] = [B, A];
  const k = order === 25 ? D.fade[row] : 0x100, pal = new Uint8Array(768);
  for (let i = 0; i < 768; i++) pal[i] = Math.min(63, (D.pal[i] * k) >>> 8);
  const sc = 0x2000 - Math.min(0x2000, w >> 7); let cnt = w >> 5;
  for (let i = 0; i < 0x285; i++, cnt += 0x40) {
    let x = (Math.imul(D.pts[2 * i], sc) >> 12) + 0xa0, y = (Math.imul(-D.pts[2 * i + 1], sc) >> 12) + 0x64;
    if (x < 0 || y < 0 || x > 0x12f || y > 0xb7) continue;
    let p = A + y * 320 + x, q = ((cnt >> 8) & 15) * 16;
    for (let r = 0; r < 16; r++, p += 320, q += 320) for (let j = 0; j < 16; j += 4) w32(buf, p + j, u32(buf, p + j) + u32(D.spr, q + j));
  }
  return pal;
}
export const frame = out => out.set(buf.subarray(A, A + 64000));
// Player: the oracle's calls came every 938.56 word units (14.3 ms, one per timer IRQ pair; machine dependent) from word 4; order 25 starts at word ~597700 (row = 18382 units each, measured, +-1 call).
export const T0 = 171.9233 - 4 / 65536, DT = 938.56, W25 = 597700;
let last = null;
export function render(t, ctx) {
  const k = Math.max(0, Math.floor(((t - T0) * 65536 - 4) / DT) + 1);   // calls done so far
  if (k < nextCall) reset();
  while (nextCall < k) { const w = Math.round(4 + nextCall * DT); last = call(w, Math.min(8, Math.max(0, Math.floor((w - W25) / 18382))), w >= W25 ? 25 : 24); nextCall++; }
  ctx.h = 200; frame(ctx.idx);
  if (last) for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(last[i] * 255 / 63);
}
