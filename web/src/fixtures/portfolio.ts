/** Portfolio preview — FICTIONAL data for eight test hotels.
 *  Deterministic (seeded) so every open shows the same numbers. Replaced by
 *  GET /portfolio when the backend aggregation lands (spec: ENGINEERING_LOG
 *  2026-09-10 "MULTIPROPERTY PORTFOLIO VIEW — SPEC FROZEN"). */

/* who sees the "Portfolio · preview" entry in the hotel picker */
export const PORTFOLIO_PREVIEW_EMAILS: string[] = ['dk@bi-automations.com'];

export interface PMonth { m: number; open: boolean; avail: number; rnLY: number; revLY: number; rnTY: number; revTY: number; rnST: number; revST: number }
export interface PBlock { rnTY: number; revTY: number; rnLY: number; revLY: number; avail: number }
export interface PPickup { rn: number; rev: number; cancel: number; cancelRev: number }
export interface PDay { m: number; dom: number; dow: number; ty: number; st: number; avail: number }
export interface PHotel {
  id: string; name: string; short: string; place: string; rooms: number;
  stale: string | null; closedNow: boolean; reportDate: string;
  months: PMonth[]; yd: PBlock; mtd: PBlock; ytd: PBlock;
  pickup: Record<number, PPickup>; next: PDay[];
}
export interface PortfolioData {
  groupName: string; reportDate: string; reportLabel: string; cur: number; elapsed: number; hotels: PHotel[];
}

type Shape = { occ: Record<number, number>; adr: Record<number, number> };
const SHAPE: Record<string, Shape> = {
  seasonal: { occ: { 4: .42, 5: .61, 6: .84, 7: .93, 8: .96, 9: .82, 10: .55 }, adr: { 4: .5, 5: .6, 6: .75, 7: .9, 8: 1, 9: .72, 10: .5 } },
  city: { occ: { 1: .52, 2: .55, 3: .64, 4: .78, 5: .84, 6: .82, 7: .74, 8: .70, 9: .86, 10: .83, 11: .66, 12: .60 }, adr: { 1: .62, 2: .64, 3: .7, 4: .8, 5: .88, 6: .9, 7: .82, 8: .8, 9: .95, 10: .9, 11: .72, 12: .68 } },
  mountain: { occ: { 11: .48, 12: .78, 1: .85, 2: .82, 3: .66, 4: .40 }, adr: { 11: .6, 12: .95, 1: 1, 2: .95, 3: .75, 4: .5 } },
};
const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const STLY_FRAC: Record<number, number> = { 9: .93, 10: .78, 11: .60, 12: .50 };
const CUR = 9, ELAPSED = 9;   // report date = yesterday = Wed 9 Sep 2026; today Thu 10 Sep

