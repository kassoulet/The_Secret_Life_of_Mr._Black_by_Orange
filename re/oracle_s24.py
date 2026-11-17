#!/usr/bin/env python3
"""oracle_s24.py OUTDIR [TMAX]: ORACLE of scene 12 (blur feedback + dot sprites, frame function 0x106263 .. ret 0x1063ab, orders 24-25): per call t/row/order read at entry, displayed frame + DAC at the ret; static memory dumped at the first call (OUTDIR/mem.npz: points 0x217a1d (0x285 x/y i32 pairs), sprites 0x216380, palette 0x219281, fade table 0x218e5d, buffer pointers and the 0x3e800-byte buffer area)."""
import sys,os,struct,numpy as np
import harness as H,emucore as E,vga
from emucore import *
out=sys.argv[1]; tmax=float(sys.argv[2]) if len(sys.argv)>2 else 184; os.makedirs(out,exist_ok=True)
d4=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0]
rd=lambda a,n:bytes(mu.mem_read(a,n))
fr=[]; pend=[None]; mem={}
def pre(uc,a,sz,_):
    if not mem:
        mem.update(pts=rd(0x217a1d,0x285*8),spr=rd(0x216380,0x1500),pal=rd(0x219281,768),fade=rd(0x218e5d,0x400),bufs=np.array([d4(0x217a0d),d4(0x217a11)]),
                   buf=rd(d4(0x217a0d)-0x7d00,0x3e800))
    pend[0]=dict(t=d4(0x200ab9),row=d4(0x200abd),order=d4(0x200ac1),irqs=H.irqs[0],clk=H.clock())
def post(uc,a,sz,_):
    if pend[0] is None: return
    ix,pal=vga.frame_idx(); p=pend[0]; p['idx']=ix.copy(); p['pal']=np.frombuffer(pal,np.uint8).copy(); fr.append(p); pend[0]=None
mu.hook_add(UC_HOOK_CODE,pre,begin=0x106263,end=0x106263)
mu.hook_add(UC_HOOK_CODE,post,begin=0x1063ab,end=0x1063ab)
mu.reg_write(UC_X86_REG_EIP,E.ENTRY)
H.run_until(tmax)
np.savez(out+'/mem.npz',**{k:(np.frombuffer(v,np.uint8) if isinstance(v,bytes) else v) for k,v in mem.items()})
meta=[dict(t=p['t'],row=p['row'],order=p['order'],irqs=p['irqs'],clk=p['clk']) for p in fr]
import json; json.dump(meta,open(out+'/meta.json','w'))
open(out+'/idx.bin','wb').write(b''.join(p['idx'].tobytes() for p in fr)); open(out+'/pal.bin','wb').write(b''.join(p['pal'].tobytes() for p in fr))
print(len(fr),'frames; clock',H.clock())
