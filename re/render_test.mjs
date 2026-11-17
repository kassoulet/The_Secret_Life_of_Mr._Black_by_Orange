// render_test.mjs NN T : calls fxNN.render(T) (cold, then +0.5 s) and prints timings + a hash of the frame: node re/render_test.mjs 03 55
import fs from 'fs';
globalThis.fetch = async u => ({ arrayBuffer: async () => { const b = fs.readFileSync(new URL('../web/' + u, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) } });
const m = await import(`../web/fx/fx${process.argv[2]}.js`), t = +process.argv[3]; await m.init();
const ctx = { idx: new Uint8Array(128000), pal: new Uint8Array(768), h: 200 }, h = () => { let x = 0; for (let i = 0; i < 64000; i++) x = (x * 31 + ctx.idx[i]) | 0; return x };
for (const tt of [t, t + 0.5, t]) { const a = Date.now(); m.render(tt, ctx); console.log(tt, Date.now() - a, 'ms hash', h()); }
