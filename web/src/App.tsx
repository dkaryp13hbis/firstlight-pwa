import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchLatestBriefing, fetchBriefingByDate, fetchDates, fetchPrevBriefing, fetchHistoryRows, fetchWatchlist, addWatch, removeWatch, fetchRuns, type RefreshRun } from './api';
import { sb, demoMode } from './lib/sb';
import type { Briefing } from './types';
import { WatchlistSection, WatchSheet, titleCase } from './components/Watchlist';
import { WATCHLIST_EMAILS, WATCH_CAP, itemTitle, monthKey, rangeKey, type WatchItem, type WatchKind } from './lib/watch';
import { Shell, type Tab } from './components/Shell';
import { SmartSummary } from './components/SmartSummary';
import { KpiRow, MtdStrip, OtbCards } from './components/Overview';
import { PickupSection } from './components/Pickup';
import { OtbTab, buildNextPace } from './components/Charts';
import { AiTab, type FeedbackRequest } from './components/AiCards';
import { DataHealthSheet, FeedbackSheet, SettingsSheet, Toast } from './components/Sheets';
import { Login } from './components/Login';
import { registerSW, isSubscribed, subscribe, unsubscribe, getPrefs, setPrefs, DEFAULT_PREFS, type PushPrefs } from './lib/push';
import { initTracking, setTrackedHotel, track } from './lib/track';
import { setShareMeta } from './lib/shareImage';

const TS_ZOOM: Record<number, number> = { 1: 0.85, 2: 1, 3: 1.12, 4: 1.25, 5: 1.4 };

/* Local cache → instant paint on open (stale-while-revalidate). */
function readCache<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function writeCache(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota — ignore */ }
}

