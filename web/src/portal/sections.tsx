/** Superadmin portal sections as Excel-like tables (user direction
 *  2026-09-11): every tab = dense sortable table + filter bar. */
import { useEffect, useState } from 'react';
import {
  fetchAdminHotels, fetchAdminHotelRuns, adminHotelRefresh, adminHotelToken,
  adminHotelActive, fetchAdminHealth, fetchAdminFeedback, fetchAdminAudit, setAiToggle,
  type AdminHotel, type AdminRun, type AdminHealth, type AdminFeedbackRow,
  type AdminAuditRow,
} from '../api';
import {
  panel, FilterBar, Search, Pick, Th, Tr, TableWrap, tdS, tdR,
  StatusPill, rel, useSort, sortRows,
} from './kit';

const btn: React.CSSProperties = {
  border: '1px solid #CBDCFB', background: '#fff', color: '#1E5FD0', borderRadius: 8,
  padding: '4px 10px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
};
/* rows_fetched is a per-query breakdown object on newer runs — show the total */
const rowsOf = (v: number | Record<string, number> | null): string => {
  if (v == null) return '—';
  if (typeof v === 'number') return String(v);
  return String(Object.values(v).reduce((s, n) => s + (Number(n) || 0), 0));
};
const dur = (a: string, b: string | null) =>
  b ? `${Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000)}s` : '…';

/* ── §2 Hotels ─────────────────────────────────────────────────────────── */

