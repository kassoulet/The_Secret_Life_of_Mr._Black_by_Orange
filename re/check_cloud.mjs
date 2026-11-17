// check_cloud.mjs SCENE(03|04|06|11) ORACLE_DIR NAME(s3|s4|s6|s11): replay a cloud scene over the oracle's calls (t,row,order) vs the displayed frame + DAC.
import fs from 'fs';
const [sc, dir, nm] = process.argv.slice(2), m = await import(`../web/fx/fx${sc}.js`);
globalThis.fetch = async u => ({ arrayBuffer: async () => { const b = fs.readFileSync(new URL('../web/' + u, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) } });
const meta = JSON.parse(fs.readFileSync(`${dir}/${nm}_meta.json`)), idx = fs.readFileSync(`${dir}/${nm}_idx.bin`), pal = fs.readFileSync(`${dir}/${nm}_pal.bin`);
await m.init(); let bad = 0, badpal = 0, badf = 0; const t0 = Date.now();
meta.forEach((q, k) => {
  const p = m.call(q.t | 0, q.order, q.row); let d = 0;
  for (let i = 0; i < 64000; i++) if (m.scr[i] !== idx[k * 64000 + i]) d++;
  for (let i = 0; i < 768; i++) if (p[i] !== pal[k * 768 + i]) badpal++;
  bad += d; if (d && badf++ < 5) console.log('frame', k, 't', q.t, 'row', q.row, 'order', q.order, 'diff px', d);
});
console.log(meta.length, 'frames; differing pixels:', bad, 'palette bytes:', badpal, (Date.now() - t0) + ' ms'); process.exit(bad || badpal ? 1 : 0);