interface Spec {
  id: string; name: string; short: string; place: string; rooms: number; shape: string; peak: number; adr: number; seed: number;
  stale?: string; ytd: { rn: number; adr: number }; mtd: { rn: number; adr: number }; yd: { rn: number; adr: number };
  pace: Record<number, number>; pickup: number; cancel: number; dip?: number[];
}
const SPEC: Spec[] = [
  { id: 'aegean', name: 'Aegean Pearl Resort', short: 'Aegean Pearl', place: 'Halkidiki', rooms: 167, shape: 'seasonal', peak: .96, adr: 236, seed: 11, ytd: { rn: .03, adr: .05 }, mtd: { rn: .02, adr: .04 }, yd: { rn: -.03, adr: .06 }, pace: { 9: .03, 10: -.06, 11: 0, 12: 0 }, pickup: 1.0, cancel: .12 },
  { id: 'thalassa', name: 'Thalassa Suites', short: 'Thalassa Suites', place: 'Crete', rooms: 92, shape: 'seasonal', peak: .94, adr: 262, seed: 23, ytd: { rn: .05, adr: .07 }, mtd: { rn: .06, adr: .05 }, yd: { rn: .04, adr: .08 }, pace: { 9: .07, 10: .11, 11: 0, 12: 0 }, pickup: 1.25, cancel: .08 },
  { id: 'olive', name: 'Olive Grove Hotel', short: 'Olive Grove', place: 'Corfu', rooms: 58, shape: 'seasonal', peak: .90, adr: 148, seed: 37, ytd: { rn: -.02, adr: .03 }, mtd: { rn: -.05, adr: .02 }, yd: { rn: -.08, adr: .01 }, pace: { 9: -.04, 10: -.09, 11: 0, 12: 0 }, pickup: .8, cancel: .15, dip: [14, 15, 16] },
  { id: 'meltemi', name: 'Meltemi Beach', short: 'Meltemi Beach', place: 'Rhodes', rooms: 210, shape: 'seasonal', peak: .97, adr: 198, seed: 41, ytd: { rn: -.04, adr: -.02 }, mtd: { rn: -.09, adr: -.03 }, yd: { rn: -.11, adr: -.01 }, pace: { 9: -.08, 10: -.12, 11: 0, 12: 0 }, pickup: .85, cancel: .14 },
  { id: 'kastro', name: 'Kastro Boutique', short: 'Kastro Boutique', place: 'Nafplio', rooms: 34, shape: 'city', peak: .86, adr: 172, seed: 53, ytd: { rn: .06, adr: .04 }, mtd: { rn: .08, adr: .03 }, yd: { rn: .10, adr: .02 }, pace: { 9: .05, 10: .04, 11: .09, 12: .06 }, pickup: 1.1, cancel: .07 },
  { id: 'lefka', name: 'Lefka Ori Lodge', short: 'Lefka Ori', place: 'Crete mountains', rooms: 46, shape: 'mountain', peak: .85, adr: 188, seed: 67, ytd: { rn: .04, adr: .06 }, mtd: { rn: 0, adr: 0 }, yd: { rn: 0, adr: 0 }, pace: { 9: 0, 10: 0, 11: .14, 12: .08 }, pickup: .35, cancel: .05 },
  { id: 'portara', name: 'Portara Bay', short: 'Portara Bay', place: 'Naxos', rooms: 124, shape: 'seasonal', peak: .93, adr: 176, seed: 71, stale: '2026-09-07', ytd: { rn: .01, adr: .04 }, mtd: { rn: .03, adr: .03 }, yd: { rn: .02, adr: .05 }, pace: { 9: .02, 10: -.03, 11: 0, 12: 0 }, pickup: .9, cancel: .11 },
  { id: 'athena', name: 'Athena Urban', short: 'Athena Urban', place: 'Athens', rooms: 150, shape: 'city', peak: .88, adr: 164, seed: 83, ytd: { rn: .02, adr: .08 }, mtd: { rn: .01, adr: .09 }, yd: { rn: -.01, adr: .11 }, pace: { 9: .03, 10: .06, 11: .02, 12: -.03 }, pickup: 1.15, cancel: .09 },
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(s: Spec): PHotel {
  const r = rng(s.seed), jit = (k: number) => (r() - .5) * 2 * k;
  const sh = SHAPE[s.shape];
  const scale = s.peak / Math.max(...Object.values(sh.occ));
  const open = (m: number) => sh.occ[m] != null;
  const months: PMonth[] = [];
  for (let m = 1; m <= 12; m++) {
    const occLY = open(m) ? sh.occ[m] * scale : 0, adrLY = open(m) ? sh.adr[m] * s.adr : 0;
    const rnLY = s.rooms * DAYS[m] * occLY, revLY = rnLY * adrLY;
    let rnTY: number, revTY: number, rnST: number, revST: number;
    if (m < CUR) {
      rnTY = rnLY * (1 + s.ytd.rn + jit(.03)); revTY = rnTY * adrLY * (1 + s.ytd.adr + jit(.02)); rnST = rnLY; revST = revLY;
    } else {
      const f = STLY_FRAC[m]; rnST = rnLY * f * (1 + jit(.01)); revST = rnST * adrLY;
      const p = s.pace[m] ?? 0; rnTY = rnST * (1 + p + jit(.01)); revTY = rnTY * adrLY * (1 + s.ytd.adr * .6 + jit(.015));
    }
    months.push({ m, open: open(m), avail: open(m) ? s.rooms * DAYS[m] : 0, rnLY, revLY, rnTY, revTY, rnST, revST });
  }
  const o9 = open(CUR) ? sh.occ[CUR] * scale : 0, a9 = open(CUR) ? sh.adr[CUR] * s.adr : 0;
  const mtdRnLY = s.rooms * ELAPSED * o9;
  const mtd: PBlock = { rnLY: mtdRnLY, revLY: mtdRnLY * a9, rnTY: mtdRnLY * (1 + s.mtd.rn), revTY: 0, avail: open(CUR) ? s.rooms * ELAPSED : 0 };
  mtd.revTY = mtd.rnTY * a9 * (1 + s.mtd.adr);
  const ydRnLY = s.rooms * o9 * (1 + jit(.02));
  const yd: PBlock = { rnLY: ydRnLY, revLY: ydRnLY * a9, rnTY: s.rooms * o9 * (1 + s.yd.rn), revTY: 0, avail: open(CUR) ? s.rooms : 0 };
  yd.revTY = yd.rnTY * a9 * (1 + s.yd.adr);
  const past = months.filter(x => x.m < CUR);
  const ytd: PBlock = {
    rnLY: past.reduce((a, x) => a + x.rnLY, 0) + mtd.rnLY, revLY: past.reduce((a, x) => a + x.revLY, 0) + mtd.revLY,
    rnTY: past.reduce((a, x) => a + x.rnTY, 0) + mtd.rnTY, revTY: past.reduce((a, x) => a + x.revTY, 0) + mtd.revTY,
    avail: past.reduce((a, x) => a + x.avail, 0) + mtd.avail,
  };
  const firstOpen = Number(Object.keys(sh.adr)[0]);
  const fAdr = (open(10) ? sh.adr[10] : sh.adr[firstOpen]) * s.adr;
  const base = s.rooms * .085 * s.pickup;
  const pickup: Record<number, PPickup> = {};
  for (const w of [1, 3, 7, 14]) {
    const rn = Math.round(base * w * (1 + jit(.15)));
    const c = Math.round(rn * s.cancel * (1 + jit(.3)));
    pickup[w] = { rn, rev: rn * fAdr, cancel: c, cancelRev: c * fAdr };
  }
  const dayF = [.97, 1.02, 1.05, 1.04, .96, .92, .99];
  const next: PDay[] = [];
  for (let d = 0; d < 30; d++) {
    const day = 10 + d; const m = day <= 30 ? 9 : 10; const dom = day <= 30 ? day : day - 30;
    const oLY = open(m) ? sh.occ[m] * scale : 0; const frac = Math.max(.35, .97 - .012 * d);
    const st = oLY * frac;
    let ty = Math.min(.99, st * (1 + (s.pace[m] ?? 0)) * dayF[d % 7] * (1 + jit(.03)));
    if (s.dip?.includes(d)) ty *= .38;
    next.push({ m, dom, dow: (4 + d) % 7, ty: open(m) ? ty : 0, st: open(m) ? st : 0, avail: open(m) ? s.rooms : 0 });
  }
  return {
    id: s.id, name: s.name, short: s.short, place: s.place, rooms: s.rooms,
    stale: s.stale ?? null, closedNow: !open(CUR), reportDate: s.stale ?? '2026-09-09',
    months, yd, mtd, ytd, pickup, next,
  };
}

let cache: PortfolioData | null = null;
export function buildPortfolioFixture(): PortfolioData {
  if (!cache) cache = { groupName: 'Aegean Hospitality Group', reportDate: '2026-09-09', reportLabel: 'Wed, Sep 9', cur: CUR, elapsed: ELAPSED, hotels: SPEC.map(build) };
  return cache;
}
