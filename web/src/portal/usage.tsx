/** Superadmin → Usage (user 2026-10-05: "a portal where we see usage, by user
 *  by date with charts, filters"). One dataset (day × user × hotel × action,
 *  from /admin/usage/daily), sliced client-side: period, user, hotel, action.
 *  Charts reuse the Finance bars; tables the portal kit. "Minutes" = time the
 *  app was actually on screen (session_end, capped at 1 h per event). */
import { useEffect, useMemo, useState } from 'react';
import { fetchAdminUsageDaily, type AdminUsageDaily } from '../api';
import { Bars } from './sections';
import { panel, FilterBar, Pick, Th, Tr, TableWrap, tdS, tdR, useSort, sortRows } from './kit';

const PERIODS = [7, 14, 30, 90];
const ACTION_LABEL: Record<string, string> = {
  app_open: 'App opened', session_end: 'Session ended', hotel_switch: 'Hotel switched',
  tab_nav: 'Tab opened', card_expand: 'Card opened', hero_expand: 'Hero expanded',
  watch_add: 'Watch added', watch_remove: 'Watch removed', watch_tap: 'Watch tapped',
  watch_expand: 'Watch expanded', share_tap: 'Card shared', feedback_submit: 'Feedback given',
  bell_toggle: 'Notifications toggled', refresh_tap: 'Refresh tapped', history_view: 'Past day viewed',
  data_health_open: 'Data health opened', setting_change: 'Setting changed', voice_play: 'Read aloud',
};
const label = (e: string) => ACTION_LABEL[e] ?? e;
const mins = (sec: number) => Math.round(sec / 60);

