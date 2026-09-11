/** Superadmin portal sections as Excel-like tables (user direction
 *  2026-09-11): every tab = dense sortable table + filter bar. */
import { useEffect, useState } from 'react';
import {
  fetchAdminHotels, fetchAdminHotelRuns, adminHotelRefresh, adminHotelToken,
  adminHotelActive, fetchAdminHealth, fetchAdminFeedback, fetchAdminAudit,
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
    <td colSpan={12} style={{ padding: '10px 14px', background: '#F4F7FB', borderTop: '1px solid #D5DCE9' }}>
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
        {msg && <span style={{ fontSize: 12, fontWeight: 700, color: msg === 'failed' ? '#B0433A' : '#1A7A50' }}>{msg}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#6E7A96' }}>
          tunnel {h.tunnel_hostname ?? '—'} · credentials {h.credentials_present ? '✓' : '✗'}
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
              <td style={tdR}>{r.rows_fetched ?? '—'}</td>
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
