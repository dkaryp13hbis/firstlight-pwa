/** Portal table kit — Excel-like dense tables: sortable headers, filter bar,
 *  zebra rows, sticky header, horizontal scroll. (User direction 2026-09-11:
 *  "no cards — tables with a filter on every tab".) */
import { Component, useMemo, useState, type ReactNode } from 'react';

export const panel: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 0, marginBottom: 12,
  boxShadow: '0 1px 3px rgba(10,20,45,.07)', overflow: 'hidden',
};

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
      padding: '10px 12px', borderBottom: '1px solid #E2E7F0', background: '#F8FAFD',
    }}>{children}</div>
  );
}

const ctrl: React.CSSProperties = {
  border: '1px solid #D5DCE9', borderRadius: 8, padding: '6px 10px',
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B2A4A',
  background: '#fff', outline: 'none',
};

export function Search({ value, onChange, placeholder = 'Filter…' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return <input value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder} style={{ ...ctrl, width: 200 }} />;
}

export function Pick({ value, onChange, options, all = 'All' }: {
  value: string; onChange: (v: string) => void;
  options: string[]; all?: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={ctrl}>
      <option value="">{all}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export type Sort = { k: string; dir: 1 | -1 } | null;

export function sortRows<T extends Record<string, unknown>>(rows: T[], sort: Sort): T[] {
  if (!sort) return rows;
  const { k, dir } = sort;
  return [...rows].sort((a, b) => {
    const x = a[k], y = b[k];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    if (typeof x === 'boolean' && typeof y === 'boolean') return ((x ? 1 : 0) - (y ? 1 : 0)) * dir;
    return String(x).localeCompare(String(y)) * dir;
  });
}

export function useSort(initial: Sort = null) {
  const [sort, setSort] = useState<Sort>(initial);
  const toggle = (k: string) =>
    setSort(s => (s && s.k === k ? (s.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 }));
  return { sort, toggle };
}

export function Th({ label, k, sort, onSort, right }: {
  label: string; k?: string; sort?: Sort; onSort?: (k: string) => void; right?: boolean;
}) {
  const active = k && sort && sort.k === k;
  return (
    <th onClick={k && onSort ? () => onSort(k) : undefined} style={{
      position: 'sticky', top: 0, zIndex: 1, background: '#F1F4F9',
      fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
      color: active ? '#1E5FD0' : '#5A6780', textAlign: right ? 'right' : 'left',
      padding: '8px 10px', whiteSpace: 'nowrap', borderBottom: '1px solid #D5DCE9',
      cursor: k && onSort ? 'pointer' : 'default', userSelect: 'none',
    }}>
      {label}{active ? (sort!.dir === 1 ? ' ▲' : ' ▼') : ''}
    </th>
  );
}

export const tdS: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: '#1B2A4A', padding: '7px 10px',
  whiteSpace: 'nowrap', verticalAlign: 'middle',
};
export const tdR: React.CSSProperties = { ...tdS, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export function Tr({ i, onClick, children, clickable }: {
  i: number; onClick?: () => void; children: React.ReactNode; clickable?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <tr onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: hover && clickable ? '#EAF1FE' : i % 2 ? '#F8FAFD' : '#fff',
        cursor: clickable ? 'pointer' : 'default',
      }}>{children}</tr>
  );
}

export function TableWrap({ minWidth, children }: { minWidth: number; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth }}>{children}</table>
    </div>
  );
}

export function StatusPill({ s }: { s: string | null }) {
  const map: Record<string, [string, string]> = {
    success: ['#1A7A50', '#E7F5EC'], degraded: ['#B47D09', '#FBF3DF'],
    failed: ['#B0433A', '#FDEFEA'], running: ['#1E5FD0', '#EAF1FE'],
    skipped: ['#6E7A96', '#F1F3F8'], active: ['#1A7A50', '#E7F5EC'],
    paused: ['#B47D09', '#FBF3DF'], cancelled: ['#B0433A', '#FDEFEA'],
    trial: ['#8A6D1F', '#FBF3DF'], monthly: ['#1E5FD0', '#EAF1FE'],
    annual: ['#1A7A50', '#E7F5EC'],
  };
  const [fg, bg] = map[s ?? ''] ?? ['#6E7A96', '#F1F3F8'];
  return <span style={{ fontSize: 10, fontWeight: 800, color: fg, background: bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{s ?? '—'}</span>;
}

export const rel = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

export function useTextFilter<T>(rows: T[], q: string, keys: (r: T) => string): T[] {
  return useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => keys(r).toLowerCase().includes(s));
  }, [rows, q, keys]);
}


/** A section crash must never blank the portal — show the error instead. */
export class Boundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { err: String(e) }; }
  render() {
    if (this.state.err) return (
      <div style={{ ...panel, padding: 16, fontSize: 13, fontWeight: 600, color: '#B0433A' }}>
        This section hit an error: {this.state.err}. Switch tabs and back to retry.
      </div>
    );
    return this.props.children;
  }
}
