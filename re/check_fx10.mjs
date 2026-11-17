// check_fx10.mjs [ORACLE_DIR=re/oracle20]: fx10 (orders 20-21) vs the oracle, per frame (time word t as read by the original): node re/check_fx10.mjs
import fs from 'fs';import {init,frame,pal6} from '../web/fx/fx10.js';
globalThis.fetch=async u=>({arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../web/'+u,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}});
const dir=process.argv[2]||new URL('oracle20/',import.meta.url).pathname,meta=JSON.parse(fs.readFileSync(dir+'/meta.json')),idx=fs.readFileSync(dir+'/idx.bin'),pal=fs.readFileSync(dir+'/pal.bin');
await init();const o=new Uint8Array(64000);let bad=0,badpal=0,badf=0;
meta.forEach((m,k)=>{o.fill(0);frame(m.t|0,o);let d=0;const pp=pal6(m.t|0);for(let i=0;i<768;i++)if(pp[i]!==pal[k*768+i])badpal++;for(let i=0;i<64000;i++)if(o[i]!==idx[k*64000+i])d++;bad+=d;if(d&&badf++<5)console.log('frame',k,'t',m.t,'diff px',d)});
console.log(meta.length,'frames; differing pixels:',bad,'palette bytes:',badpal);process.exit(bad||badpal?1:0);
