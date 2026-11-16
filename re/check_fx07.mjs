// check_fx07.mjs: fx07 vs the golden PNG t0110 (needs python3 + PIL to dump the golden RGB): node re/check_fx07.mjs
import fs from 'fs';import {execSync} from 'child_process';import {init,render} from '../web/fx/fx07.js';
globalThis.fetch=async u=>({arrayBuffer:async()=>{const b=fs.readFileSync(new URL('../web/'+u,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}});
await init();const ctx={idx:new Uint8Array(128000),pal:new Uint8Array(768)};render(110,ctx);
const g=execSync(`python3 -c "import sys;from PIL import Image;sys.stdout.buffer.write(Image.open('${new URL('golden/t0110.00.png',import.meta.url).pathname}').convert('RGB').tobytes())"`,{maxBuffer:1<<20});
let bad=0;for(let p=0;p<64000;p++)for(let c=0;c<3;c++){const v=ctx.pal[ctx.idx[p]*3+c],q=g[p*3+c];if(Math.abs(v-q)>2)bad++}
console.log('samples differing by more than 2/255 (6-bit -> 8-bit scaling):',bad);process.exit(bad?1:0);