export default function App() {
  const [session, setSession] = useState<boolean>(() => demoMode
    || Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')));
  const [hotels, setHotels] = useState<{ id: string; name: string }[]>([]);
  const [hotelId, setHotelId] = useState<string>('');
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [runs, setRuns] = useState<RefreshRun[] | null>(null);
  const [runsLoaded, setRunsLoaded] = useState(false);
  const [movement, setMovement] = useState<number | null>(null);
  const [fb, setFb] = useState<FeedbackRequest | null>(null);
  const [lang, setLang] = useState<'en' | 'el'>('en');
  const [textSize, setTextSize] = useState<number>(() => Number(localStorage.getItem('fl_textsize') || 2));
  const [refreshState, setRefreshState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [bellOn, setBellOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [revMode, setRevMode] = useState<'gross' | 'net'>(
    () => (localStorage.getItem('fl_revmode') as 'gross' | 'net') || 'gross');
  const [year, setYearState] = useState<'this' | 'next'>('this');
  const [comp, setComp] = useState<'this' | 'prev'>('prev');
  const setYear = (k: 'this' | 'next') => {
    track('setting_change', { setting: 'reporting_year', value: k });
    setYearState(k); setComp(k === 'this' ? 'prev' : 'this');
  };
  const [pull, setPull] = useState(0);
  const pullRef = useRef(0);
  const [pushPrefs, setPushPrefs] = useState<PushPrefs | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [viewDate, setViewDate] = useState<string | null>(null);  // null = latest
  /* My Watchlist: items, yesterday's row (for "since yesterday"), sheet, gate */
  const [watch, setWatch] = useState<WatchItem[] | null>(null);   // null = table missing / not loaded
  const [prevB, setPrevB] = useState<Briefing | null>(null);
  const [watchOpen, setWatchOpen] = useState(false);
  const [watchOn, setWatchOn] = useState(demoMode);
  const [hist, setHist] = useState<Briefing[] | null>(null);       // last 7 stored rows (watch trend), lazy
  const histFor = useRef<string>('');

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  /* auth + hotels */
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    if (!sb) { setHotels([{ id: 'demo', name: 'Pomegranate Wellness Spa Hotel' }]); setHotelId('demo'); return; }
    const cachedHotels = readCache<{ id: string; name: string }[]>('fl_hotels');
    if (cachedHotels?.length) {
      setHotels(cachedHotels);
      setHotelId(prev => prev || localStorage.getItem('fl_hotel') || cachedHotels[0].id);
    }
    (async () => {
      const { data: hu } = await sb.from('hotel_users').select('hotel_id');
      const ids = (hu ?? []).map(r => r.hotel_id);
      const { data: hs } = await sb.from('hotels').select('id, name').in('id', ids);
      const list = hs ?? [];
      if (!list.length) return;
      setHotels(list);
      writeCache('fl_hotels', list);
      setHotelId(prev => (prev && list.some(h => h.id === prev)) ? prev
        : (list.find(h => h.id === localStorage.getItem('fl_hotel'))?.id ?? list[0].id));
    })();
  }, [session]);

  /* briefing */
  const load = useCallback(() => {
    if (!hotelId) return;
    const cached = readCache<Briefing>(`fl_briefing_${hotelId}`);
    if (cached) setBriefing(cached);
    fetchLatestBriefing(hotelId)
      .then(b => {
        setBriefing(b); setError(null); writeCache(`fl_briefing_${hotelId}`, b);
        fetchPrevBriefing(hotelId, b.report_date).then(setPrevB).catch(() => setPrevB(null));
      })
      .catch(e => { if (!cached) setError(String(e)); });
    fetchDates(hotelId, 7).then(setDates).catch(() => setDates([]));
    fetchWatchlist(hotelId).then(setWatch).catch(() => setWatch(null));
    setHist(null); histFor.current = '';
  }, [hotelId]);
  useEffect(load, [load]);

  /* watchlist gate — same pattern as usage tracking (demo account first) */
  useEffect(() => {
    if (!sb) { setWatchOn(true); return; }
    if (!session) { setWatchOn(false); return; }
    sb.auth.getSession().then(({ data }) => {
      const email = (data.session?.user.email ?? '').toLowerCase();
      setWatchOn(WATCHLIST_EMAILS === null || WATCHLIST_EMAILS.includes(email));
    }).catch(() => setWatchOn(false));
  }, [session]);

  /* branded share frame: hotel + report date */
  useEffect(() => {
    if (!briefing) return;
    const dt = new Date(briefing.report_date + 'T00:00:00Z');
    setShareMeta({
      hotel: briefing.data.hotel_name,
      date: `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getUTCDay()]} ${dt.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getUTCMonth()]}`,
    });
  }, [briefing]);

  /* per-hotel language preference */
  useEffect(() => {
    if (hotelId) setLang((localStorage.getItem(`fl_lang_${hotelId}`) as 'en' | 'el') || 'en');
  }, [hotelId]);

  /* text size (body zoom, like the current app) */
  useEffect(() => {
    (document.body.style as unknown as { zoom: string }).zoom = String(TS_ZOOM[textSize] ?? 1);
    localStorage.setItem('fl_textsize', String(textSize));
  }, [textSize]);

  const changeHotel = (id: string) => {
    setViewDate(null);
    setWatch(null); setPrevB(null);
    setTrackedHotel(id);
    track('hotel_switch', {});
    setHotelId(id);
    localStorage.setItem('fl_hotel', id);
    window.scrollTo(0, 0);
  };

  /* ── My Watchlist actions ── */
  const watchedKeys = useMemo(() => new Set((watch ?? []).map(w => `${w.kind}:${w.key}`)), [watch]);
  const watchedMonths = useMemo(() => new Set((watch ?? []).filter(w => w.kind === 'month').map(w => w.key)), [watch]);
  const watchedRanges = useMemo(() => new Set((watch ?? []).filter(w => w.kind === 'range').map(w => w.key)), [watch]);
  const saveWatch = async (kind: WatchKind, key: string, label: string | null, from: string) => {
    if (!briefing) return;
    if ((watch?.length ?? 0) >= WATCH_CAP) { say(`Watchlist is full (${WATCH_CAP})`); return; }
    const r = await addWatch(hotelId, kind, key, label);
    if (!r.ok) { say(r.msg); return; }
    track('watch_add', { kind, key, from });
    setWatch(w => [...(w ?? []), r.item]);
    setWatchOpen(false);
    say(`Watching ${titleCase(itemTitle(r.item, briefing.report_date))}`);
  };
  const dropWatch = async (item: WatchItem) => {
    const ok = await removeWatch(hotelId, item.id);
    if (!ok) { say('Could not remove the watch'); return; }
    track('watch_remove', { kind: item.kind, key: item.key });
    setWatch(w => (w ?? []).filter(x => x.id !== item.id));
    say('Removed from your watchlist');
  };
  const toggleMonthWatch = (key: string, from: string) => {
    const ex = (watch ?? []).find(w => w.kind === 'month' && w.key === key);
    if (ex) void dropWatch(ex); else void saveWatch('month', key, null, from);
  };
  const watchActive = watchOn && watch !== null;
  /* trend history: the stored rows behind the 7-day strip, fetched once per hotel on first expand */
  const loadHistory = async () => {
    if (histFor.current === hotelId) return;
    histFor.current = hotelId;
    const past = dates.filter(d => d !== briefing?.report_date).slice(0, 7);
    try { setHist(await fetchHistoryRows(hotelId, past)); }
    catch { setHist([]); }
  };

  const requestRefresh = async () => {
    if (viewDate) { say('Viewing a past briefing — go back to Today first'); return; }
    track('refresh_tap', {});
    setRefreshState('busy');
    if (!sb) { setTimeout(() => { setRefreshState('idle'); say('Demo mode — no live refresh'); }, 1200); return; }
    const client = sb;
    await client.from('refresh_commands').insert({ hotel_id: hotelId, type: 'data_only' });
    const t0 = Date.now();
    const poll = setInterval(async () => {
      if (Date.now() - t0 > 4 * 60 * 1000) { clearInterval(poll); setRefreshState('error'); return; }
      const { data } = await client.from('refresh_commands').select('status')
        .eq('hotel_id', hotelId).gte('requested_at', new Date(t0 - 5000).toISOString())
        .order('requested_at', { ascending: false }).limit(1);
      if (data?.[0]?.status === 'done') {
        clearInterval(poll); setRefreshState('idle'); say('Refreshed'); load();
      }
    }, 12000);
  };

  const changeLang = async (l: 'en' | 'el') => {
    track('setting_change', { setting: 'language', value: l });
    setLang(l);
    localStorage.setItem(`fl_lang_${hotelId}`, l);
    if (sb) {
      await sb.from('hotel_prefs').upsert({ hotel_id: hotelId, language: l, updated_at: new Date().toISOString() });
      say(l === 'el' ? 'Το αυριανό briefing στα Ελληνικά' : "Tomorrow's briefing in English");
    } else say('Demo mode');
  };

  const submitFeedback = async (note: string) => {
    if (!fb) return;
    track('feedback_submit', { card: fb.cardId, verdict: fb.verdict, has_note: !!note });
    const key = `fl_fb_${hotelId}_${briefing?.report_date}_${fb.cardId}`;
    if (sb) {
      const row = {
        hotel_id: hotelId, report_date: briefing?.report_date, card_id: fb.cardId,
        verdict: fb.verdict, reason: note || null, card_content: fb.card ?? null,
      };
      const conflict = { onConflict: 'hotel_id,report_date,card_id,user_id' };
      let { error: err } = await sb.from('insight_feedback').upsert(row, conflict);
      if (err) ({ error: err } = await sb.from('insight_feedback').upsert({ ...row, card_content: undefined }, conflict));
      if (err) { say('Could not save feedback'); setFb(null); return; }
    }
    const changed = localStorage.getItem(key) && localStorage.getItem(key) !== String(fb.verdict);
    localStorage.setItem(key, String(fb.verdict));
    say(changed ? 'Feedback updated' : 'Thanks for the feedback');
    setFb(null);
    setBriefing(b => b ? { ...b } : b); // re-render highlights
  };

  /* pull-to-refresh (logo + spinner revealed above the header) */
  useEffect(() => {
    let startY = 0, active = false;
    const setP = (v: number) => { pullRef.current = v; setPull(v); };
    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) { startY = e.touches[0].clientY; active = true; }
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && window.scrollY <= 0) setP(Math.min(dy * 0.45, 96));
      else if (dy <= 0) setP(0);
    };
    const onEnd = () => { setP(0); active = false; };
    const onScroll = () => { if (window.scrollY > 2 && pullRef.current > 0) { setP(0); active = false; } };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const openHealth = async () => {
    setSettingsOpen(false);
    setHealthOpen(true);
    setRunsLoaded(false);
    track('data_health_open', {});
    const r = await fetchRuns(hotelId);
    setRuns(r); setRunsLoaded(true);
    /* movement over the last 2 report days (booked + cancelled) */
    try {
      const rows = await fetchHistoryRows(hotelId, dates.slice(0, 2));
      if (rows.length >= 2) {
        const mv = rows.reduce((s, b) => {
          const pu = b.data.pickup;
          return s + ((pu?.last1d?.roomNights ?? 0) + (pu?.cancellations1d ?? 0));
        }, 0);
        setMovement(mv);
      } else setMovement(null);
    } catch { setMovement(null); }
  };

  const signOut = async () => {
    setSettingsOpen(false);
    Object.keys(localStorage).filter(k => k.startsWith('fl_briefing_') || k === 'fl_hotels').forEach(k => localStorage.removeItem(k));
    setBriefing(null); setHotels([]); setHotelId('');
    if (sb) await sb.auth.signOut();
  };

  const netAvailable = (briefing?.data.mtd as unknown as { revenueNet?: number } | undefined)?.revenueNet != null;
  const changeRevMode = (m: 'gross' | 'net') => {
    if (m === 'net' && !netAvailable) {
      say('Net figures arrive with the next data refresh'); return;
    }
    track('setting_change', { setting: 'revenue', value: m });
    setRevMode(m);
    localStorage.setItem('fl_revmode', m);
    say(m === 'net' ? 'Showing net revenue' : 'Showing gross revenue');
  };

  /* Net view: exact logisnet fields where the payload carries them (yesterday,
     MTD, OTB pace); sections without a net query yet (pickup, channels, next
     year, ADR bridge) are scaled by the hotel's net/gross factor so the whole
     app reads in one basis. */
  const viewBriefing = useMemo(() => {
    if (!briefing || revMode === 'gross' || !netAvailable) return briefing;
    type NumRec = Record<string, number | undefined>;
    const src = briefing.data as unknown as Record<string, unknown>;
    const ratio = (o: NumRec | undefined, n: string, g: string) =>
      o && typeof o[n] === 'number' && (o[g] ?? 0) > 0 ? (o[n] as number) / (o[g] as number) : null;
    const paceTot = ((src.pace as NumRec[] | undefined) ?? []).reduce<{ n: number; g: number }>(
      (a, p) => ({ n: a.n + (p.rev_net ?? 0), g: a.g + (p.rev ?? 0) }), { n: 0, g: 0 });
    const f = ratio(src.mtd as NumRec, 'revenueNet', 'revenue')
      ?? ratio(src.yesterday as NumRec, 'revenueNet', 'revenue')
      ?? (paceTot.g > 0 ? paceTot.n / paceTot.g : 1);
    const b: Briefing = JSON.parse(JSON.stringify(briefing));
    const bd = b.data as unknown as Record<string, unknown>;
    const day = (o: NumRec) => {
      o.revenue = o.revenueNet ?? (o.revenue ?? 0) * f;
      o.revenueLY = o.revenueNetLY ?? (o.revenueLY ?? 0) * f;
      if (o.roomNights) o.adr = o.revenue / o.roomNights;
      else o.adr = (o.adr ?? 0) * f;
      if (o.roomNightsLY) o.adrLY = (o.revenueLY ?? 0) / o.roomNightsLY;
      else o.adrLY = (o.adrLY ?? 0) * f;
    };
    day(bd.yesterday as NumRec);
    day(bd.mtd as NumRec);
    for (const p of (bd.pace as NumRec[] | undefined) ?? []) {
      p.rev = p.rev_net ?? (p.rev ?? 0) * f;
      p.rev_stly = p.rev_stly_net ?? (p.rev_stly ?? 0) * f;
      p.rev_final = p.rev_final_net ?? (p.rev_final ?? 0) * f;
      p.adr = p.rn ? (p.rev ?? 0) / p.rn : (p.adr ?? 0) * f;
      p.adr_stly = p.rn_stly ? (p.rev_stly ?? 0) / p.rn_stly : (p.adr_stly ?? 0) * f;
      p.adr_final_ly = p.rn_final_ly ? (p.rev_final ?? 0) / p.rn_final_ly : (p.adr_final_ly ?? 0) * f;
    }
    for (const p of (bd.pace_current as NumRec[] | undefined) ?? []) {
      p.rev = p.rev_net ?? (p.rev ?? 0) * f;
      p.rev_stly = p.rev_stly_net ?? (p.rev_stly ?? 0) * f;
      p.adr = p.rn ? (p.rev ?? 0) / p.rn : (p.adr ?? 0) * f;
      p.adr_stly = p.rn_stly ? (p.rev_stly ?? 0) / p.rn_stly : (p.adr_stly ?? 0) * f;
    }
    const pu = bd.pickup as Record<string, unknown> | undefined;
    if (pu) {
      for (const k of ['today', 'last1d', 'last3d', 'last7d']) {
        const w = pu[k] as NumRec | undefined;
        if (w) w.revenue = (w.revenue ?? 0) * f;
      }
      for (const k of ['cancellationRevenue', 'cancellationRevenueToday', 'cancellationRevenue3d', 'cancellationRevenue7d']) {
        if (typeof pu[k] === 'number') pu[k] = (pu[k] as number) * f;
      }
    }
    for (const r of (bd.consumed_by_source as NumRec[] | undefined) ?? []) r.rev = (r.rev ?? 0) * f;
    for (const c of (bd.topChannels as NumRec[] | undefined) ?? []) {
      c.rev = (c.rev ?? 0) * f; c.rev_stly = (c.rev_stly ?? 0) * f;
    }
    for (const r of (bd.pace_next_year as NumRec[] | undefined) ?? []) {
      r.rev = (r.rev ?? 0) * f; r.rev_stly = (r.rev_stly ?? 0) * f;
      if (typeof r.rev_stly2 === 'number') r.rev_stly2 = r.rev_stly2 * f;
    }
    for (const r of (bd.pickup_daily as NumRec[] | undefined) ?? []) {
      if (typeof r.net_rev === 'number') r.net_rev = r.net_rev * f;
    }
    for (const r of (bd.cancel_daily as NumRec[] | undefined) ?? []) {
      if (typeof r.cancel_rev === 'number') r.cancel_rev = r.cancel_rev * f;
    }
    return b;
  }, [briefing, revMode, netAvailable]);

  /* Web Push: service worker + honest bell state (browser subscription AND server row). */
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  useEffect(() => {
    registerSW(sectionId => {
      const t = ({ 'sec-overview': 'Overview', 'sec-pickup': 'Pickup', 'sec-pace': 'Pace', 'sec-ai': 'AI Insights' } as Record<string, Tab>)[sectionId];
      if (t) setTimeout(() => nav(t), 400);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (session && hotelId) isSubscribed(hotelId).then(setBellOn); }, [session, hotelId]);
  useEffect(() => { if (session && hotelId && bellOn) getPrefs(hotelId).then(setPushPrefs); else setPushPrefs(null); }, [session, hotelId, bellOn]);

  const trackedInit = useRef(false);
  useEffect(() => {
    if (session && hotelId && !trackedInit.current) { trackedInit.current = true; void initTracking(hotelId); }
  }, [session, hotelId]);

  const changePushPref = async (k: 'morning' | 'alerts' | 'momentum', v: boolean) => {
    const next = { ...(pushPrefs ?? DEFAULT_PREFS), [k]: v };
    setPushPrefs(next);
    track('setting_change', { setting: `push_${k}`, value: v });
    const ok = await setPrefs(hotelId, next);
    if (!ok) say('Could not save — is the notifications SQL applied?');
  };

  const toggleBell = async () => {
    track('bell_toggle', { to: bellOn ? 'off' : 'on' });
    const name = hotels.find(h => h.id === hotelId)?.name ?? 'this hotel';
    if (bellOn) { const m = await unsubscribe(hotelId, name); setBellOn(false); say(m); return; }
    const r = await subscribe(hotelId, name);
    setBellOn(r.ok);
    if (r.ok) say(r.msg); else setPushMsg(r.msg);
  };

  const selectDate = async (d: string | null) => {
    if (d === null || d === dates[0]) {
      setViewDate(null); load(); return;
    }
    track('history_view', { date: d });
    try {
      const b = await fetchBriefingByDate(hotelId, d);
      if (!b) { say('No briefing stored for that day'); return; }
      setViewDate(d); setBriefing(b);
      window.scrollTo({ top: 0 });
    } catch { say('Could not load that day'); }
  };

  const nav = (t: Tab) => {
    track('tab_nav', { tab: t });
    setTab(t);
    const id = { Overview: 'sec-overview', Pickup: 'sec-pickup', Pace: 'sec-pace', 'AI Insights': 'sec-ai' }[t];
    const el = document.getElementById(id);
    if (!el) return;
    const stickyH = document.getElementById('fl-sticky')?.offsetHeight ?? 46;
    const y = el.getBoundingClientRect().top + window.scrollY - stickyH - 6;
    window.scrollTo({ top: Math.max(y, 0), behavior: 'smooth' });
  };

  if (!session) return <Login />;
  if (error) return <p style={{ padding: 32, textAlign: 'center' }}>Could not load briefing: {error}</p>;
  if (!briefing) return (
    <Shell hotels={hotels} hotelId={hotelId} onHotel={changeHotel} tab={tab} onTab={setTab} aiCount={0}
      refreshState="idle" onRefresh={() => undefined} bellOn={bellOn} onBell={() => undefined}
      onSettings={() => setSettingsOpen(true)}>
      <p style={{ padding: '40px 0', textAlign: 'center', color: 'var(--n500)', fontSize: 13, fontWeight: 600 }}>Loading briefing…</p>
    </Shell>
  );

  return (
    <>
      {pull > 4 && <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: pull,
        background: '#fff', zIndex: 998, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        paddingBottom: 8, transition: pull === 0 ? 'height .2s' : 'none',
      }}>
        <svg width="26" height="26" viewBox="0 0 100 100" fill="none" style={{ marginBottom: 4 }}>
          <path d="M18 38 38 28 54 33 74 16" stroke="#2E7CF7" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="74" cy="16" r="5" fill="#38E1F0" />
          <rect x="18" y="50" width="8" height="36" rx="4" fill="#0A1F4D" />
          <rect x="18" y="50" width="26" height="8" rx="4" fill="#0A1F4D" />
          <rect x="18" y="64" width="19" height="8" rx="4" fill="#0A1F4D" />
          <rect x="62" y="50" width="8" height="36" rx="4" fill="#0A1F4D" />
          <rect x="62" y="78" width="24" height="8" rx="4" fill="#0A1F4D" />
        </svg>
        <span style={{
          color: '#9AA4B8', fontSize: 14, fontWeight: 700, display: 'inline-block',
          transform: `rotate(${pull * 3.2}deg)`,
        }}>↻</span>
      </div>}
      <div style={{ transform: `translateY(${pull}px)`, transition: pull === 0 ? 'transform .2s' : 'none' }}>
      <Shell
        hotels={hotels} hotelId={hotelId} onHotel={changeHotel}
        tab={tab} onTab={nav}
        aiCount={briefing.ai_insights?.insights?.length ?? 0}
        refreshState={refreshState} onRefresh={requestRefresh}
        bellOn={bellOn} onBell={toggleBell}
        onSettings={() => setSettingsOpen(true)}
      >
        <div id="sec-overview" style={{ scrollMarginTop: 46 }} />
        {dates.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 0 12px', paddingBottom: 2, WebkitOverflowScrolling: 'touch' }}>
            {dates.map((d, i) => {
              const on = viewDate === d || (viewDate === null && i === 0);
              const dt = new Date(d + 'T00:00:00Z');
              const label = i === 0 ? 'Today'
                : `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getUTCDay()]} ${dt.getUTCDate()}`;
              return (
                <button key={d} onClick={() => selectDate(i === 0 ? null : d)} style={{
                  border: on ? 'none' : '1px solid #CDD4E0', background: on ? '#0F2860' : '#fff',
                  color: on ? '#fff' : '#4D5A74', borderRadius: 999, padding: '6px 13px',
                  fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', flex: '0 0 auto',
                }}>{label}</button>
              );
            })}
          </div>
        )}
        {!viewDate && briefing.report_date < new Date(Date.now() - 86400000).toISOString().slice(0, 10) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            background: '#FBEEDC', color: '#6D4C00', borderRadius: 12, padding: '9px 13px',
            fontSize: 12, fontWeight: 700, marginBottom: 12,
          }}>
            <span>⚠ Data may be out of date — last update {briefing.report_date}</span>
            <button onClick={openHealth} style={{
              border: 'none', background: '#6D4C00', color: '#fff', borderRadius: 999,
              padding: '4px 11px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            }}>Data health</button>
          </div>
        )}
        {viewDate && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            background: '#FBEEDC', color: '#6D4C00', borderRadius: 12, padding: '9px 13px',
            fontSize: 12, fontWeight: 700, marginBottom: 12,
          }}>
            <span>Viewing the briefing of {(() => { const dt = new Date(viewDate + 'T00:00:00Z'); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getUTCDay()]} ${dt.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getUTCMonth()]}`; })()}</span>
            <button onClick={() => selectDate(null)} style={{
              border: 'none', background: '#6D4C00', color: '#fff', borderRadius: 999,
              padding: '4px 11px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            }}>Back to Today</button>
          </div>
        )}
        <SmartSummary briefing={viewBriefing ?? briefing} />
        {revMode === 'net' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '-6px 0 14px', fontSize: 12, fontWeight: 600, color: '#5A6780' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: '#0F2860', background: '#E9EDF4', borderRadius: 999, padding: '3px 9px' }}>NET</span>
            Revenue and ADR shown net of VAT &amp; taxes · change in Settings
          </div>
        )}
        <KpiRow briefing={viewBriefing ?? briefing} />
        <MtdStrip briefing={viewBriefing ?? briefing} />
        {!viewDate && watchActive && watch && (
          <WatchlistSection briefing={briefing} prev={prevB} items={watch}
            history={hist} onLoadHistory={() => { track('watch_expand', {}); void loadHistory(); }}
            onAdd={() => setWatchOpen(true)} onRemove={dropWatch}
            onTap={l => { track('watch_tap', { kind: l.item.kind }); nav('Pace'); }} />
        )}
        {year === 'next' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '-2px 0 14px', fontSize: 12, fontWeight: 600, color: '#5A6780' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: '#0F2860', background: '#E9EDF4', borderRadius: 999, padding: '3px 9px' }}>{new Date().getFullYear() + 1}</span>
            Reporting year {new Date().getFullYear() + 1} vs {new Date().getFullYear() - (comp === 'prev' ? 1 : 0)}
            {comp === 'prev' ? ' — same stage & final' : ' — closed months final · open months same stage'} · change in Settings
          </div>
        )}
        <OtbCards briefing={viewBriefing ?? briefing} year={year} nextPace={buildNextPace(viewBriefing ?? briefing, comp)}
          watched={watchActive && !viewDate ? watchedMonths : undefined}
          onWatch={watchActive && !viewDate ? m => toggleMonthWatch(monthKey(Number(briefing.report_date.slice(0, 4)), m), 'otb_card') : undefined} />
        <div id="sec-pickup" style={{ scrollMarginTop: 46 }} />
        <PickupSection briefing={viewBriefing ?? briefing} year={year} comp={comp} />
        <div id="sec-pace" style={{ scrollMarginTop: 46 }} />
        <OtbTab briefing={viewBriefing ?? briefing} year={year} comp={comp}
          watchedRanges={watchActive && !viewDate ? watchedRanges : undefined}
          onWatchRange={watchActive && !viewDate ? (f, t) => void saveWatch('range', rangeKey(f, t), null, 'heatmap') : undefined} />
        <div id="sec-ai" style={{ scrollMarginTop: 46 }} />
        <AiTab briefing={briefing} hotelId={hotelId} onFeedback={setFb}
          watched={watchActive && !viewDate ? watchedMonths : undefined}
          onWatch={watchActive && !viewDate ? k => toggleMonthWatch(k, 'ai_card') : undefined} />
        <div style={{
          marginTop: 28, padding: '14px 4px 6px', borderTop: '1px solid #E2E7F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
              <path d="M18 38 38 28 54 33 74 16" stroke="#2E7CF7" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="74" cy="16" r="5" fill="#38E1F0" />
              <rect x="18" y="50" width="8" height="36" rx="4" fill="#0A1F4D" />
              <rect x="18" y="50" width="26" height="8" rx="4" fill="#0A1F4D" />
              <rect x="18" y="64" width="19" height="8" rx="4" fill="#0A1F4D" />
              <rect x="62" y="50" width="8" height="36" rx="4" fill="#0A1F4D" />
              <rect x="62" y="78" width="24" height="8" rx="4" fill="#0A1F4D" />
            </svg>
            <span style={{ font: "700 14px/1 'Outfit', sans-serif", letterSpacing: '-.02em', color: '#3D4C6F' }}>
              First<span style={{ color: 'var(--blue)', opacity: .85 }}>Light</span>
            </span>
          </span>
          <span style={{ fontSize: 10.5, color: '#A8B1C2', fontWeight: 600 }}>© 2026 · All rights reserved</span>
          <a href="https://hbis.io" style={{
            background: 'rgba(46,124,247,.08)', color: 'var(--blue)', textDecoration: 'none',
            borderRadius: 999, padding: '4px 11px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap',
          }}>an HBIS app</a>
        </div>
      </Shell>
      </div>
      <SettingsSheet
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        lang={lang} onLang={changeLang}
        revMode={revMode} onRevMode={changeRevMode}
        pushPrefs={pushPrefs} onPushPref={changePushPref} bellOn={bellOn}
        year={year} onYear={setYear} comp={comp} onComp={setComp}
        textSize={textSize} onTextSize={d => setTextSize(s => Math.min(5, Math.max(1, s + d)))}
        onDataHealth={openHealth}
        onSignOut={signOut}
      />
      <FeedbackSheet
        open={!!fb} verdict={fb?.verdict ?? 1}
        onClose={() => setFb(null)} onSubmit={submitFeedback}
      />
      {watchActive && watch && (
        <WatchSheet open={watchOpen} onClose={() => setWatchOpen(false)} briefing={briefing}
          existing={watchedKeys} used={watch.length} onSave={saveWatch} />
      )}
      <DataHealthSheet open={healthOpen} onClose={() => setHealthOpen(false)}
        reportDate={briefing?.report_date ?? null} movement={movement}
        runs={runs} runsLoaded={runsLoaded} />
      <Toast msg={toast} />
      {pushMsg && (
        <div onClick={() => setPushMsg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,21,53,.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: '20px 20px 16px', maxWidth: 360, boxShadow: '0 12px 40px rgba(10,20,45,.25)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F2860', marginBottom: 8 }}>Notifications</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#4D5A74', lineHeight: 1.45 }}>{pushMsg}</div>
            <div style={{ textAlign: 'right', marginTop: 14 }}>
              <button onClick={() => setPushMsg(null)} style={{ border: 'none', background: '#0F2860', color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 10 }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
