#!/usr/bin/env python3
"""oracle_intro.py OUT.npy [TMAX]: per-frame ORACLE of the intro effect (frame function 0x10275f .. ret 0x1029d4, orders 0-1).
Runs the whole original from the start (harness virtual clock), and for every call of 0x10275f stores
 pre : t,row,order (dwords 0x200ab9/abd/ac1 as the main loop stored them), persistent state 0x20f29e (last anim time), 0x20f2aa (anim offset), 0x20f2da (noise LFSR), 0x20f2a2/a6 (page offsets)
 post: displayed frame (320x400 indices through CRTC start/stride) + DAC (768 B, 6-bit) read at the ret, + state again + irq count + virtual time."""
import sys,struct,numpy as np
import harness as H,emucore as E,vga
from emucore import *
out=sys.argv[1]; tmax=float(sys.argv[2]) if len(sys.argv)>2 else 16
d4=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0]
SV=[0x200ab9,0x200abd,0x200ac1,0x20f29e,0x20f2aa,0x20f2da,0x20f2a2,0x20f2a6,0x20f2e6]
fr=[]; pend=[None]
def pre(uc,a,sz,_): pend[0]=dict(pre=[d4(x) for x in SV],irqs=H.irqs[0],clk=H.clock())
def post(uc,a,sz,_):
    if pend[0] is None: return
    ix,pal=vga.frame_idx(); p=pend[0]; p['post']=[d4(x) for x in SV]; p['idx']=ix.copy(); p['pal']=np.frombuffer(pal,np.uint8).copy()
    fr.append(p); pend[0]=None
mu.hook_add(UC_HOOK_CODE,pre,begin=0x10275f,end=0x10275f)
mu.hook_add(UC_HOOK_CODE,post,begin=0x1029d4,end=0x1029d4)
mu.reg_write(UC_X86_REG_EIP,E.ENTRY)
H.run_until(tmax)
np.save(out,np.array(fr,dtype=object),allow_pickle=True); print(len(fr),'frames; clock',H.clock())
