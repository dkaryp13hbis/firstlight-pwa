/** Admin portal (superadmin only, 2026-09-11) — the one place with every
 *  client: hotels, their users, 30-day usage, and the subscription each one
 *  pays (plan / status / price / renewal, editable inline). Full-screen
 *  overlay, desktop-friendly. Client CREATION (accounts, temporary
 *  passwords) arrives with the own-login system (C3). */
import { useEffect, useState } from 'react';
import { fetchAdminClients, saveSubscription, type AdminClient, type AdminClients } from '../api';

function rel(iso: string | null): string {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

const EVENT_LABEL: Record<string, string> = {
  app_open: 'opens', tab_nav: 'tabs', refresh_tap: 'refreshes', share_tap: 'shares',
  card_expand: 'cards', hero_expand: 'hero', watch_expand: 'watchlist', watch_tap: 'watch taps',
  voice_play: 'voice', data_health_open: 'data health', setting_change: 'settings',
};

const PLAN_COLOR: Record<string, [string, string]> = {
  trial: ['#8A6D1F', '#FBF3DF'], monthly: ['#1E5FD0', '#EAF1FE'], annual: ['#1A7A50', '#E7F5EC'],
};
const STATUS_COLOR: Record<string, string> = { active: '#1A7A50', paused: '#B47D09', cancelled: '#B0433A' };

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

export function AdminPortal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<AdminClients | null>(null);
  const [loading, setLoading] = useState(false);
  const loadIt = () => { setLoading(true); void fetchAdminClients().then(d => { setData(d); setLoading(false); }); };
  useEffect(() => { if (open) loadIt(); }, [open]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const totalUsers = data ? new Set(data.hotels.flatMap(h => h.users.map(u => u.user_id))).size : 0;
  const mrr = data ? data.hotels.reduce((s, h) =>
    s + (h.subscription?.status === 'active' && h.subscription.price_eur
      ? (h.subscription.plan === 'annual' ? h.subscription.price_eur : h.subscription.price_eur) : 0), 0) : 0;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: '#EAEDF1', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '18px 16px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: '#0F2860' }}>Clients</div>
          <button onClick={onClose} style={{ border: 'none', background: '#fff', borderRadius: '50%', width: 34, height: 34, fontSize: 15, color: '#5A6780', boxShadow: '0 1px 3px rgba(10,20,45,.1)' }}>✕</button>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6E7A96', marginBottom: 14 }}>
          {data ? <>{data.hotels.length} hotels · {totalUsers} users{mrr > 0 && <> · €{Math.round(mrr).toLocaleString()}/mo active</>} · usage since {data.since}</>
            : 'Your whole book of business in one place.'}
        </div>
        {loading && <div style={{ padding: 20, fontSize: 13.5, fontWeight: 600, color: '#6E7A96' }}>Loading clients…</div>}
        {!loading && !data && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, fontSize: 13.5, fontWeight: 600, color: '#B0433A' }}>
            Could not reach the API — pull down to retry or check the backend deploy.
          </div>
        )}
        {!loading && data && !data.subs_ready && (
          <div style={{ background: '#FBF3DF', border: '1px solid #EDDCA8', color: '#6D4C00', borderRadius: 12, padding: '10px 14px', fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>
            Subscription fields are off until docs/sql/2026-09-11_subscriptions.sql is pasted in Supabase.
          </div>
        )}
        {!loading && data && data.hotels.map(h => {
          const sub = h.subscription;
          const [pc, pb] = PLAN_COLOR[sub?.plan ?? 'trial'] ?? PLAN_COLOR.trial;
          return (
            <div key={h.hotel_id} style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 12, boxShadow: '0 1px 3px rgba(10,20,45,.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0F2860' }}>{h.name}</span>
                {sub && <>
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: pc, background: pb, borderRadius: 999, padding: '3px 10px' }}>{sub.plan}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: STATUS_COLOR[sub.status] ?? '#6E7A96' }}>● {sub.status}</span>
                  {sub.price_eur != null && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1B2A4A' }}>€{sub.price_eur}/mo</span>}
                  {sub.renews_on && <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>renews {sub.renews_on}</span>}
                </>}
                {!sub && data.subs_ready && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#9AA4B8' }}>no subscription set</span>}
                <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: '#6E7A96' }}>{h.events_30d.toLocaleString()} events / 30d</span>
              </div>
              <div style={{ marginTop: 10 }}>
                {h.users.length === 0 && <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9AA4B8' }}>No users assigned</div>}
                {h.users.map(u => (
                  <div key={u.user_id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 0', borderTop: '1px solid #EEF1F6', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1B2A4A' }}>{u.email}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', color: u.last_seen && Date.now() - new Date(u.last_seen).getTime() < 3 * 86400000 ? '#1A7A50' : '#9AA4B8' }}>{rel(u.last_seen)}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6E7A96', marginLeft: 'auto', textAlign: 'right' }}>
                      {u.opens_30d} opens · {u.days_active} days · {u.events_30d} events
                      {u.top.length > 0 && <> · {u.top.slice(0, 2).map(([e, n]) => `${EVENT_LABEL[e] ?? e} ${n}`).join(' · ')}</>}
                    </span>
                  </div>
                ))}
              </div>
              {data.subs_ready && <SubEditor c={h} onSaved={loadIt} />}
            </div>
          );
        })}
        {!loading && data && (
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA4B8', lineHeight: 1.6, marginTop: 6 }}>
            All-user tracking started 11 Sep — usage fills in as clients open their apps.<br />
            Coming with the own-login system: create client, temporary passwords, reset, sign out everywhere, view as client.
          </div>
        )}
      </div>
    </div>
  );
}
