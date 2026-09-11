/** Client registry (user 2026-09-11): company + VAT + contact + contract
 *  rates + hotel links. One form (Onboarding = create, Clients = edit),
 *  one company table feeding Finance. */
import { useEffect, useState } from 'react';
import {
  fetchAdminCompanies, saveCompany, fetchAdminHotels,
  type AdminCompany, type AdminHotel,
} from '../api';
import {
  panel, FilterBar, Search, Pick, Th, Tr, TableWrap, tdS, tdR,
  StatusPill, rel, useSort, sortRows,
} from './kit';

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

export function CompanyForm({ initial, onSaved }: {
  initial?: AdminCompany | null; onSaved: () => void;
}) {
  const c = initial ?? null;
  const [f, setF] = useState({
    name: c?.name ?? '', legal_name: c?.legal_name ?? '', vat_number: c?.vat_number ?? '',
    country: c?.country ?? 'GR', contact_name: c?.contact_name ?? '',
    contact_phone: c?.contact_phone ?? '',
    status: c?.contract?.status ?? 'trial', start_date: c?.contract?.start_date ?? '',
    monthly_eur: c?.contract?.monthly_eur != null ? String(c.contract.monthly_eur) : '',
    annual_eur: c?.contract?.annual_eur != null ? String(c.contract.annual_eur) : '',
    notes: c?.contract?.notes ?? '',
  });
  const [hotels, setHotels] = useState<AdminHotel[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set(c?.hotels.map(h => h.hotel_id) ?? []));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { void fetchAdminHotels().then(r => setHotels(r?.hotels ?? [])); }, []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(v => ({ ...v, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await saveCompany({
      id: c?.id, name: f.name, legal_name: f.legal_name, vat_number: f.vat_number,
      country: f.country, contact_name: f.contact_name, contact_phone: f.contact_phone,
      hotel_ids: [...picked],
      contract: {
        status: f.status, start_date: f.start_date || null,
        monthly_eur: f.monthly_eur ? Number(f.monthly_eur) : null,
        annual_eur: f.annual_eur ? Number(f.annual_eur) : null,
        notes: f.notes || null,
      },
    });
    setBusy(false);
    setMsg(r.ok ? 'Saved' : r.error);
    if (r.ok) onSaved();
  };
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <F label="Company (trading name) *"><input style={inp} value={f.name} onChange={set('name')} placeholder="Pome Hotels" /></F>
        <F label="Legal name" w={220}><input style={inp} value={f.legal_name} onChange={set('legal_name')} placeholder="POME HOTELS A.E." /></F>
        <F label="VAT" w={130}><input style={inp} value={f.vat_number} onChange={set('vat_number')} placeholder="EL123456789" /></F>
        <F label="Country" w={70}><input style={inp} value={f.country} onChange={set('country')} maxLength={2} /></F>
        <F label="Contact person"><input style={inp} value={f.contact_name} onChange={set('contact_name')} /></F>
        <F label="Contact phone" w={150}><input style={inp} value={f.contact_phone} onChange={set('contact_phone')} placeholder="+30 …" /></F>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <F label="Contract status" w={130}>
          <select style={inp} value={f.status} onChange={set('status')}>
            <option value="trial">Trial</option><option value="active">Active</option>
            <option value="suspended">Suspended</option><option value="ended">Ended</option>
          </select>
        </F>
        <F label="Start date" w={150}><input type="date" style={inp} value={f.start_date} onChange={set('start_date')} /></F>
        <F label="Rate € / month" w={120}><input style={inp} inputMode="decimal" value={f.monthly_eur} onChange={set('monthly_eur')} placeholder="—" /></F>
        <F label="Rate € / year" w={120}><input style={inp} inputMode="decimal" value={f.annual_eur} onChange={set('annual_eur')} placeholder="—" /></F>
        <F label="Notes" w={260}><input style={inp} value={f.notes} onChange={set('notes')} /></F>
      </div>
      <div style={{ marginBottom: 12 }}>
        <span style={lbl}>Hotels in this company</span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {hotels.map(h => (
            <label key={h.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700,
              color: '#1B2A4A', border: '1px solid #E2E7F0', borderRadius: 999, padding: '5px 12px',
              background: picked.has(h.id) ? '#EAF1FE' : '#fff', cursor: 'pointer',
            }}>
              <input type="checkbox" checked={picked.has(h.id)} onChange={() =>
                setPicked(p => { const n = new Set(p); if (n.has(h.id)) n.delete(h.id); else n.add(h.id); return n; })} />
              {h.name}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => void save()} disabled={busy || !f.name.trim()} style={{
          border: 'none', borderRadius: 9, padding: '9px 18px', fontFamily: 'inherit',
          fontSize: 13, fontWeight: 700, color: '#fff', background: '#0F2860',
          cursor: 'pointer', opacity: busy || !f.name.trim() ? 0.6 : 1,
        }}>{busy ? '…' : c ? 'Save changes' : 'Create client'}</button>
        {msg && <span style={{ fontSize: 12.5, fontWeight: 700, color: msg === 'Saved' ? '#1A7A50' : '#B0433A' }}>{msg}</span>}
      </div>
    </div>
  );
}

export function CompaniesView() {
  const [data, setData] = useState<{ companies: AdminCompany[]; since: string } | null>(null);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { sort, toggle } = useSort({ k: 'name', dir: 1 });
  const loadIt = () => void fetchAdminCompanies().then(setData);
  useEffect(loadIt, []);
  if (!data) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading clients…</div>;

  type Row = AdminCompany & { status: string; monthly: number | null; annual: number | null; start: string | null };
  const rows: Row[] = data.companies.map(cp => ({
    ...cp,
    status: cp.contract?.status ?? '',
    monthly: cp.contract?.monthly_eur ?? null,
    annual: cp.contract?.annual_eur ?? null,
    start: cp.contract?.start_date ?? null,
  }));
  let list = rows.filter(r =>
    (!q || `${r.name} ${r.vat_number ?? ''} ${r.contact_name ?? ''} ${r.hotels.map(h => h.name).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    && (!fStatus || r.status === fStatus));
  list = sortRows(list as unknown as Record<string, unknown>[], sort) as unknown as Row[];

  return (
    <div style={panel}>
      <FilterBar>
        <Search value={q} onChange={setQ} placeholder="Filter company / VAT / contact / hotel…" />
        <Pick value={fStatus} onChange={setFStatus} options={['trial', 'active', 'suspended', 'ended']} all="All statuses" />
        <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>{list.length} of {rows.length} · usage since {data.since}</span>
      </FilterBar>
      <TableWrap minWidth={1050}>
        <thead><tr>
          <Th label="Company" k="name" sort={sort} onSort={toggle} />
          <Th label="VAT" k="vat_number" sort={sort} onSort={toggle} />
          <Th label="Contact" k="contact_name" sort={sort} onSort={toggle} />
          <Th label="Hotels" />
          <Th label="Status" k="status" sort={sort} onSort={toggle} />
          <Th label="Start" k="start" sort={sort} onSort={toggle} />
          <Th label="€ / mo" k="monthly" sort={sort} onSort={toggle} right />
          <Th label="€ / yr" k="annual" sort={sort} onSort={toggle} right />
          <Th label="Users" k="users_n" sort={sort} onSort={toggle} right />
          <Th label="Last activity" k="last_seen" sort={sort} onSort={toggle} />
          <Th label="Events 30d" k="events_30d" sort={sort} onSort={toggle} right />
        </tr></thead>
        <tbody>
          {list.flatMap((cp, i) => [
            <Tr key={cp.id} i={i} clickable onClick={() => setOpenId(openId === cp.id ? null : cp.id)}>
              <td style={{ ...tdS, fontWeight: 800, color: '#0F2860' }}>{openId === cp.id ? '▾ ' : '▸ '}{cp.name}</td>
              <td style={tdS}>{cp.vat_number ?? '—'}</td>
              <td style={tdS}>{cp.contact_name ?? '—'}{cp.contact_phone ? ` · ${cp.contact_phone}` : ''}</td>
              <td style={{ ...tdS, whiteSpace: 'normal', maxWidth: 220 }}>{cp.hotels.map(h => h.name).join(', ') || '—'}</td>
              <td style={tdS}>{cp.contract?.status ? <StatusPill s={cp.contract.status} /> : '—'}</td>
              <td style={tdS}>{cp.contract?.start_date ?? '—'}</td>
              <td style={tdR}>{cp.contract?.monthly_eur != null ? `€${cp.contract.monthly_eur}` : '—'}</td>
              <td style={tdR}>{cp.contract?.annual_eur != null ? `€${cp.contract.annual_eur}` : '—'}</td>
              <td style={tdR}>{cp.users_n}</td>
              <td style={{ ...tdS, color: cp.last_seen && Date.now() - new Date(cp.last_seen).getTime() < 3 * 86400000 ? '#1A7A50' : '#6E7A96' }}>{rel(cp.last_seen)}</td>
              <td style={tdR}>{cp.events_30d.toLocaleString()}</td>
            </Tr>,
            ...(openId === cp.id ? [
              <tr key={cp.id + ':d'}><td colSpan={11} style={{ padding: 0, background: '#F4F7FB', borderTop: '1px solid #D5DCE9' }}>
                <TableWrap minWidth={620}>
                  <thead><tr><Th label="Hotel user" /><Th label="Last seen" /><Th label="Opens 30d" right /><Th label="Active days" right /><Th label="Events" right /></tr></thead>
                  <tbody>
                    {cp.hotels.flatMap(h => h.users.map((u, j) => (
                      <Tr key={h.hotel_id + u.user_id} i={j}>
                        <td style={tdS}>{u.email} <span style={{ color: '#9AA4B8' }}>· {h.name}</span></td>
                        <td style={{ ...tdS, color: u.last_seen && Date.now() - new Date(u.last_seen).getTime() < 3 * 86400000 ? '#1A7A50' : '#6E7A96' }}>{rel(u.last_seen)}</td>
                        <td style={tdR}>{u.opens_30d}</td>
                        <td style={tdR}>{u.days_active}</td>
                        <td style={tdR}>{u.events_30d}</td>
                      </Tr>
                    )))}
                  </tbody>
                </TableWrap>
                <div style={{ borderTop: '1px solid #E2E7F0' }}>
                  <CompanyForm initial={cp} onSaved={loadIt} />
                </div>
              </td></tr>,
            ] : []),
          ])}
        </tbody>
      </TableWrap>
    </div>
  );
}

export function OnboardingView() {
  const [savedAt, setSavedAt] = useState(0);
  return (
    <div>
      <div style={{ ...panel, padding: '14px 16px 4px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F2860' }}>New client</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6E7A96' }}>
          Company, VAT, contact, contract rates, and the hotels it owns — everything Finance reports from.
        </div>
      </div>
      <div style={{ ...panel }}>
        <CompanyForm key={savedAt} onSaved={() => setSavedAt(Date.now())} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA4B8', lineHeight: 1.6 }}>
        Coming next in onboarding: create the HOTEL itself (PMS adapter, tunnel connector
        instructions, connection test, dry run) and the user accounts with temporary
        passwords (own-login system). Today: hotels are provisioned by engineering,
        then registered to their company here.
      </div>
    </div>
  );
}
