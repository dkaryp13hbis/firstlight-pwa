/** Admin portal (superadmin only, 2026-09-11) — the one place with every
 *  client: hotels, their users, 30-day usage, and the subscription each one
 *  pays (plan / status / price / renewal, editable inline). Full-screen
 *  overlay, desktop-friendly. Client CREATION (accounts, temporary
 *  passwords) arrives with the own-login system (C3). */
import { useEffect, useState } from 'react';
import { fetchAdminClients, saveSubscription, type AdminClient, type AdminClients } from '../api';

const EVENT_LABEL: Record<string, string> = {
  app_open: 'opens', tab_nav: 'tabs', refresh_tap: 'refreshes', share_tap: 'shares',
  card_expand: 'cards', hero_expand: 'hero', watch_expand: 'watchlist', watch_tap: 'watch taps',
  voice_play: 'voice', data_health_open: 'data health', setting_change: 'settings',
};

const inp: React.CSSProperties = {
  border: '1.5px solid #E2E7F0', borderRadius: 9, padding: '7px 10px',
  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B2A4A',
  background: '#fff', outline: 'none', minWidth: 0,
};
const lbl: React.CSSProperties = {
  fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
  color: '#6E7A96', marginBottom: 3, display: 'block',
};

function SubEditor({ c, onSaved }: { c: AdminClient; onSaved: () => void }) {
  const s = c.subscription;
  const [plan, setPlan] = useState(s?.plan ?? 'trial');
  const [status, setStatus] = useState(s?.status ?? 'active');
  const [price, setPrice] = useState(s?.price_eur != null ? String(s.price_eur) : '');
  const [renews, setRenews] = useState(s?.renews_on ?? '');
  const [notes, setNotes] = useState(s?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setMsg(null);
    const ok = await saveSubscription(c.hotel_id, {
      plan, status, price_eur: price ? Number(price) : null,
      renews_on: renews || null, notes: notes || null,
    });
    setBusy(false); setMsg(ok ? 'Saved' : 'Save failed');
    if (ok) { onSaved(); setTimeout(() => setMsg(null), 1500); }
  };
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
      <span><span style={lbl}>Plan</span>
        <select value={plan} onChange={e => setPlan(e.target.value)} style={inp}>
          <option value="trial">Trial</option><option value="monthly">Monthly</option><option value="annual">Annual</option>
        </select></span>
      <span><span style={lbl}>Status</span>
        <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
          <option value="active">Active</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option>
        </select></span>
      <span><span style={lbl}>€ / month</span>
        <input value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder="—" inputMode="decimal" style={{ ...inp, width: 82 }} /></span>
      <span><span style={lbl}>Renews</span>
        <input type="date" value={renews} onChange={e => setRenews(e.target.value)} style={inp} /></span>
      <span style={{ flex: 1, minWidth: 140 }}><span style={lbl}>Notes</span>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="—" style={{ ...inp, width: '100%' }} /></span>
      <button onClick={() => void save()} disabled={busy} style={{
        border: 'none', borderRadius: 9, padding: '8px 16px', fontFamily: 'inherit',
        fontSize: 13, fontWeight: 700, color: '#fff', background: '#0F2860', cursor: 'pointer',
      }}>{busy ? '…' : 'Save'}</button>
      {msg && <span style={{ fontSize: 12, fontWeight: 700, color: msg === 'Saved' ? '#1A7A50' : '#B0433A' }}>{msg}</span>}
    </div>
  );
}

/** The clients content, embeddable (portal Clients tab AND the in-app
 *  overlay) — Excel-like table with filters (user direction 2026-09-11). */
import {
  panel, FilterBar, Search, Pick, Th, Tr, TableWrap, tdS, tdR,
  StatusPill, rel as relK, useSort, sortRows,
} from '../portal/kit';

