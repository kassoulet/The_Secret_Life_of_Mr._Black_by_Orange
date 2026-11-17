// check_fx12.mjs [ORACLE_DIR=re/oracle24]: fx12 replayed over the oracle's calls (t,row,order) vs displayed frame + DAC: node re/check_fx12.mjs
import fs from 'fs';import {init,call,frame} from '../web/fx/fx12.js';
globalThis.fetch=async u=>({arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../web/'+u,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}});
const dir=process.argv[2]||new URL('oracle24/',import.meta.url).pathname,meta=JSON.parse(fs.readFileSync(dir+'/meta.json')),idx=fs.readFileSync(dir+'/idx.bin'),pal=fs.readFileSync(dir+'/pal.bin');
await init();const o=new Uint8Array(64000);let bad=0,badpal=0,badf=0;
meta.forEach((m,k)=>{const p=call(m.t|0,m.row,m.order);frame(o);let d=0;for(let i=0;i<64000;i++)if(o[i]!==idx[k*64000+i])d++;for(let i=0;i<768;i++)if(p[i]!==pal[k*768+i])badpal++;bad+=d;if(d&&badf++<5)console.log('frame',k,'t',m.t,'diff px',d)});
console.log(meta.length,'frames; differing pixels:',bad,'palette bytes:',badpal);process.exit(bad||badpal?1:0);
