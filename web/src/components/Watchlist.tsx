/** My Watchlist — the section on Today and the "Watch something" sheet.
 *  Rendering only: every number and status comes from lib/watch.ts
 *  (deterministic slots over the payload + yesterday's row). */
import { useMemo, useState } from 'react';
import type { Briefing } from '../types';
import { SectionLabel, LabelSub, EyeIcon } from './Overview';
import { Sheet } from './Sheets';
import {
  computeWatchLine, watchableMonths, weekendPreset, softRuns, rangeKey, rangeTitle, isoAdd,
  watchSeries, watchStatusHistory, netRoomsFromSeries, dayLabel,
  STATUS_LABEL, WATCH_CAP, RANGE_HORIZON_DAYS,
  type WatchItem, type WatchLine, type WatchKind, type WatchStatus, type WatchPoint, type Seg,
} from '../lib/watch';

const TONE: Record<WatchStatus, { bg: string; fg: string }> = {
  new:       { bg: '#0F2860', fg: '#fff' },
  improving: { bg: '#E3F6EE', fg: '#0B8A5C' },
  passed:    { bg: '#E3F6EE', fg: '#0B8A5C' },
  worsening: { bg: '#FBE7E7', fg: '#C43A3A' },
  steady:    { bg: '#E9EDF4', fg: '#5A6780' },
  pending:   { bg: '#E9EDF4', fg: '#5A6780' },
  closed:    { bg: '#FFF1D6', fg: '#8A5A00' },
};

function Pill({ s }: { s: WatchStatus }) {
  const t = TONE[s];
  return <span style={{
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
    borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap', background: t.bg, color: t.fg,
  }}>{STATUS_LABEL[s]}</span>;
}

function Line({ segs }: { segs: Seg[] }) {
  return (
    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#3D4C6F', fontWeight: 600 }}>
      {segs.map((s, i) => typeof s === 'string' ? <span key={i}>{s}</span>
        : 'b' in s ? <b key={i} style={{ color: '#0F2860', fontWeight: 800 }}>{s.b}</b>
        : <span key={i} style={{ color: '#6E7A96', fontWeight: 600 }}>{s.m}</span>)}
    </p>
  );
}

/* ── trend strip: this year vs last year over the stored briefings ─────── */

const NAVY = '#0F2860', BLUE = '#2E7CF7', GREY = '#B8C2D6', RED = '#C43A3A';
const GLYPH: Record<WatchStatus, string> = { new: '·', improving: '▲', worsening: '▼', steady: '—', passed: '✓', closed: '●', pending: '·' };