export function ClientsView() {
  const [data, setData] = useState<AdminClients | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [fPlan, setFPlan] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { sort, toggle } = useSort({ k: 'name', dir: 1 });
  const loadIt = () => { setLoading(true); void fetchAdminClients().then(d => { setData(d); setLoading(false); }); };
  useEffect(() => { loadIt(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  if (loading) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading clients…</div>;
  if (!data) return <div style={{ ...panel, padding: 16, fontSize: 13.5, fontWeight: 600, color: '#B0433A' }}>Could not reach the API — check the backend deploy.</div>;

  type Row = AdminClient & { plan: string; sub_status: string; price: number | null; renews: string | null; users_n: number; last_seen: string | null };
  const rows: Row[] = data.hotels.map(h => ({
    ...h,
    plan: h.subscription?.plan ?? '',
    sub_status: h.subscription?.status ?? '',
    price: h.subscription?.price_eur ?? null,
    renews: h.subscription?.renews_on ?? null,
    users_n: h.users.length,
    last_seen: h.users.reduce<string | null>((m, u) => (u.last_seen && (!m || u.last_seen > m) ? u.last_seen : m), null),
  }));
  let list = rows.filter(r =>
    (!q || r.name.toLowerCase().includes(q.toLowerCase()) || r.users.some(u => u.email.toLowerCase().includes(q.toLowerCase())))
    && (!fPlan || r.plan === fPlan)
    && (!fStatus || r.sub_status === fStatus));
  list = sortRows(list as unknown as Record<string, unknown>[], sort) as unknown as Row[];
  const mrr = rows.reduce((s2, h) => s2 + (h.sub_status === 'active' && h.price ? h.price : 0), 0);

  return (
    <div style={panel}>
      <FilterBar>
        <Search value={q} onChange={setQ} placeholder="Filter client / user email…" />
        <Pick value={fPlan} onChange={setFPlan} options={['trial', 'monthly', 'annual']} all="All plans" />
        <Pick value={fStatus} onChange={setFStatus} options={['active', 'paused', 'cancelled']} all="All statuses" />
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>
          {list.length} of {rows.length}{mrr > 0 && <> · €{Math.round(mrr).toLocaleString()}/mo active</>} · usage since {data.since}
        </span>
      </FilterBar>
      {!data.subs_ready && (
        <div style={{ background: '#FBF3DF', borderBottom: '1px solid #EDDCA8', color: '#6D4C00', padding: '8px 12px', fontSize: 12, fontWeight: 700 }}>
          Subscription fields are off until docs/sql/2026-09-11_subscriptions.sql is pasted in Supabase.
        </div>
      )}
      <TableWrap minWidth={920}>
        <thead><tr>
          <Th label="Client" k="name" sort={sort} onSort={toggle} />
          <Th label="Plan" k="plan" sort={sort} onSort={toggle} />
          <Th label="Status" k="sub_status" sort={sort} onSort={toggle} />
          <Th label="€ / mo" k="price" sort={sort} onSort={toggle} right />
          <Th label="Renews" k="renews" sort={sort} onSort={toggle} />
          <Th label="Users" k="users_n" sort={sort} onSort={toggle} right />
          <Th label="Last activity" k="last_seen" sort={sort} onSort={toggle} />
          <Th label="Events 30d" k="events_30d" sort={sort} onSort={toggle} right />
        </tr></thead>
        <tbody>
          {list.map((h, i) => (
            <>
              <Tr key={h.hotel_id} i={i} clickable onClick={() => setOpenId(openId === h.hotel_id ? null : h.hotel_id)}>
                <td style={{ ...tdS, fontWeight: 800, color: '#0F2860' }}>{openId === h.hotel_id ? '▾ ' : '▸ '}{h.name}</td>
                <td style={tdS}>{h.plan ? <StatusPill s={h.plan} /> : '—'}</td>
                <td style={tdS}>{h.sub_status ? <StatusPill s={h.sub_status} /> : '—'}</td>
                <td style={tdR}>{h.price != null ? `€${h.price}` : '—'}</td>
                <td style={tdS}>{h.renews ?? '—'}</td>
                <td style={tdR}>{h.users_n}</td>
                <td style={{ ...tdS, color: h.last_seen && Date.now() - new Date(h.last_seen).getTime() < 3 * 86400000 ? '#1A7A50' : '#6E7A96' }}>{relK(h.last_seen)}</td>
                <td style={tdR}>{h.events_30d.toLocaleString()}</td>
              </Tr>
              {openId === h.hotel_id && (
                <tr><td colSpan={8} style={{ padding: '10px 14px', background: '#F4F7FB', borderTop: '1px solid #D5DCE9' }}>
                  <TableWrap minWidth={620}>
                    <thead><tr><Th label="User" /><Th label="Last seen" /><Th label="Opens 30d" right /><Th label="Active days" right /><Th label="Events" right /><Th label="Top actions" /></tr></thead>
                    <tbody>
                      {h.users.map((u, j) => (
                        <Tr key={u.user_id} i={j}>
                          <td style={tdS}>{u.email}</td>
                          <td style={{ ...tdS, color: u.last_seen && Date.now() - new Date(u.last_seen).getTime() < 3 * 86400000 ? '#1A7A50' : '#6E7A96' }}>{relK(u.last_seen)}</td>
                          <td style={tdR}>{u.opens_30d}</td>
                          <td style={tdR}>{u.days_active}</td>
                          <td style={tdR}>{u.events_30d}</td>
                          <td style={tdS}>{u.top.map(([e, n]) => `${EVENT_LABEL[e] ?? e} ${n}`).join(' · ')}</td>
                        </Tr>
                      ))}
                      {h.users.length === 0 && <tr><td style={tdS} colSpan={6}>No users assigned</td></tr>}
                    </tbody>
                  </TableWrap>
                  {data.subs_ready && <SubEditor c={h} onSaved={loadIt} />}
                </td></tr>
              )}
            </>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

/** In-app full-screen wrapper (Settings → Admin on the phone). */
export function AdminPortal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: '#EAEDF1', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '18px 16px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: '#0F2860' }}>Clients</div>
          <span style={{ display: 'flex', gap: 8 }}>
            <a href="/superadmin-control" style={{ display: 'inline-flex', alignItems: 'center', border: 'none', background: '#0F2860', color: '#fff', borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Full portal ›</a>
            <button onClick={onClose} style={{ border: 'none', background: '#fff', borderRadius: '50%', width: 34, height: 34, fontSize: 15, color: '#5A6780', boxShadow: '0 1px 3px rgba(10,20,45,.1)' }}>✕</button>
          </span>
        </div>
        <ClientsView />
      </div>
    </div>
  );
}