export function UsageView() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<AdminUsageDaily | null | undefined>(undefined);
  const [fUser, setFUser] = useState('');
  const [fHotel, setFHotel] = useState('');
  const [fAction, setFAction] = useState('');
  const [openUser, setOpenUser] = useState<string | null>(null);
  const { sort, toggle } = useSort({ k: 'minutes', dir: -1 });
  useEffect(() => { setD(undefined); void fetchAdminUsageDaily(days).then(r => setD(r ?? null)); }, [days]);

  const email = (id: string) => d?.users[id] ?? id.slice(0, 8);
  const hotelName = (id: string | null) => (id && d?.hotels[id]) || (id ? id.slice(0, 8) : '—');

  const rows = useMemo(() => (d?.rows ?? []).filter(r =>
    (!fUser || email(r.user_id) === fUser)
    && (!fHotel || hotelName(r.hotel_id) === fHotel)
    && (!fAction || label(r.event) === fAction)), [d, fUser, fHotel, fAction]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (d === undefined) return <div style={{ fontSize: 13, fontWeight: 600, color: '#6E7A96' }}>Loading usage…</div>;
  if (d === null) return <div style={{ ...panel, padding: 16, fontSize: 13, fontWeight: 600, color: '#B0433A' }}>Usage data not reachable (API down or storage unavailable).</div>;

  /* ── aggregations ───────────────────────────────────────────────────── */
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) dayKeys.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  const byDay: Record<string, { opens: number; seconds: number; events: number; users: Set<string> }> = {};
  for (const k of dayKeys) byDay[k] = { opens: 0, seconds: 0, events: 0, users: new Set() };
  type U = { user: string; opens: number; seconds: number; events: number; days: Set<string>; last: string; hotels: Set<string>; top: Record<string, number> };
  const byUser: Record<string, U> = {};
  const byAction: Record<string, { n: number; users: Set<string> }> = {};
  for (const r of rows) {
    const dd = byDay[r.day] ?? (byDay[r.day] = { opens: 0, seconds: 0, events: 0, users: new Set() });
    const isOpen = r.event === 'app_open';
    const isEnd = r.event === 'session_end';
    dd.events += r.n; dd.seconds += r.seconds; if (isOpen) dd.opens += r.n; dd.users.add(r.user_id);
    const u = byUser[r.user_id] ?? (byUser[r.user_id] = { user: r.user_id, opens: 0, seconds: 0, events: 0, days: new Set(), last: '', hotels: new Set(), top: {} });
    u.events += r.n; u.seconds += r.seconds; if (isOpen) u.opens += r.n; u.days.add(r.day); if (r.day > u.last) u.last = r.day;
    if (r.hotel_id) u.hotels.add(hotelName(r.hotel_id));
    if (!isEnd) u.top[r.event] = (u.top[r.event] ?? 0) + r.n;
    const a = byAction[r.event] ?? (byAction[r.event] = { n: 0, users: new Set() });
    a.n += r.n; a.users.add(r.user_id);
  }
  const totalSec = rows.reduce((s, r) => s + r.seconds, 0);
  const totalOpens = rows.filter(r => r.event === 'app_open').reduce((s, r) => s + r.n, 0);
  const activeUsers = new Set(rows.map(r => r.user_id)).size;
  const activeDays = new Set(rows.map(r => r.day)).size;

  type Row = { id: string; email: string; opens: number; minutes: number; events: number; days: number; last: string; hotels: string; top: string };
  let userRows: Row[] = Object.values(byUser).map(u => ({
    id: u.user, email: email(u.user), opens: u.opens, minutes: mins(u.seconds), events: u.events,
    days: u.days.size, last: u.last, hotels: [...u.hotels].join(', '),
    top: Object.entries(u.top).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${label(k)} ×${n}`).join(' · '),
  }));
  userRows = sortRows(userRows as unknown as Record<string, unknown>[], sort) as unknown as Row[];

  const allUsers = [...new Set((d.rows).map(r => email(r.user_id)))].sort();
  const allHotels = [...new Set((d.rows).map(r => hotelName(r.hotel_id)).filter(h => h !== '—'))].sort();
  const allActions = [...new Set((d.rows).map(r => label(r.event)))].sort();

  const exportCsv = () => {
    const head = 'day,user,hotel,action,count,minutes';
    const body = rows.map(r => [r.day, email(r.user_id), hotelName(r.hotel_id), label(r.event), r.n, mins(r.seconds)]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `firstlight-usage-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  const kpi = (k: string, v: string) => (
    <span key={k}>
      <span style={{ display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6E7A96' }}>{k}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: '#0F2860' }}>{v}</span>
    </span>
  );

  return (
    <div>
      <div style={panel}>
        <FilterBar>
          <Pick value={String(days)} onChange={v => setDays(Number(v) || 30)} options={PERIODS.map(String)} all="Last 30 days" />
          <Pick value={fUser} onChange={setFUser} options={allUsers} all="All users" />
          <Pick value={fHotel} onChange={setFHotel} options={allHotels} all="All hotels" />
          <Pick value={fAction} onChange={setFAction} options={allActions} all="All actions" />
          <button onClick={exportCsv} style={{ marginLeft: 'auto', border: '1px solid #CBDCFB', background: '#fff', color: '#1E5FD0', borderRadius: 8, padding: '5px 12px', fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Export CSV</button>
        </FilterBar>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 26, flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums' }}>
          {kpi('Active users', String(activeUsers))}
          {kpi('App opens', totalOpens.toLocaleString())}
          {kpi('Minutes on screen', mins(totalSec).toLocaleString())}
          {kpi('Days with activity', `${activeDays} / ${days}`)}
          {kpi('Actions', rows.reduce((s, r) => s + r.n, 0).toLocaleString())}
        </div>
      </div>
      <div style={panel}><Bars data={dayKeys.map(k => ({ day: k, v: mins(byDay[k]?.seconds ?? 0) }))} color="#2E7CF7" title="Minutes on screen per day" fmt={v => `${Math.round(v)} min`} /></div>
      <div style={panel}><Bars data={dayKeys.map(k => ({ day: k, v: byDay[k]?.users.size ?? 0 }))} color="#0F2860" title="Active users per day" fmt={v => String(Math.round(v))} /></div>

      <div style={panel}>
        <FilterBar><span style={{ fontSize: 12, fontWeight: 800, color: '#0F2860' }}>By user</span>
          <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: '#6E7A96' }}>click a user for the day-by-day view</span></FilterBar>
        <TableWrap minWidth={900}>
          <thead><tr>
            <Th label="User" k="email" sort={sort} onSort={toggle} />
            <Th label="Hotels" />
            <Th label="Last active" k="last" sort={sort} onSort={toggle} />
            <Th label="Active days" k="days" sort={sort} onSort={toggle} right />
            <Th label="Opens" k="opens" sort={sort} onSort={toggle} right />
            <Th label="Minutes" k="minutes" sort={sort} onSort={toggle} right />
            <Th label="Actions" k="events" sort={sort} onSort={toggle} right />
            <Th label="Top actions" />
          </tr></thead>
          <tbody>
            {userRows.flatMap((u, i) => [
              <Tr key={u.id} i={i} clickable onClick={() => setOpenUser(openUser === u.id ? null : u.id)}>
                <td style={{ ...tdS, fontWeight: 800, color: '#0F2860' }}>{openUser === u.id ? '▾ ' : '▸ '}{u.email}</td>
                <td style={{ ...tdS, whiteSpace: 'normal', maxWidth: 240 }}>{u.hotels || '—'}</td>
                <td style={{ ...tdS, color: Date.now() - new Date(u.last).getTime() < 3 * 86400000 ? '#1A7A50' : '#6E7A96' }}>{u.last}</td>
                <td style={tdR}>{u.days}</td>
                <td style={tdR}>{u.opens}</td>
                <td style={tdR}>{u.minutes}</td>
                <td style={tdR}>{u.events}</td>
                <td style={{ ...tdS, whiteSpace: 'normal', maxWidth: 300, color: '#5A6780' }}>{u.top || '—'}</td>
              </Tr>,
              ...(openUser === u.id ? [
                <tr key={u.id + ':d'}><td colSpan={8} style={{ padding: 0, background: '#F4F7FB', borderTop: '1px solid #D5DCE9' }}>
                  <UserDays rows={rows.filter(r => r.user_id === u.id)} hotelName={hotelName} />
                </td></tr>,
              ] : []),
            ])}
            {userRows.length === 0 && <tr><td style={tdS} colSpan={8}>No activity in this period for this selection.</td></tr>}
          </tbody>
        </TableWrap>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ ...panel, flex: 2, minWidth: 420 }}>
          <FilterBar><span style={{ fontSize: 12, fontWeight: 800, color: '#0F2860' }}>By day</span></FilterBar>
          <TableWrap minWidth={420}>
            <thead><tr><Th label="Day" /><Th label="Users" right /><Th label="Opens" right /><Th label="Minutes" right /><Th label="Actions" right /></tr></thead>
            <tbody>
              {[...dayKeys].reverse().filter(k => (byDay[k]?.events ?? 0) > 0).map((k, i) => (
                <Tr key={k} i={i}>
                  <td style={tdS}>{k}</td>
                  <td style={tdR}>{byDay[k].users.size}</td>
                  <td style={tdR}>{byDay[k].opens}</td>
                  <td style={tdR}>{mins(byDay[k].seconds)}</td>
                  <td style={tdR}>{byDay[k].events}</td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
        <div style={{ ...panel, flex: 1, minWidth: 320 }}>
          <FilterBar><span style={{ fontSize: 12, fontWeight: 800, color: '#0F2860' }}>By action</span></FilterBar>
          <TableWrap minWidth={320}>
            <thead><tr><Th label="Action" /><Th label="Count" right /><Th label="Users" right /></tr></thead>
            <tbody>
              {Object.entries(byAction).sort((a, b) => b[1].n - a[1].n).map(([k, a], i) => (
                <Tr key={k} i={i}>
                  <td style={tdS}>{label(k)}</td>
                  <td style={tdR}>{a.n}</td>
                  <td style={tdR}>{a.users.size}</td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA4B8', lineHeight: 1.6, marginTop: 4 }}>
        Minutes count only time the app was on screen. Sessions longer than an hour are capped, so a tab left open never looks like a reading day.
      </div>
    </div>
  );
}

function UserDays({ rows, hotelName }: { rows: AdminUsageDaily['rows']; hotelName: (id: string | null) => string }) {
  const byDay: Record<string, { opens: number; seconds: number; events: number; hotels: Set<string>; acts: Record<string, number> }> = {};
  for (const r of rows) {
    const d = byDay[r.day] ?? (byDay[r.day] = { opens: 0, seconds: 0, events: 0, hotels: new Set(), acts: {} });
    d.events += r.n; d.seconds += r.seconds; if (r.event === 'app_open') d.opens += r.n;
    if (r.hotel_id) d.hotels.add(hotelName(r.hotel_id));
    if (r.event !== 'session_end') d.acts[r.event] = (d.acts[r.event] ?? 0) + r.n;
  }
  const days = Object.keys(byDay).sort().reverse();
  return (
    <TableWrap minWidth={700}>
      <thead><tr><Th label="Day" /><Th label="Hotels" /><Th label="Opens" right /><Th label="Minutes" right /><Th label="What they did" /></tr></thead>
      <tbody>
        {days.map((k, i) => (
          <Tr key={k} i={i}>
            <td style={tdS}>{k}</td>
            <td style={{ ...tdS, whiteSpace: 'normal' }}>{[...byDay[k].hotels].join(', ') || '—'}</td>
            <td style={tdR}>{byDay[k].opens}</td>
            <td style={tdR}>{mins(byDay[k].seconds)}</td>
            <td style={{ ...tdS, whiteSpace: 'normal', color: '#5A6780' }}>
              {Object.entries(byDay[k].acts).sort((a, b) => b[1] - a[1]).map(([e, n]) => `${label(e)} ×${n}`).join(' · ') || '—'}
            </td>
          </Tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
