// check_fx05.mjs [ORACLE_DIR=re/oracle04_10]: fx05 (orders 10-11) replayed over the oracle's calls (t,row) vs the displayed frame + DAC: node re/check_fx05.mjs
import fs from 'fs';import {init,call,scr} from '../web/fx/fx05.js';
globalThis.fetch=async u=>({arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../web/'+u,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}});
const dir=process.argv[2]||new URL('oracle05/',import.meta.url).pathname,meta=JSON.parse(fs.readFileSync(dir+'/b_meta.json')),idx=fs.readFileSync(dir+'/b_idx.bin'),pal=fs.readFileSync(dir+'/b_pal.bin');
await init();let bad=0,badpal=0,badf=0;
meta.forEach((m,k)=>{const p=call(m.t|0,m.row);let d=0;for(let i=0;i<64000;i++)if(scr[i]!==idx[k*64000+i])d++;for(let i=0;i<768;i++)if(p[i]!==pal[k*768+i])badpal++;bad+=d;if(d&&badf++<5)console.log('frame',k,'t',m.t,'diff px',d)});
console.log(meta.length,'frames; differing pixels:',bad,'palette bytes:',badpal);process.exit(bad||badpal?1:0);
