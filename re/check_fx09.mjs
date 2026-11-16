// check_fx09.mjs [ORACLE_DIR=re/oracle18]: fx09 (orders 18-19) vs the oracle, per frame (time word t as read by the original): node re/check_fx09.mjs
import fs from 'fs';import {init,frame} from '../web/fx/fx09.js';
globalThis.fetch=async u=>({arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../web/'+u,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}});
const dir=process.argv[2]||new URL('oracle18/',import.meta.url).pathname,meta=JSON.parse(fs.readFileSync(dir+'/meta.json')),idx=fs.readFileSync(dir+'/idx.bin');
await init();const o=new Uint8Array(64000);let bad=0,badf=0;
meta.forEach((m,k)=>{frame(m.t|0,o);let d=0;for(let i=0;i<64000;i++)if(o[i]!==idx[k*64000+i])d++;bad+=d;if(d&&badf++<5)console.log('frame',k,'t',m.t,'diff px',d)});
console.log(meta.length,'frames; differing pixels:',bad);process.exit(bad?1:0);