function Sparkline({ pts, unit }: { pts: WatchPoint[]; unit: 'rooms' | '%' }) {
  const W = 300, H = 72, PX = 8, PY = 10;
  const vals = pts.flatMap(p => (p.ly != null ? [p.ty, p.ly] : [p.ty]));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) { hi = lo + 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const x = (i: number) => PX + (i * (W - 2 * PX)) / Math.max(pts.length - 1, 1);
  const y = (v: number) => H - PY - ((v - lo) / (hi - lo)) * (H - 2 * PY);
  const ty = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.ty).toFixed(1)}`).join(' L');
  const lyPts = pts.map((p, i) => (p.ly != null ? `${x(i).toFixed(1)},${y(p.ly).toFixed(1)}` : null)).filter((s): s is string => !!s);
  const last = pts[pts.length - 1], first = pts[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 72, display: 'block' }}
      aria-label={`${unit === '%' ? 'Booked %' : 'Rooms booked'} over ${pts.length} days: ${first.label} to ${last.label}`}>
      <defs><linearGradient id="wl-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={BLUE} stopOpacity=".18" /><stop offset="1" stopColor={BLUE} stopOpacity="0" /></linearGradient></defs>
      <path d={`M${ty} L${x(pts.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`} fill="url(#wl-area)" />
      {lyPts.length > 1 && <path d={`M${lyPts.join(' L')}`} fill="none" stroke={GREY} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 3" />}
      <path d={`M${ty}`} fill="none" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(0)} cy={y(first.ty)} r="3" fill={BLUE} stroke="#fff" strokeWidth="1.5" />
      <circle cx={x(pts.length - 1)} cy={y(last.ty)} r="4.5" fill={NAVY} stroke="#fff" strokeWidth="2" />
      {last.ly != null && <circle cx={x(pts.length - 1)} cy={y(last.ly)} r="3" fill={GREY} stroke="#fff" strokeWidth="1.5" />}
    </svg>
  );
}

function TrendStrip({ item, briefing, history }: { item: WatchItem; briefing: Briefing; history: Briefing[] | null }) {
  const rows = useMemo(() => (history ? [...history, briefing] : null), [history, briefing]);
  const pts = useMemo(() => (rows ? watchSeries(item, rows) : []), [item, rows]);
  const statuses = useMemo(() => (rows ? watchStatusHistory(item, rows) : []), [item, rows]);
  const muted: React.CSSProperties = { fontSize: 11.5, color: '#6E7A96', fontWeight: 600, padding: '8px 0 2px' };
  if (!rows) return <div style={muted}>Loading the last days…</div>;
  if (pts.length < 2) return <div style={muted}>The trend builds up day by day — one point per morning briefing. Come back tomorrow.</div>;
  const unit = item.kind === 'month' ? 'rooms' : '%';
  const first = pts[0], last = pts[pts.length - 1];
  const fmt = (v: number) => (unit === '%' ? `${Math.round(v)}%` : Math.round(v).toLocaleString('en-US'));
  /* net rooms booked per day: months from today's pickup_daily (per booking
     day, 14 d); ranges — and months without daily rows — from the change in
     rooms on the books between consecutive morning briefings */
  const bars = (() => {
    if (item.kind === 'month') {
      const [y, m] = item.key.split('-').map(Number);
      const daily = (briefing.data.pickup_daily ?? []).filter(r => r.stay_year === y && r.stay_month === m);
      if (daily.length) {
        const byDay = new Map<string, number>();
        for (const r of daily) byDay.set(r.ref_date, (byDay.get(r.ref_date) ?? 0) + r.net_rn);
        return { rows: [...byDay.entries()].sort().slice(-14), src: 'booking day' };
      }
    }
    const d = netRoomsFromSeries(pts);
    return d.length ? { rows: d, src: 'morning briefing' } : null;
  })();
  const mx = bars ? Math.max(1, ...bars.rows.map(([, v]) => Math.abs(v))) : 1;
  const netTotal = bars ? bars.rows.reduce((s, [, v]) => s + v, 0) : 0;
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #EDF0F6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 10.5, fontWeight: 700, color: '#79747E', letterSpacing: '.06em', textTransform: 'uppercase' }}>
        <span>{unit === '%' ? 'Booked' : 'Rooms booked'} · last {pts.length} days</span>
        <span style={{ display: 'inline-flex', gap: 10, textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 3, background: BLUE, borderRadius: 2, verticalAlign: 'middle', marginRight: 4 }} />this year</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 0, borderTop: `2px dashed ${GREY}`, verticalAlign: 'middle', marginRight: 4 }} />last year</span>
        </span>
      </div>
      <Sparkline pts={pts} unit={unit} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#3D4C6F' }}>
        <span>{dayLabel(first.date)} <b style={{ color: NAVY, fontWeight: 800 }}>{fmt(first.ty)}</b></span>
        <span style={{ textAlign: 'right' }}>
          {dayLabel(last.date)} <b style={{ color: NAVY, fontWeight: 800 }}>{fmt(last.ty)}</b>
          {last.ly != null && <span style={{ color: '#6E7A96', fontWeight: 600 }}> · LY {fmt(last.ly)}</span>}
        </span>
      </div>
      {statuses.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 2 }}>
          {statuses.map(s => {
            const t = TONE[s.status];
            return (
              <span key={s.date} title={`${dayLabel(s.date)} · ${STATUS_LABEL[s.status]}`} style={{
                flex: 1, textAlign: 'center', fontSize: 9.5, fontWeight: 800, borderRadius: 6, padding: '3px 0',
                background: t.bg, color: t.fg,
              }}>{GLYPH[s.status]}</span>
            );
          })}
        </div>
      )}
      {bars && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 10.5, fontWeight: 700, color: '#79747E', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            <span>Net rooms booked · per {bars.src} · {bars.rows.length} days</span>
            <b style={{ color: netTotal >= 0 ? NAVY : RED, fontWeight: 800, letterSpacing: 0 }}>{netTotal >= 0 ? '+' : '−'}{Math.abs(netTotal)} total</b>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 34 }}>
            {bars.rows.map(([d, v]) => (
              <span key={d} title={`${dayLabel(d)} · ${v >= 0 ? '+' : ''}${v}`} style={{
                flex: 1, height: Math.max(2, (Math.abs(v) / mx) * 34), borderRadius: 2,
                background: v >= 0 ? BLUE : RED, opacity: v === 0 ? .25 : 1,
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: '#9AA4B8', marginTop: 2 }}>
            <span>{dayLabel(bars.rows[0][0])}</span><span>{dayLabel(bars.rows[bars.rows.length - 1][0])}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WatchCard({ line, briefing, history, onRemove, onTap, onExpand }: {
  line: WatchLine; briefing: Briefing; history: Briefing[] | null;
  onRemove: () => void; onTap: () => void; onExpand: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: '#fff', borderRadius: 18, padding: '13px 14px 10px', marginBottom: 10,
      boxShadow: '0 1px 2px rgba(10,31,77,.05), 0 6px 16px rgba(10,31,77,.06)',
    }}>
      <div onClick={() => { if (!open) onExpand(); setOpen(!open); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, cursor: 'pointer', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.06em', color: '#0F2860', textTransform: 'uppercase', minWidth: 0 }}>
          {line.title}
          {line.item.label && <span style={{ fontWeight: 700, letterSpacing: 0, textTransform: 'none', color: '#5A6780', fontSize: 11.5, marginLeft: 6 }}>{line.item.label}</span>}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Pill s={line.status} />
          <span style={{ color: '#9AA4B8', display: 'inline-flex', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </span>
        </span>
      </div>
      {line.lines.map((l, i) => <Line key={i} segs={l} />)}
      {open && <TrendStrip item={line.item} briefing={briefing} history={history} />}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 6 }}>
        <button onClick={onTap} style={{ border: 'none', background: 'none', padding: '4px 0', fontSize: 11, fontWeight: 700, color: '#2E7CF7' }}>Open in Pace ›</button>
        <button onClick={onRemove} style={{ border: 'none', background: 'none', padding: '4px 0', fontSize: 11, fontWeight: 700, color: '#79747E' }}>Remove</button>
      </div>
    </div>
  );
}

export function WatchlistSection({ briefing, prev, items, history, onLoadHistory, onAdd, onRemove, onTap }: {
  briefing: Briefing; prev: Briefing | null; items: WatchItem[];
  history: Briefing[] | null; onLoadHistory: () => void;
  onAdd: () => void; onRemove: (item: WatchItem) => void; onTap: (line: WatchLine) => void;
}) {
  const lines = useMemo(() => items.map(i => computeWatchLine(i, briefing, prev)), [items, briefing, prev]);
  return (
    <div style={{ marginBottom: 22 }}>
      <SectionLabel icon="eye" info="watch" title="Your watchlist">
        Your watchlist <LabelSub>· {items.length} of {WATCH_CAP}</LabelSub>
      </SectionLabel>
      {lines.map(l => (
        <WatchCard key={l.item.id} line={l} briefing={briefing} history={history} onExpand={onLoadHistory}
          onRemove={() => onRemove(l.item)} onTap={() => onTap(l)} />
      ))}
      {items.length < WATCH_CAP && (
        <button onClick={onAdd} style={{
          width: '100%', border: '1.5px dashed #C9D2E3', background: 'transparent', borderRadius: 14,
          padding: '11px 12px', fontSize: 12.5, fontWeight: 700, color: '#2E7CF7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}><EyeIcon on={false} size={14} />{items.length ? '+ Watch another month or date range' : 'Watch a month or a date range'}</button>
      )}
    </div>
  );
}

/* ── the add sheet ─────────────────────────────────────────────────────── */

const chip = (on: boolean, disabled = false): React.CSSProperties => ({
  fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: '7px 12px',
  border: `1.5px ${disabled ? 'dashed' : 'solid'} ${on ? '#2E7CF7' : '#E2E7F0'}`,
  background: on ? 'rgba(46,124,247,.08)' : '#fff', color: disabled ? '#A8B1C2' : '#0F2860',
});
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: '#79747E', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 6px' };
const field: React.CSSProperties = {
  width: '100%', border: '1.5px solid #E2E7F0', borderRadius: 12, padding: '9px 11px',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#0F2860', background: '#fff', outline: 'none',
};

export function WatchSheet({ open, onClose, briefing, existing, used, onSave }: {
  open: boolean; onClose: () => void; briefing: Briefing;
  existing: Set<string>;                       // "kind:key" already watched
  used: number;
  onSave: (kind: WatchKind, key: string, label: string | null, from: 'sheet') => Promise<void> | void;
}) {
  const rd = briefing.report_date;
  const [kind, setKind] = useState<WatchKind>('month');
  const [month, setMonth] = useState<string | null>(null);
  const [from, setFrom] = useState(() => isoAdd(rd, 1));
  const [to, setTo] = useState(() => isoAdd(rd, 7));
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const months = useMemo(() => watchableMonths(briefing), [briefing]);
  const maxDate = isoAdd(rd, RANGE_HORIZON_DAYS);
  const presets = useMemo(() => {
    const we = weekendPreset(rd);
    const p: { name: string; from: string; to: string; soft?: boolean }[] = [
      { name: 'This weekend', ...we },
      { name: 'Next 7 days', from: isoAdd(rd, 1), to: isoAdd(rd, 7) },
      { name: 'Next 14 days', from: isoAdd(rd, 1), to: isoAdd(rd, 14) },
    ];
    for (const r of softRuns(briefing)) p.push({ name: `${rangeTitle(r.from, r.to)} ⚠ soft`, ...r, soft: true });
    return p;
  }, [briefing, rd]);

  const key = kind === 'month' ? month : (from && to && from <= to ? rangeKey(from, to) : null);
  const rangeOk = kind !== 'range' || (!!key && from >= rd && to <= maxDate);
  const dup = !!key && existing.has(`${kind}:${key}`);
  const full = used >= WATCH_CAP;
  const draft: WatchItem | null = key ? { id: 'draft', hotel_id: '', kind, key, label: label.trim() || null } : null;
  const preview = useMemo(() => draft ? computeWatchLine(draft, briefing, null) : null, [draft?.key, draft?.kind, draft?.label, briefing]); // eslint-disable-line react-hooks/exhaustive-deps
  const canSave = !!key && rangeOk && !dup && !full && !busy;

  const save = async () => {
    if (!canSave || !key) return;
    setBusy(true);
    try { await onSave(kind, key, label.trim() || null, 'sheet'); setMonth(null); setLabel(''); }
    finally { setBusy(false); }
  };

  const seg = (k: WatchKind, text: string) => (
    <button onClick={() => setKind(k)} style={{
      flex: 1, border: 'none', borderRadius: 999, padding: '8px 0', fontSize: 13, fontWeight: 700,
      background: kind === k ? '#fff' : 'transparent', color: kind === k ? '#0F2860' : '#5A6780',
      boxShadow: kind === k ? '0 1px 3px rgba(10,31,77,.15)' : 'none',
    }}>{text}</button>
  );

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ maxHeight: '78vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', color: '#0F2860' }}>Watch something</div>
          <button onClick={onClose} style={{ border: 'none', background: '#F1F3F8', borderRadius: '50%', width: 32, height: 32, fontSize: 14, color: '#5A6780' }}>✕</button>
        </div>
        <p style={{ fontSize: 12.5, color: '#5A6780', fontWeight: 600, margin: '0 0 12px', lineHeight: 1.45 }}>
          FirstLight reports on it every morning, even when it isn't among the day's Signals.
        </p>
        <div style={{ display: 'flex', background: '#E9EDF4', borderRadius: 999, padding: 3, marginBottom: 14 }}>
          {seg('month', 'Month')}{seg('range', 'Date range')}
        </div>

        {kind === 'month' ? (
          <>
            <p style={lbl}>Stay month</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
              {months.map(m => {
                const taken = existing.has(`month:${m.key}`);
                return (
                  <button key={m.key} disabled={taken} onClick={() => setMonth(m.key)} style={chip(month === m.key, taken)}>
                    {m.label} <span style={{ fontWeight: 600, fontSize: 11, color: taken ? '#A8B1C2' : '#5A6780' }}>
                      {taken ? 'watching' : m.gap == null ? '—' : `${m.gap >= 0 ? '+' : '−'}${Math.abs(Math.round(m.gap))}%`}
                    </span>
                  </button>
                );
              })}
              {!months.length && <span style={{ fontSize: 12.5, color: '#5A6780', fontWeight: 600 }}>No open months in this briefing.</span>}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {([['From', from, setFrom], ['To', to, setTo]] as [string, string, (v: string) => void][]).map(([l, v, set]) => (
                <label key={l} style={{ border: '1.5px solid #E2E7F0', borderRadius: 12, padding: '8px 11px', display: 'block' }}>
                  <span style={{ ...lbl, margin: 0, display: 'block' }}>{l}</span>
                  <input type="date" value={v} min={rd} max={maxDate} onChange={e => set(e.target.value)} style={{
                    border: 'none', padding: 0, marginTop: 2, fontFamily: 'inherit', fontSize: 14, fontWeight: 800, color: '#0F2860', background: 'transparent', width: '100%', outline: 'none',
                  }} />
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {presets.map(p => (
                <button key={p.name} onClick={() => { setFrom(p.from); setTo(p.to); }} style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '4px 10px', border: 'none',
                  color: p.soft ? '#8A5A00' : '#2E7CF7', background: p.soft ? '#FFF1D6' : 'rgba(46,124,247,.08)',
                }}>{p.name}</button>
              ))}
            </div>
            {!rangeOk && key && <p style={{ fontSize: 12, color: '#C43A3A', fontWeight: 700, margin: '0 0 10px' }}>
              Pick dates between today and {RANGE_HORIZON_DAYS} days ahead, from before to.
            </p>}
          </>
        )}

        <p style={lbl}>Label <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
        <input value={label} maxLength={40} onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Board meeting, wedding, owner target…" style={{ ...field, marginBottom: 14 }} />

        {preview && rangeOk && (
          <div style={{ background: '#F1F3F8', borderRadius: 12, padding: '9px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#79747E', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Tomorrow you'll see
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0F2860', letterSpacing: '.05em', marginBottom: 2 }}>
              {preview.title}{preview.item.label ? <span style={{ fontWeight: 700, letterSpacing: 0, color: '#5A6780', marginLeft: 6 }}>{preview.item.label}</span> : null}
            </div>
            {preview.lines.map((l, i) => <Line key={i} segs={l} />)}
          </div>
        )}

        <button disabled={!canSave} onClick={save} style={{
          width: '100%', padding: 13, border: 'none', borderRadius: 999,
          background: canSave ? '#0F2860' : '#C9D2E3', color: '#fff', fontSize: 14, fontWeight: 800,
        }}>
          {full ? `Watchlist full (${WATCH_CAP})` : dup ? 'Already watching this' : preview ? `Watch ${titleCase(preview.title)}` : 'Pick a month or dates'}
        </button>
        <p style={{ fontSize: 11, color: '#79747E', fontWeight: 600, textAlign: 'center', margin: '8px 0 0' }}>
          {used} of {WATCH_CAP} watches used
        </p>
      </div>
    </Sheet>
  );
}

export function titleCase(t: string) {
  return t.replace(/[A-Z]+/g, w => w.length > 3 || /^[A-Z]{3}$/.test(w) ? w[0] + w.slice(1).toLowerCase() : w);
}
