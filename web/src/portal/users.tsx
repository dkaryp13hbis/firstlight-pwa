/** Superadmin → Users (own-login system, C3 2026-09-30). Same table kit and
 *  form styling as Clients (company.tsx): one dense table with a filter,
 *  click a row for access + password + status actions, "New user" form on
 *  top. Passwords appear ONCE on screen — read them out by phone, never
 *  email them (decision 2026-09-10). */
import { useEffect, useState } from 'react';
import { fetchAdminCompanies, fetchAdminGroups, fetchAdminHotels, type AdminHotel, type AdminGroup } from '../api';
import {
  fetchAdminUsers, createAdminUser, resetUserPassword, setUserActive,
  grantUserAccess, revokeUserAccess, type AdminUser, type AdminMembership,
} from '../lib/adminUsers';
import { panel, FilterBar, Search, Pick, Th, Tr, TableWrap, tdS, tdR, rel, useSort, sortRows } from './kit';

const inp: React.CSSProperties = {
  border: '1.5px solid #E2E7F0', borderRadius: 9, padding: '7px 10px',
  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B2A4A',
  background: '#fff', outline: 'none', width: '100%',
};
const lbl: React.CSSProperties = {
  fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
  color: '#6E7A96', marginBottom: 3, display: 'block',
};
const F = ({ label, children, w = 180 }: { label: string; children: React.ReactNode; w?: number }) =>
  <span style={{ width: w }}><span style={lbl}>{label}</span>{children}</span>;
const primary: React.CSSProperties = {
  border: 'none', borderRadius: 9, padding: '9px 18px', fontFamily: 'inherit',
  fontSize: 13, fontWeight: 700, color: '#fff', background: '#0F2860', cursor: 'pointer',
};
const ghost: React.CSSProperties = {
  border: '1px solid #CBDCFB', background: '#fff', color: '#1E5FD0', borderRadius: 9,
  padding: '7px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
};
const danger: React.CSSProperties = { ...ghost, border: '1px solid #F5CFC7', color: '#B0433A' };

