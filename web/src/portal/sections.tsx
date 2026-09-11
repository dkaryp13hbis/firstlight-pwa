/** Superadmin portal sections — Hotels, Health, Feedback, Audit log
 *  (ADMIN_PLAN §2/§6/§7/§10; the C3-independent set, built 2026-09-11).
 *  Dense desktop tables, app tokens, exception-driven. */
import { useEffect, useState } from 'react';
import {
  fetchAdminHotels, fetchAdminHotelRuns, adminHotelRefresh, adminHotelToken,
  adminHotelActive, fetchAdminHealth, fetchAdminFeedback, fetchAdminAudit,
  type AdminHotel, type AdminRun, type AdminHealth, type AdminFeedbackRow,
  type AdminAuditRow,
} from '../api';

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 12,
  boxShadow: '0 1px 3px rgba(10,20,45,.07)',
};
const th: React.CSSProperties = {
  fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
  color: '#6E7A96', textAlign: 'left', padding: '6px 10px 6px 0', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: '#1B2A4A', padding: '7px 10px 7px 0',
  borderTop: '1px solid #EEF1F6', verticalAlign: 'top',
};
const btn: React.CSSProperties = {
  border: '1px solid #CBDCFB', background: '#fff', color: '#1E5FD0', borderRadius: 999,
  padding: '5px 12px', fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
};

