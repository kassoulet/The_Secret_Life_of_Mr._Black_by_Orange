// check_fx08.mjs [ORACLE_DIR=re/oracle16]: fx08 (orders 16-17) vs the oracle, per frame (time word t as read by the original): node re/check_fx08.mjs
import fs from 'fs';import {init,frame} from '../web/fx/fx08.js';
globalThis.fetch=async u=>({arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../web/'+u,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}});
const dir=process.argv[2]||new URL('oracle16/',import.meta.url).pathname,meta=JSON.parse(fs.readFileSync(dir+'/meta.json')),idx=fs.readFileSync(dir+'/idx.bin'),pal=fs.readFileSync(dir+'/pal.bin');
await init();const o=new Uint8Array(64000);let bad=0,badpal=0,badf=0;
meta.forEach((m,k)=>{o.fill(0);frame(m.t|0,o);let d=0;for(let i=0;i<64000;i++)if(o[i]!==idx[k*64000+i])d++;bad+=d;if(d&&badf++<5)console.log('frame',k,'t',m.t,'diff px',d)});
console.log(meta.length,'frames; differing pixels:',bad);process.exit(bad?1:0);