function HotelDetail({ h, onChanged }: { h: AdminHotel; onChanged: () => void }) {
  const [runs, setRuns] = useState<AdminRun[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  useEffect(() => { void fetchAdminHotelRuns(h.id).then(r => setRuns(r?.runs ?? [])); }, [h.id]);
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setMsg('…'); const r = await fn(); setMsg(r ? done : 'failed'); onChanged();
    setTimeout(() => setMsg(null), 2500);
  };
  return (
    <td colSpan={13} style={{ padding: '10px 14px', background: '#F4F7FB', borderTop: '1px solid #D5DCE9' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
        <button style={btn} onClick={() => void act(() => adminHotelRefresh(h.id), 'refresh queued')}>Refresh now</button>
        <button style={btn} onClick={() => {
          if (confirm('Rotate the API token? The old one stops working immediately.'))
            void act(async () => { const r = await adminHotelToken(h.id); setNewToken(r?.api_token ?? null); return r; }, 'token rotated');
        }}>Rotate API token</button>
        {h.active ? (
          <button style={{ ...btn, color: '#B0433A', borderColor: '#F5CFC7' }} onClick={() => {
            const reason = prompt('Pause this hotel — reason (required):');
            if (reason) void act(() => adminHotelActive(h.id, false, reason), 'paused');
          }}>Pause</button>
        ) : (
          <button style={btn} onClick={() => void act(() => adminHotelActive(h.id, true, ''), 'activated')}>Activate</button>
        )}
        <button style={{ ...btn, color: h.ai_enabled ? '#B47D09' : '#1A7A50', borderColor: h.ai_enabled ? '#EDDCA8' : '#BFE3CD' }}
          title="AI narration for this hotel (deterministic cards still publish when off)"
          onClick={() => {
            const to = !h.ai_enabled;
            if (confirm(to ? 'Turn AI narration ON for this hotel?' : 'Turn AI narration OFF? Briefings keep publishing with deterministic cards — zero AI cost.'))
              void act(() => setAiToggle('hotel', h.id, to).then(ok => ok || null), to ? 'AI on' : 'AI off');
          }}>{h.ai_enabled ? 'Turn AI off' : 'Turn AI on'}</button>
        {msg && <span style={{ fontSize: 12, fontWeight: 700, color: msg === 'failed' ? '#B0433A' : '#1A7A50' }}>{msg}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#6E7A96' }}>
          tunnel {h.tunnel_hostname ?? '—'} · credentials {h.credentials_present ? '✓' : '✗'} · AI {h.ai_enabled ? 'on' : 'OFF'}
        </span>
      </div>
      {newToken && (
        <div style={{ background: '#FBF3DF', border: '1px solid #EDDCA8', color: '#6D4C00', borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700, marginBottom: 8, wordBreak: 'break-all' }}>
          New token (shown once): <code>{newToken}</code>
        </div>
      )}
      <TableWrap minWidth={680}>
        <thead><tr>
          <Th label="Started" /><Th label="Type" /><Th label="Status" /><Th label="Duration" right />
          <Th label="Rows" right /><Th label="Fallbacks" right /><Th label="Cost" right />
          <Th label="Path" /><Th label="Error" />
        </tr></thead>
        <tbody>
          {(runs ?? []).map((r, i) => (
            <Tr key={i} i={i}>
              <td style={tdS}>{r.started_at.slice(5, 16).replace('T', ' ')}</td>
              <td style={tdS}>{r.run_type}</td>
              <td style={tdS}><StatusPill s={r.status} /></td>
              <td style={tdR}>{dur(r.started_at, r.completed_at)}</td>
              <td style={tdR} title={typeof r.rows_fetched === 'object' && r.rows_fetched ? Object.entries(r.rows_fetched).map(([k, v]) => `${k}: ${v}`).join(' · ') : undefined}>{rowsOf(r.rows_fetched)}</td>
              <td style={{ ...tdR, color: r.fallbacks ? '#B47D09' : '#1B2A4A' }}>{r.fallbacks || '—'}</td>
              <td style={tdR}>{r.estimated_cost_usd ? `$${Number(r.estimated_cost_usd).toFixed(3)}` : '—'}</td>
              <td style={tdS}>{r.fetch_path ?? '—'}</td>
              <td style={{ ...tdS, color: '#B0433A' }}>{r.error_type ?? ''}</td>
            </Tr>
          ))}
          {runs?.length === 0 && <tr><td style={tdS} colSpan={9}>No runs recorded</td></tr>}
        </tbody>
      </TableWrap>
    </td>
  );
}

export function HotelsView() {
  const [hotels, setHotels] = useState<AdminHotel[] | null>(null);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPms, setFPms] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { sort, toggle } = useSort({ k: 'name', dir: 1 });
  const loadIt = () => void fetchAdminHotels().then(r => setHotels(r?.hotels ?? []));
  useEffect(loadIt, []);
  if (!hotels) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading hotels…</div>;

  let rows = hotels.filter(h =>
    (!q || h.name.toLowerCase().includes(q.toLowerCase()))
    && (!fStatus || (fStatus === 'active' ? h.active : !h.active))
    && (!fPms || h.pms_type === fPms));
  rows = sortRows(rows as unknown as Record<string, unknown>[], sort) as unknown as AdminHotel[];
  const pmsTypes = [...new Set(hotels.map(h => h.pms_type))];

  return (
    <div style={panel}>
      <FilterBar>
        <Search value={q} onChange={setQ} placeholder="Filter by hotel…" />
        <Pick value={fStatus} onChange={setFStatus} options={['active', 'paused']} all="All statuses" />
        <Pick value={fPms} onChange={setFPms} options={pmsTypes} all="All PMS" />
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>{rows.length} of {hotels.length}</span>
      </FilterBar>
      <TableWrap minWidth={980}>
        <thead><tr>
          <Th label="Hotel" k="name" sort={sort} onSort={toggle} />
          <Th label="Status" k="active" sort={sort} onSort={toggle} />
          <Th label="PMS" k="pms_type" sort={sort} onSort={toggle} />
          <Th label="Rooms" k="total_rooms" sort={sort} onSort={toggle} right />
          <Th label="Last briefing" k="last_briefing" sort={sort} onSort={toggle} />
          <Th label="Last run" k="last_run_at" sort={sort} onSort={toggle} />
          <Th label="Result" k="last_status" sort={sort} onSort={toggle} />
          <Th label="OK 30d" k="ok_30d" sort={sort} onSort={toggle} right />
          <Th label="Degr" k="degraded_30d" sort={sort} onSort={toggle} right />
          <Th label="Fail" k="failed_30d" sort={sort} onSort={toggle} right />
          <Th label="AI cost 30d" k="cost_30d_usd" sort={sort} onSort={toggle} right />
          <Th label="AI" k="ai_enabled" sort={sort} onSort={toggle} />
          <Th label="Token" k="token_present" sort={sort} onSort={toggle} />
        </tr></thead>
        <tbody>
          {rows.flatMap((h, i) => [
              <Tr key={h.id} i={i} clickable onClick={() => setOpenId(openId === h.id ? null : h.id)}>
                <td style={{ ...tdS, fontWeight: 800, color: '#0F2860' }}>{openId === h.id ? '▾ ' : '▸ '}{h.name}</td>
                <td style={tdS}><StatusPill s={h.active ? 'active' : 'paused'} /></td>
                <td style={tdS}>{h.pms_type}</td>
                <td style={tdR}>{h.total_rooms ?? '—'}</td>
                <td style={tdS}>{h.last_briefing ?? '—'}</td>
                <td style={tdS}>{rel(h.last_run_at)}</td>
                <td style={tdS}><StatusPill s={h.last_status} /></td>
                <td style={{ ...tdR, color: '#1A7A50' }}>{h.ok_30d}</td>
                <td style={{ ...tdR, color: h.degraded_30d ? '#B47D09' : '#9AA4B8' }}>{h.degraded_30d}</td>
                <td style={{ ...tdR, color: h.failed_30d ? '#B0433A' : '#9AA4B8' }}>{h.failed_30d}</td>
                <td style={tdR}>${h.cost_30d_usd.toFixed(2)}</td>
                <td style={tdS}>{h.ai_enabled
                  ? <span style={{ fontSize: 10, fontWeight: 800, color: '#1A7A50', background: '#E7F5EC', borderRadius: 999, padding: '2px 8px' }}>on</span>
                  : <span style={{ fontSize: 10, fontWeight: 800, color: '#B47D09', background: '#FBF3DF', borderRadius: 999, padding: '2px 8px' }}>off</span>}</td>
                <td style={tdS}>{h.token_present ? '✓' : '✗'}</td>
              </Tr>,
              ...(openId === h.id ? [<tr key={h.id + ':d'}><HotelDetail h={h} onChanged={loadIt} /></tr>] : []),
          ])}
        </tbody>
      </TableWrap>
    </div>
  );
}

/* ── §6 Health ─────────────────────────────────────────────────────────── */

export function HealthView() {
  const [d, setD] = useState<AdminHealth | null>(null);
  useEffect(() => { void fetchAdminHealth().then(setD); }, []);
  if (!d) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Checking the pipeline…</div>;
  const problems = Array.isArray(d.verdict) ? d.verdict : [`audit errored: ${d.verdict.error}`];
  const days = [...new Set(d.matrix.map(m => m.day))].sort().reverse();
  const cell = (day: string, type: string) => {
    const rows = d.matrix.filter(m => m.day === day && m.run_type === type);
    if (!rows.length) return <span style={{ color: '#C9D2E3' }}>·</span>;
    return rows.map(r => (
      <span key={r.status} title={r.status} style={{
        display: 'inline-block', minWidth: 16, textAlign: 'center', marginRight: 3,
        fontSize: 10.5, fontWeight: 800, borderRadius: 5, padding: '1px 4px',
        color: r.status === 'success' ? '#1A7A50' : r.status === 'degraded' ? '#B47D09' : r.status === 'failed' ? '#B0433A' : '#6E7A96',
        background: r.status === 'success' ? '#E7F5EC' : r.status === 'degraded' ? '#FBF3DF' : r.status === 'failed' ? '#FDEFEA' : '#F1F3F8',
      }}>{r.n}</span>
    ));
  };
  return (
    <div>
      <div style={{
        ...panel, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        borderLeft: `4px solid ${problems.length ? '#B0433A' : '#1A7A50'}`,
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#0F2860' }}>
          {problems.length ? `${problems.length} problem${problems.length > 1 ? 's' : ''} right now` : 'Nothing wrong right now'}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#B0433A' }}>{problems.join(' · ')}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>
          DB {d.infra.db_size_mb ?? '?'} MB · storage {d.infra.storage_mode} · build {d.infra.build}
        </span>
      </div>
      <div style={panel}>
        <TableWrap minWidth={420}>
          <thead><tr><Th label="Day" /><Th label="Full" /><Th label="Data-only" /><Th label="Manual" /></tr></thead>
          <tbody>{days.map((day, i) => (
            <Tr key={day} i={i}>
              <td style={tdS}>{day.slice(5)}</td>
              <td style={tdS}>{cell(day, 'full')}</td>
              <td style={tdS}>{cell(day, 'data_only')}</td>
              <td style={tdS}>{cell(day, 'manual')}</td>
            </Tr>
          ))}</tbody>
        </TableWrap>
      </div>
      <div style={panel}>
        <TableWrap minWidth={420}>
          <thead><tr><Th label="Card (14d)" /><Th label="Shipped" right /><Th label="Fallbacks" right /><Th label="Rate" right /></tr></thead>
          <tbody>{d.ai.map((a, i) => (
            <Tr key={a.card_id} i={i}>
              <td style={tdS}>{a.card_id}</td>
              <td style={tdR}>{a.n}</td>
              <td style={{ ...tdR, color: a.fallbacks ? '#B47D09' : '#1B2A4A' }}>{a.fallbacks}</td>
              <td style={tdR}>{a.n ? Math.round((a.fallbacks / a.n) * 100) : 0}%</td>
            </Tr>
          ))}</tbody>
        </TableWrap>
      </div>
    </div>
  );
}

/* ── §7 Feedback inbox ─────────────────────────────────────────────────── */

export function FeedbackView() {
  const [rows, setRows] = useState<AdminFeedbackRow[] | null>(null);
  const [q, setQ] = useState('');
  const [fHotel, setFHotel] = useState('');
  const [fVerdict, setFVerdict] = useState('');
  const { sort, toggle } = useSort({ k: 'created_at', dir: -1 });
  useEffect(() => { void fetchAdminFeedback().then(r => setRows(r?.rows ?? [])); }, []);
  if (!rows) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading feedback…</div>;

  let list = rows.filter(r =>
    (!q || `${r.card_id} ${r.note ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    && (!fHotel || r.hotel === fHotel)
    && (!fVerdict || String(r.verdict) === fVerdict));
  list = sortRows(list as unknown as Record<string, unknown>[], sort) as unknown as AdminFeedbackRow[];

  return (
    <div style={panel}>
      <FilterBar>
        <Search value={q} onChange={setQ} placeholder="Filter card / note…" />
        <Pick value={fHotel} onChange={setFHotel} options={[...new Set(rows.map(r => r.hotel))]} all="All hotels" />
        <Pick value={fVerdict} onChange={setFVerdict} options={['1', '-1']} all="👍 + 👎" />
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>{list.length} of {rows.length}</span>
      </FilterBar>
      <TableWrap minWidth={640}>
        <thead><tr>
          <Th label="When" k="created_at" sort={sort} onSort={toggle} />
          <Th label="Hotel" k="hotel" sort={sort} onSort={toggle} />
          <Th label="Card" k="card_id" sort={sort} onSort={toggle} />
          <Th label="Verdict" k="verdict" sort={sort} onSort={toggle} />
          <Th label="Note" />
        </tr></thead>
        <tbody>
          {list.map((r, i) => (
            <Tr key={i} i={i}>
              <td style={tdS}>{r.created_at.slice(5, 16).replace('T', ' ')}</td>
              <td style={tdS}>{r.hotel}</td>
              <td style={tdS}>{r.card_id}</td>
              <td style={{ ...tdS, fontSize: 14 }}>{r.verdict === 1 ? '👍' : '👎'}</td>
              <td style={{ ...tdS, whiteSpace: 'normal', maxWidth: 380 }}>{r.note ?? ''}</td>
            </Tr>
          ))}
          {list.length === 0 && <tr><td style={tdS} colSpan={5}>No feedback matches.</td></tr>}
        </tbody>
      </TableWrap>
    </div>
  );
}

/* ── §10 Audit log ─────────────────────────────────────────────────────── */

export function AuditView() {
  const [rows, setRows] = useState<AdminAuditRow[] | null>(null);
  const [q, setQ] = useState('');
  const [fAction, setFAction] = useState('');
  useEffect(() => { void fetchAdminAudit().then(r => setRows(r?.rows ?? [])); }, []);
  if (!rows) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading audit log…</div>;
  const list = rows.filter(r =>
    (!q || `${r.action} ${r.target_id ?? ''} ${r.reason ?? ''} ${r.admin_email}`.toLowerCase().includes(q.toLowerCase()))
    && (!fAction || r.action === fAction));
  return (
    <div style={panel}>
      <FilterBar>
        <Search value={q} onChange={setQ} placeholder="Filter action / target / who…" />
        <Pick value={fAction} onChange={setFAction} options={[...new Set(rows.map(r => r.action))]} all="All actions" />
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>{list.length} of {rows.length}</span>
      </FilterBar>
      <TableWrap minWidth={620}>
        <thead><tr><Th label="When" /><Th label="Who" /><Th label="Action" /><Th label="Target" /><Th label="Reason" /></tr></thead>
        <tbody>
          {list.map((r, i) => (
            <Tr key={r.id} i={i}>
              <td style={tdS}>{r.at.slice(0, 16).replace('T', ' ')}</td>
              <td style={tdS}>{r.admin_email}</td>
              <td style={tdS}>{r.action}</td>
              <td style={tdS}>{r.target_type ? `${r.target_type} ${String(r.target_id).slice(0, 8)}` : ''}</td>
              <td style={{ ...tdS, whiteSpace: 'normal' }}>{r.reason ?? ''}</td>
            </Tr>
          ))}
          {list.length === 0 && <tr><td style={tdS} colSpan={5}>No admin actions recorded yet — every portal action lands here.</td></tr>}
        </tbody>
      </TableWrap>
    </div>
  );
}


/* ── Finance: daily AI cost + data volume, revenue by plan (2026-09-11) ── */
import { fetchAdminFinance, type AdminFinance } from '../api';

function Bars({ data, fmt, color, title }: {
  data: { day: string; v: number }[]; fmt: (v: number) => string;
  color: string; title: string;
}) {
  const W = 900, H = 190, BOT = 150, L = 56;
  const mx = Math.max(1e-9, ...data.map(d => d.v)) * 1.15;
  const step = (W - L - 10) / Math.max(data.length, 1);
  const bw = Math.min(22, step * 0.6);
  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#0F2860', marginBottom: 4 }}>{title}</div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 620, height: 'auto' }}>
          {[0, 0.5, 1].map(f => (
            <g key={f}>
              <line x1={L} y1={BOT - f * (BOT - 18)} x2={W - 8} y2={BOT - f * (BOT - 18)} stroke="#EBEEF4" strokeWidth={f === 0 ? 1.5 : 1} />
              <text x={L - 6} y={BOT - f * (BOT - 18) + 4} textAnchor="end" style={{ fontSize: 10.5, fontWeight: 600, fill: '#79747E' }}>{fmt(f * mx)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const h = (d.v / mx) * (BOT - 18);
            const x = L + i * step + (step - bw) / 2;
            return (
              <g key={d.day}>
                <rect x={x} y={BOT - h} width={bw} height={Math.max(h, d.v > 0 ? 2 : 0)} rx={3} fill={color}>
                  <title>{`${d.day} - ${fmt(d.v)}`}</title>
                </rect>
                {(i % Math.ceil(data.length / 10) === 0) && (
                  <text x={x + bw / 2} y={BOT + 16} textAnchor="middle" style={{ fontSize: 9.5, fontWeight: 700, fill: '#6E7A96' }}>{d.day.slice(5)}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function FinanceView() {
  const [d, setD] = useState<AdminFinance | null>(null);
  useEffect(() => { void fetchAdminFinance().then(setD); }, []);
  if (!d) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading finance…</div>;
  const cost = d.daily.map(x => ({ day: x.day, v: Number(x.cost_usd) || 0 }));
  const rows = d.daily.map(x => ({ day: x.day, v: Number(x.rows) || 0 }));
  const tokens30 = d.daily.reduce((s, x) => s + (x.input_tokens || 0) + (x.output_tokens || 0), 0);
  const exportCsv = () => {
    const head = 'client,plan,status,price_eur,started_on,renews_on';
    const body = d.revenue.lines.map(l =>
      [l.name, l.plan ?? '', l.status ?? '', l.price_eur ?? '', l.started_on ?? '', l.renews_on ?? '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `firstlight-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div>
      <div style={{ ...panel, padding: '12px 16px', display: 'flex', gap: 26, flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums' }}>
        {[
          ['AI cost · this month', `$${d.cost.this_month_usd.toFixed(2)}`],
          ['AI cost · last 30d', `$${d.cost.last_30d_usd.toFixed(2)}`],
          ['Tokens · last 30d', tokens30.toLocaleString()],
          ['Active clients', String(d.revenue.active_clients)],
          ['Monthly revenue', `€${d.revenue.mrr_eur.toLocaleString()}`],
          ['Annualised', `€${d.revenue.arr_eur.toLocaleString()}`],
        ].map(([k, v]) => (
          <span key={k}>
            <span style={{ display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6E7A96' }}>{k}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#0F2860' }}>{v}</span>
          </span>
        ))}
      </div>
      <div style={panel}><Bars data={cost} color="#2E7CF7" title="Anthropic cost per day (USD)" fmt={v => `$${v.toFixed(2)}`} /></div>
      <div style={panel}><Bars data={rows} color="#0F2860" title="Data processed per day (PMS rows fetched)" fmt={v => v >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v))} /></div>
      <div style={panel}>
        <FilterBar>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0F2860' }}>Revenue by plan</span>
          <button onClick={exportCsv} style={{ marginLeft: 'auto', border: '1px solid #CBDCFB', background: '#fff', color: '#1E5FD0', borderRadius: 8, padding: '5px 12px', fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Export CSV (invoicing)</button>
        </FilterBar>
        <TableWrap minWidth={420}>
          <thead><tr><Th label="Plan" /><Th label="Active clients" right /><Th label="Monthly €" right /></tr></thead>
          <tbody>
            {Object.entries(d.revenue.by_plan).map(([plan, p], i) => (
              <Tr key={plan} i={i}>
                <td style={tdS}><StatusPill s={plan} /></td>
                <td style={tdR}>{p.clients}</td>
                <td style={tdR}>€{p.mrr.toLocaleString()}</td>
              </Tr>
            ))}
            {Object.keys(d.revenue.by_plan).length === 0 && <tr><td style={tdS} colSpan={3}>No active subscriptions yet — set plans in Clients.</td></tr>}
          </tbody>
        </TableWrap>
        <TableWrap minWidth={620}>
          <thead><tr><Th label="Client" /><Th label="Plan" /><Th label="Status" /><Th label="€ / mo" right /><Th label="Started" /><Th label="Renews" /></tr></thead>
          <tbody>
            {d.revenue.lines.map((l, i) => (
              <Tr key={l.hotel_id} i={i}>
                <td style={{ ...tdS, fontWeight: 800, color: '#0F2860' }}>{l.name}</td>
                <td style={tdS}>{l.plan ? <StatusPill s={l.plan} /> : '—'}</td>
                <td style={tdS}>{l.status ? <StatusPill s={l.status} /> : '—'}</td>
                <td style={tdR}>{l.price_eur != null ? `€${l.price_eur}` : '—'}</td>
                <td style={tdS}>{l.started_on ?? '—'}</td>
                <td style={tdS}>{l.renews_on ?? '—'}</td>
              </Tr>
            ))}
            {d.revenue.lines.length === 0 && <tr><td style={tdS} colSpan={6}>Subscriptions table not pasted yet, or no clients recorded.</td></tr>}
          </tbody>
        </TableWrap>
      </div>
    </div>
  );
}