function Pill({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'bad' | 'info' | 'muted' }) {
  const map = { ok: ['#1A7A50', '#E7F5EC'], warn: ['#B47D09', '#FBF3DF'], bad: ['#B0433A', '#FDEFEA'],
    info: ['#1E5FD0', '#EAF1FE'], muted: ['#6E7A96', '#F1F3F8'] } as const;
  const [fg, bg] = map[tone];
  return <span style={{ fontSize: 10, fontWeight: 800, color: fg, background: bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap', marginRight: 4 }}>{text}</span>;
}

/** The one-time password reveal: shown once, copied by hand, then gone. */
function Reveal({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  return (
    <div style={{ background: '#FBF3DF', border: '1px solid #EBD9A8', borderRadius: 10, padding: '10px 14px', margin: '10px 0', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8A6D1F' }}>Password for {email} — read it out by phone, it is not shown again:</span>
      <code style={{ fontSize: 15, fontWeight: 800, color: '#0F2860', background: '#fff', borderRadius: 6, padding: '4px 10px', letterSpacing: '.04em' }}>{password}</code>
      <button style={ghost} onClick={() => void navigator.clipboard?.writeText(password)}>Copy</button>
      <button style={{ ...ghost, marginLeft: 'auto' }} onClick={onClose}>Done</button>
    </div>
  );
}

type Scopes = { groups: AdminGroup[]; orgs: { id: string; name: string }[]; hotels: AdminHotel[] };

function ScopePicker({ scopes, value, onChange }: {
  scopes: Scopes; value: { scope_type: 'group' | 'org' | 'hotel'; scope_id: string; role: 'owner' | 'viewer' };
  onChange: (v: { scope_type: 'group' | 'org' | 'hotel'; scope_id: string; role: 'owner' | 'viewer' }) => void;
}) {
  const options = value.scope_type === 'group' ? scopes.groups
    : value.scope_type === 'org' ? scopes.orgs : scopes.hotels;
  return (
    <>
      <F label="Access level" w={150}>
        <select style={inp} value={value.scope_type}
          onChange={e => onChange({ ...value, scope_type: e.target.value as 'group' | 'org' | 'hotel', scope_id: '' })}>
          <option value="group">Group (all its hotels)</option>
          <option value="org">Company (its hotels)</option>
          <option value="hotel">One hotel</option>
        </select>
      </F>
      <F label={value.scope_type === 'group' ? 'Group' : value.scope_type === 'org' ? 'Company' : 'Hotel'} w={220}>
        <select style={inp} value={value.scope_id} onChange={e => onChange({ ...value, scope_id: e.target.value })}>
          <option value="">— choose —</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </F>
      <F label="Role" w={110}>
        <select style={inp} value={value.role} onChange={e => onChange({ ...value, role: e.target.value as 'owner' | 'viewer' })}>
          <option value="owner">Owner</option>
          <option value="viewer">Viewer</option>
        </select>
      </F>
    </>
  );
}

const emptyScope = { scope_type: 'group' as const, scope_id: '', role: 'owner' as const };

function NewUserForm({ scopes, onCreated }: { scopes: Scopes; onCreated: () => void }) {
  const [f, setF] = useState({ email: '', display_name: '', language: 'en' as 'en' | 'el', password: '', keep: false, admin: false });
  const [scope, setScope] = useState<{ scope_type: 'group' | 'org' | 'hotel'; scope_id: string; role: 'owner' | 'viewer' }>(emptyScope);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(v => ({ ...v, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  const create = async () => {
    setBusy(true); setMsg(null);
    const r = await createAdminUser({
      email: f.email.trim(), display_name: f.display_name.trim(), language: f.language,
      password: f.password || undefined, keep_password: f.keep, is_platform_admin: f.admin,
      membership: scope.scope_id ? scope : undefined,
    });
    setBusy(false);
    if (!r.ok) { setMsg(r.error); return; }
    setReveal({ email: r.data.email, password: r.data.initial_password });
    setF({ email: '', display_name: '', language: 'en', password: '', keep: false, admin: false });
    setScope(emptyScope);
    onCreated();
  };
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <F label="Email (login name — nothing is sent to it) *" w={240}><input style={inp} value={f.email} onChange={set('email')} placeholder="owner@hotel.gr" /></F>
        <F label="Name"><input style={inp} value={f.display_name} onChange={set('display_name')} placeholder="Dinos" /></F>
        <F label="Language" w={90}>
          <select style={inp} value={f.language} onChange={set('language')}><option value="en">EN</option><option value="el">ΕΛ</option></select>
        </F>
        <F label="Password (blank = generate one)" w={200}><input style={inp} value={f.password} onChange={set('password')} placeholder="min 10, letters + numbers" /></F>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
        <ScopePicker scopes={scopes} value={scope} onChange={setScope} />
        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#1B2A4A', display: 'inline-flex', gap: 6, alignItems: 'center', paddingBottom: 8 }}>
          <input type="checkbox" checked={f.keep} onChange={set('keep')} /> No forced change at first login
        </label>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#1B2A4A', display: 'inline-flex', gap: 6, alignItems: 'center', paddingBottom: 8 }}>
          <input type="checkbox" checked={f.admin} onChange={set('admin')} /> HBIS platform admin
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => void create()} disabled={busy || !f.email.includes('@')} style={{ ...primary, opacity: busy || !f.email.includes('@') ? 0.6 : 1 }}>
          {busy ? '…' : 'Create user'}
        </button>
        {msg && <span style={{ fontSize: 12.5, fontWeight: 700, color: '#B0433A' }}>{msg}</span>}
      </div>
      {reveal && <Reveal email={reveal.email} password={reveal.password} onClose={() => setReveal(null)} />}
    </div>
  );
}

function UserDetail({ u, scopes, onChanged }: { u: AdminUser; scopes: Scopes; onChanged: () => void }) {
  const [scope, setScope] = useState<{ scope_type: 'group' | 'org' | 'hotel'; scope_id: string; role: 'owner' | 'viewer' }>(emptyScope);
  const [pw, setPw] = useState('');
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    setBusy(true); setMsg(null);
    const r = await fn();
    setBusy(false);
    setMsg(r.ok ? okMsg : (r.error ?? 'failed'));
    if (r.ok) onChanged();
  };
  const reset = async () => {
    setBusy(true); setMsg(null);
    const r = await resetUserPassword(u.id, pw || undefined, keep);
    setBusy(false);
    if (!r.ok) { setMsg(r.error); return; }
    setReveal(r.data.password); setPw(''); setMsg(null); onChanged();
  };
  return (
    <div style={{ padding: '12px 16px', background: '#F4F7FB', borderTop: '1px solid #D5DCE9' }}>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 320 }}>
          <span style={lbl}>Access ({u.memberships.length})</span>
          {u.memberships.length === 0 && <div style={{ fontSize: 12.5, fontWeight: 600, color: '#B0433A', marginBottom: 8 }}>No access yet — the app shows an empty picker.</div>}
          {u.memberships.map((m: AdminMembership) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: '#1B2A4A', marginBottom: 6 }}>
              <Pill text={m.role} tone={m.role === 'owner' ? 'info' : 'muted'} />
              <span>{m.scope_name ?? m.scope_id}</span>
              <span style={{ color: '#9AA4B8', fontWeight: 600 }}>· {m.scope_type === 'org' ? 'company' : m.scope_type}</span>
              <button style={{ ...danger, padding: '3px 8px', fontSize: 11 }} disabled={busy}
                onClick={() => void run(() => revokeUserAccess(u.id, m.id), 'Access removed')}>Remove</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 8 }}>
            <ScopePicker scopes={scopes} value={scope} onChange={setScope} />
            <button style={{ ...ghost, marginBottom: 1 }} disabled={busy || !scope.scope_id}
              onClick={() => void run(() => grantUserAccess(u.id, scope.scope_type, scope.scope_id, scope.role), 'Access added').then(() => setScope(emptyScope))}>+ Add access</button>
          </div>
        </div>
        <div style={{ minWidth: 320 }}>
          <span style={lbl}>Password</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <F label="New password (blank = generate)" w={200}><input style={inp} value={pw} onChange={e => setPw(e.target.value)} /></F>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: '#1B2A4A', display: 'inline-flex', gap: 6, alignItems: 'center', paddingBottom: 8 }}>
              <input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)} /> no forced change
            </label>
            <button style={{ ...ghost, marginBottom: 1 }} disabled={busy} onClick={() => void reset()}>Reset password</button>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA4B8', marginTop: 6 }}>A reset signs the user out of every device.</div>
          {reveal && <Reveal email={u.email} password={reveal} onClose={() => setReveal(null)} />}
          <span style={{ ...lbl, marginTop: 14 }}>Account</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {u.active
              ? <button style={danger} disabled={busy} onClick={() => void run(() => setUserActive(u.id, false, 'portal'), 'Deactivated — signed out everywhere')}>Deactivate</button>
              : <button style={ghost} disabled={busy} onClick={() => void run(() => setUserActive(u.id, true), 'Active again')}>Activate</button>}
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6E7A96' }}>
              {u.sessions_live} live session{u.sessions_live === 1 ? '' : 's'} · {u.failed_logins} failed login{u.failed_logins === 1 ? '' : 's'}
              {u.locked_until && new Date(u.locked_until) > new Date() ? ` · locked until ${new Date(u.locked_until).toLocaleTimeString()}` : ''}
            </span>
          </div>
        </div>
      </div>
      {msg && <div style={{ fontSize: 12.5, fontWeight: 700, color: /removed|added|again|Deactivated/.test(msg) ? '#1A7A50' : '#B0433A', marginTop: 10 }}>{msg}</div>}
    </div>
  );
}

