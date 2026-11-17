// Scene timetable + 4:3 sizing helpers (no DOM). Scene starts = IT order change times seen in the Unicorn run (re/golden, re/NOTES.md), rounded to 1 s.
export const DUR = 183.3;
export const FX = [[0,'intro'],[15,'eye picture'],[28.7584,'green rings'],[44,'particle cloud'],[58,'particle ring'],[71.7148,'spiral tiles'],[86,'light trails'],
  [107.48,'picture'],[114.61,'photo + ghost'],[128.97,'wire-frame room'],[143.2857,'eye zoom'],[158,'starburst'],[171.9233,'fade-out text']]
  .map(([t0,name],i,a)=>({i,t0,t1:i+1<a.length?a[i+1][0]:DUR,name}));
export const fxAt = t => { let k = 0; for (const e of FX) if (t >= e.t0) k = e.i; return k; };
export const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
export function displaySize(availW, availH, dpr = 1) {
  const fitW = Math.min(availW, availH * 4 / 3) * dpr, k = Math.floor(fitW / 320);
  const w = (k >= 1 ? 320 * k : fitW) / dpr;
  return { w, h: w * 3 / 4 };
}