const rel = (iso: string | null) => {
  if (!iso) return '—';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
const dur = (a: string, b: string | null) =>
  b ? `${Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000)}s` : '…';

function StatusPill({ s }: { s: string | null }) {
  const map: Record<string, [string, string]> = {
    success: ['#1A7A50', '#E7F5EC'], degraded: ['#B47D09', '#FBF3DF'],
    failed: ['#B0433A', '#FDEFEA'], running: ['#1E5FD0', '#EAF1FE'],
    skipped: ['#6E7A96', '#F1F3F8'],
  };
  const [fg, bg] = map[s ?? ''] ?? ['#6E7A96', '#F1F3F8'];
  return <span style={{ fontSize: 10, fontWeight: 800, color: fg, background: bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{s ?? '—'}</span>;
}

/* ── §2 Hotels ─────────────────────────────────────────────────────────── */

function HotelRow({ h, onChanged }: { h: AdminHotel; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [runs, setRuns] = useState<AdminRun[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  useEffect(() => {
    if (open && !runs) void fetchAdminHotelRuns(h.id).then(r => setRuns(r?.runs ?? []));
  }, [open]);   // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setMsg('…'); const r = await fn(); setMsg(r ? done : 'failed'); onChanged();
    setTimeout(() => setMsg(null), 2500);
  };
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer' }}
        onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#0F2860' }}>{h.name}</span>
        {!h.active && <span style={{ fontSize: 10, fontWeight: 800, color: '#B0433A', background: '#FDEFEA', borderRadius: 999, padding: '2px 8px' }}>PAUSED</span>}
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>
          {h.pms_type} · {h.fetch_mode ?? 'bridge'} · {h.total_rooms ?? '?'} rooms
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>
          briefing {h.last_briefing ?? '—'} · last run {rel(h.last_run_at)} <StatusPill s={h.last_status} />
        </span>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11.5, fontWeight: 600, color: '#6E7A96', flexWrap: 'wrap' }}>
        <span>30d: <b style={{ color: '#1A7A50' }}>{h.ok_30d} ok</b>{h.degraded_30d > 0 && <> · <b style={{ color: '#B47D09' }}>{h.degraded_30d} degraded</b></>}{h.failed_30d > 0 && <> · <b style={{ color: '#B0433A' }}>{h.failed_30d} failed</b></>}</span>
        <span>AI cost ${h.cost_30d_usd.toFixed(2)}</span>
        <span>tunnel: {h.tunnel_hostname ?? '—'}</span>
        <span>credentials {h.credentials_present ? '✓ present' : '✗ missing'}</span>
        <span>API token {h.token_present ? '✓' : '✗'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
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
            {msg && <span style={{ fontSize: 12, fontWeight: 700, color: msg === 'failed' ? '#B0433A' : '#1A7A50', alignSelf: 'center' }}>{msg}</span>}
          </div>
          {newToken && (
            <div style={{ background: '#FBF3DF', border: '1px solid #EDDCA8', color: '#6D4C00', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, marginBottom: 10, wordBreak: 'break-all' }}>
              New token (shown once — update the consumer now): <code>{newToken}</code>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
              <thead><tr>
                <th style={th}>Started</th><th style={th}>Type</th><th style={th}>Status</th>
                <th style={th}>Duration</th><th style={th}>Rows</th><th style={th}>Fallbacks</th>
                <th style={th}>Cost</th><th style={th}>Path</th><th style={th}>Error</th>
              </tr></thead>
              <tbody>
                {(runs ?? []).map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{r.started_at.slice(5, 16).replace('T', ' ')}</td>
                    <td style={td}>{r.run_type}</td>
                    <td style={td}><StatusPill s={r.status} /></td>
                    <td style={td}>{dur(r.started_at, r.completed_at)}</td>
                    <td style={td}>{r.rows_fetched ?? '—'}</td>
                    <td style={{ ...td, color: r.fallbacks ? '#B47D09' : '#1B2A4A' }}>{r.fallbacks || '—'}</td>
                    <td style={td}>{r.estimated_cost_usd ? `$${Number(r.estimated_cost_usd).toFixed(3)}` : '—'}</td>
                    <td style={td}>{r.fetch_path ?? '—'}</td>
                    <td style={{ ...td, color: '#B0433A' }}>{r.error_type ?? ''}</td>
                  </tr>
                ))}
                {runs?.length === 0 && <tr><td style={td} colSpan={9}>No runs recorded</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function HotelsView() {
  const [hotels, setHotels] = useState<AdminHotel[] | null>(null);
  const loadIt = () => void fetchAdminHotels().then(r => setHotels(r?.hotels ?? []));
  useEffect(loadIt, []);
  if (!hotels) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading hotels…</div>;
  return (
    <div>
      {hotels.map(h => <HotelRow key={h.id} h={h} onChanged={loadIt} />)}
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA4B8', lineHeight: 1.6 }}>
        Coming here later: full per-hotel timeline (logins arrive with C3), card-type toggles, IT contact.
        PMS credentials are never shown — only present / missing.
      </div>
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
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: problems.length ? '#FDEFEA' : '#E7F5EC' }}>{problems.length ? '!' : '✓'}</span>
        <span>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0F2860' }}>{problems.length ? `${problems.length} problem${problems.length > 1 ? 's' : ''} right now` : 'Nothing wrong right now'}</div>
          {problems.map((p, i) => <div key={i} style={{ fontSize: 12.5, fontWeight: 600, color: '#B0433A' }}>{p}</div>)}
        </span>
      </div>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F2860', marginBottom: 8 }}>Pipeline · last 7 days</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 420 }}>
            <thead><tr><th style={th}>Day</th><th style={th}>Full</th><th style={th}>Data-only</th><th style={th}>Manual</th></tr></thead>
            <tbody>{days.map(day => (
              <tr key={day}>
                <td style={td}>{day.slice(5)}</td>
                <td style={td}>{cell(day, 'full')}</td>
                <td style={td}>{cell(day, 'data_only')}</td>
                <td style={td}>{cell(day, 'manual')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F2860', marginBottom: 8 }}>AI narration · last 14 days</div>
        <table style={{ borderCollapse: 'collapse', minWidth: 320 }}>
          <thead><tr><th style={th}>Card</th><th style={th}>Shipped</th><th style={th}>Fallbacks</th><th style={th}>Rate</th></tr></thead>
          <tbody>{d.ai.map(a => (
            <tr key={a.card_id}>
              <td style={td}>{a.card_id}</td><td style={td}>{a.n}</td>
              <td style={{ ...td, color: a.fallbacks ? '#B47D09' : '#1B2A4A' }}>{a.fallbacks}</td>
              <td style={td}>{a.n ? Math.round((a.fallbacks / a.n) * 100) : 0}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ ...card, display: 'flex', gap: 22, fontSize: 12.5, fontWeight: 700, color: '#1B2A4A', flexWrap: 'wrap' }}>
        <span>DB {d.infra.db_size_mb ?? '?'} MB</span>
        <span>storage: {d.infra.storage_mode}</span>
        <span>build {d.infra.build}</span>
      </div>
    </div>
  );
}

/* ── §7 Feedback inbox ─────────────────────────────────────────────────── */

export function FeedbackView() {
  const [rows, setRows] = useState<AdminFeedbackRow[] | null>(null);
  useEffect(() => { void fetchAdminFeedback().then(r => setRows(r?.rows ?? [])); }, []);
  if (!rows) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading feedback…</div>;
  return (
    <div style={card}>
      {rows.length === 0 && <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>No feedback yet.</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
          <thead><tr><th style={th}>When</th><th style={th}>Hotel</th><th style={th}>Card</th><th style={th}>Verdict</th><th style={th}>Note</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}>
              <td style={td}>{r.created_at.slice(5, 16).replace('T', ' ')}</td>
              <td style={td}>{r.hotel}</td>
              <td style={td}>{r.card_id}</td>
              <td style={{ ...td, fontSize: 14 }}>{r.verdict === 1 ? '👍' : '👎'}</td>
              <td style={{ ...td, maxWidth: 340 }}>{r.note ?? ''}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ── §10 Audit log ─────────────────────────────────────────────────────── */

export function AuditView() {
  const [rows, setRows] = useState<AdminAuditRow[] | null>(null);
  useEffect(() => { void fetchAdminAudit().then(r => setRows(r?.rows ?? [])); }, []);
  if (!rows) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading audit log…</div>;
  return (
    <div style={card}>
      {rows.length === 0 && <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>No admin actions recorded yet — every portal action from now on lands here.</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
          <thead><tr><th style={th}>When</th><th style={th}>Who</th><th style={th}>Action</th><th style={th}>Target</th><th style={th}>Reason</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id}>
              <td style={td}>{r.at.slice(0, 16).replace('T', ' ')}</td>
              <td style={td}>{r.admin_email}</td>
              <td style={td}>{r.action}</td>
              <td style={td}>{r.target_type ? `${r.target_type} ${String(r.target_id).slice(0, 8)}` : ''}</td>
              <td style={td}>{r.reason ?? ''}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