export function UsersView() {
  const [users, setUsers] = useState<AdminUser[] | null | undefined>(undefined);
  const [scopes, setScopes] = useState<Scopes>({ groups: [], orgs: [], hotels: [] });
  const [q, setQ] = useState('');
  const [fState, setFState] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { sort, toggle } = useSort({ k: 'email', dir: 1 });
  const loadIt = () => void fetchAdminUsers().then(r => setUsers(r ? r.users : null));
  useEffect(() => {
    loadIt();
    void fetchAdminGroups().then(r => setScopes(s => ({ ...s, groups: r?.groups ?? [] })));
    void fetchAdminCompanies().then(r => setScopes(s => ({ ...s, orgs: (r?.companies ?? []).map(c => ({ id: c.id, name: c.name })) })));
    void fetchAdminHotels().then(r => setScopes(s => ({ ...s, hotels: (r?.hotels ?? []).filter(h => h.active) })));
  }, []);

  if (users === undefined) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading users…</div>;
  if (users === null) return (
    <div style={{ ...panel, padding: 16, fontSize: 13, fontWeight: 600, color: '#B0433A' }}>
      The user store is not reachable (own-login SQL not applied, or the API is down).
    </div>
  );

  type Row = AdminUser & { access: string; state: string };
  const rows: Row[] = users.map(u => ({
    ...u,
    access: u.memberships.map(m => `${m.scope_name ?? m.scope_id} (${m.role})`).join(', '),
    state: !u.active ? 'inactive' : u.must_change_password ? 'temporary password' : 'active',
  }));
  let list = rows.filter(r =>
    (!q || `${r.email} ${r.display_name ?? ''} ${r.access}`.toLowerCase().includes(q.toLowerCase()))
    && (!fState || r.state === fState));
  list = sortRows(list as unknown as Record<string, unknown>[], sort) as unknown as Row[];

  return (
    <div>
      <div style={panel}>
        <div style={{ padding: '14px 16px 0', fontSize: 13, fontWeight: 800, color: '#0F2860' }}>New user</div>
        <div style={{ padding: '2px 16px 0', fontSize: 12, fontWeight: 600, color: '#6E7A96', lineHeight: 1.6 }}>
          Access at <b>group</b> level covers every hotel of the group and shows the portfolio view;
          <b> company</b> covers its hotels; <b>hotel</b> is one property. The password is shown once — hand it over by phone.
        </div>
        <NewUserForm scopes={scopes} onCreated={loadIt} />
      </div>
      <div style={panel}>
        <FilterBar>
          <Search value={q} onChange={setQ} placeholder="Filter email / name / access…" />
          <Pick value={fState} onChange={setFState} options={['active', 'temporary password', 'inactive']} all="All states" />
          <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>{list.length} of {rows.length} users</span>
        </FilterBar>
        <TableWrap minWidth={980}>
          <thead><tr>
            <Th label="Email" k="email" sort={sort} onSort={toggle} />
            <Th label="Name" k="display_name" sort={sort} onSort={toggle} />
            <Th label="Access" k="access" sort={sort} onSort={toggle} />
            <Th label="State" k="state" sort={sort} onSort={toggle} />
            <Th label="Last login" k="last_login_at" sort={sort} onSort={toggle} />
            <Th label="Sessions" k="sessions_live" sort={sort} onSort={toggle} right />
            <Th label="Created" k="created_at" sort={sort} onSort={toggle} />
          </tr></thead>
          <tbody>
            {list.flatMap((u, i) => [
              <Tr key={u.id} i={i} clickable onClick={() => setOpenId(openId === u.id ? null : u.id)}>
                <td style={{ ...tdS, fontWeight: 800, color: '#0F2860' }}>{openId === u.id ? '▾ ' : '▸ '}{u.email}</td>
                <td style={tdS}>{u.display_name ?? '—'}{u.language === 'el' ? ' · ΕΛ' : ''}</td>
                <td style={{ ...tdS, whiteSpace: 'normal', maxWidth: 320 }}>{u.access || <span style={{ color: '#B0433A' }}>none</span>}</td>
                <td style={tdS}>
                  {!u.active ? <Pill text="inactive" tone="bad" /> : u.must_change_password ? <Pill text="temporary password" tone="warn" /> : <Pill text="active" tone="ok" />}
                  {u.is_platform_admin && <Pill text="HBIS admin" tone="info" />}
                  {u.locked_until && new Date(u.locked_until) > new Date() && <Pill text="locked" tone="bad" />}
                </td>
                <td style={{ ...tdS, color: u.last_login_at && Date.now() - new Date(u.last_login_at).getTime() < 3 * 86400000 ? '#1A7A50' : '#6E7A96' }}>{rel(u.last_login_at)}</td>
                <td style={tdR}>{u.sessions_live}</td>
                <td style={tdS}>{u.created_at ? u.created_at.slice(0, 10) : '—'}</td>
              </Tr>,
              ...(openId === u.id ? [
                <tr key={u.id + ':d'}><td colSpan={7} style={{ padding: 0 }}>
                  <UserDetail u={u} scopes={scopes} onChanged={loadIt} />
                </td></tr>,
              ] : []),
            ])}
          </tbody>
        </TableWrap>
        {rows.length === 0 && <div style={{ padding: 16, fontSize: 12.5, fontWeight: 600, color: '#6E7A96' }}>No users on the FirstLight login yet — create the first one above.</div>}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA4B8', lineHeight: 1.6 }}>
        Accounts that still sign in through Supabase are not listed here until they are moved over.
      </div>
    </div>
  );
}
