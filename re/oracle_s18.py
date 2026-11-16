#!/usr/bin/env python3
"""oracle_s18.py OUTDIR [TMAX]: ORACLE of scene 18 (wire-frame room, frame function 0x1054bf .. ret 0x105837, orders 18-19): per call t/row/order read at entry ([0x200ab9/abd/ac1]),
displayed frame + DAC at the ret; static memory dumped at the first call (OUTDIR/mem.npz: vertices 0x214b22 (96x3 i32), edges 0x215422 (96x2 i32), z offset 0x214b06, sine table 0x206b68, shade table [0x214ae0] (16 KB), background [0x214adc] (64000), DAC)."""
import sys,os,struct,numpy as np
import harness as H,emucore as E,vga
from emucore import *
out=sys.argv[1]; tmax=float(sys.argv[2]) if len(sys.argv)>2 else 145; os.makedirs(out,exist_ok=True)
d4=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0]
rd=lambda a,n:bytes(mu.mem_read(a,n))
fr=[]; pend=[None]; mem={}
def pre(uc,a,sz,_):
    if not mem:
        mem.update(verts=rd(0x214b22,96*12),edges=rd(0x215422,96*8),zoff=rd(0x214b06,4),sine=rd(0x206b68,0x5008),t=rd(d4(0x214ae0),0x4000),bg=rd(d4(0x214adc),64000),
                   ptrs=np.array([d4(0x214ae0),d4(0x214adc),d4(0x215822)]))
    pend[0]=dict(t=d4(0x200ab9),row=d4(0x200abd),order=d4(0x200ac1),irqs=H.irqs[0],clk=H.clock())
def post(uc,a,sz,_):
    if pend[0] is None: return
    ix,pal=vga.frame_idx(); p=pend[0]; p['idx']=ix.copy(); p['pal']=np.frombuffer(pal,np.uint8).copy(); fr.append(p); pend[0]=None
mu.hook_add(UC_HOOK_CODE,pre,begin=0x1054bf,end=0x1054bf)
mu.hook_add(UC_HOOK_CODE,post,begin=0x105837,end=0x105837)
mu.reg_write(UC_X86_REG_EIP,E.ENTRY)
H.run_until(tmax)
np.savez(out+'/mem.npz',**{k:(np.frombuffer(v,np.uint8) if isinstance(v,bytes) else v) for k,v in mem.items()})
meta=[dict(t=p['t'],row=p['row'],order=p['order'],irqs=p['irqs'],clk=p['clk']) for p in fr]
import json; json.dump(meta,open(out+'/meta.json','w'))
open(out+'/idx.bin','wb').write(b''.join(p['idx'].tobytes() for p in fr)); open(out+'/pal.bin','wb').write(b''.join(p['pal'].tobytes() for p in fr))
print(len(fr),'frames; clock',H.clock())
