import { useCallback, useEffect, useState } from 'react';
import { fetchLatestBriefing } from './api';
import { sb, demoMode } from './lib/sb';
import type { Briefing } from './types';
import { Shell, type Tab } from './components/Shell';
import { KpiRow, SmartSummary } from './components/SmartSummary';
import { MtdStrip, OtbCards } from './components/Overview';
import { PickupSection } from './components/Pickup';
import { OtbTab } from './components/Charts';
import { AiTab, type FeedbackRequest } from './components/AiCards';
import { FeedbackSheet, SettingsSheet, Toast } from './components/Sheets';
import { Login } from './components/Login';

const TS_ZOOM: Record<number, number> = { 1: 0.85, 2: 1, 3: 1.12, 4: 1.25, 5: 1.4 };

export default function App() {
  const [session, setSession] = useState<boolean>(demoMode);
  const [hotels, setHotels] = useState<{ id: string; name: string }[]>([]);
  const [hotelId, setHotelId] = useState<string>('');
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fb, setFb] = useState<FeedbackRequest | null>(null);
  const [lang, setLang] = useState<'en' | 'el'>('en');
  const [textSize, setTextSize] = useState<number>(() => Number(localStorage.getItem('fl_textsize') || 2));
  const [refreshState, setRefreshState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [bellOn, setBellOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
    (async () => {
      const { data: hu } = await sb.from('hotel_users').select('hotel_id');
      const ids = (hu ?? []).map(r => r.hotel_id);
      const { data: hs } = await sb.from('hotels').select('id, name').in('id', ids);
      const list = hs ?? [];
      setHotels(list);
      setHotelId(prev => prev || localStorage.getItem('fl_hotel') || list[0]?.id || '');
    })();
  }, [session]);

  /* briefing */
  const load = useCallback(() => {
    if (!hotelId) return;
    fetchLatestBriefing().then(setBriefing).catch(e => setError(String(e)));
  }, [hotelId]);
  useEffect(load, [load]);

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
    setHotelId(id);
    localStorage.setItem('fl_hotel', id);
    window.scrollTo(0, 0);
  };

  const requestRefresh = async () => {
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
    setLang(l);
    localStorage.setItem(`fl_lang_${hotelId}`, l);
    if (sb) {
      await sb.from('hotel_prefs').upsert({ hotel_id: hotelId, language: l, updated_at: new Date().toISOString() });
      say(l === 'el' ? 'Το αυριανό briefing στα Ελληνικά' : "Tomorrow's briefing in English");
    } else say('Demo mode');
  };

  const submitFeedback = async (note: string) => {
    if (!fb) return;
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

  const signOut = async () => {
    setSettingsOpen(false);
    if (sb) await sb.auth.signOut();
  };

  const nav = (t: Tab) => {
    setTab(t);
    const id = { Overview: 'sec-overview', Pickup: 'sec-pickup', OTB: 'sec-pace', 'AI Insights': 'sec-ai' }[t];
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!session) return <Login />;
  if (error) return <p style={{ padding: 32, textAlign: 'center' }}>Could not load briefing: {error}</p>;
  if (!briefing) return <p style={{ padding: 32, textAlign: 'center', color: 'var(--n500)' }}>Loading briefing…</p>;

  return (
    <>
      <Shell
        hotels={hotels} hotelId={hotelId} onHotel={changeHotel}
        tab={tab} onTab={nav}
        aiCount={briefing.ai_insights?.insights?.length ?? 0}
        refreshState={refreshState} onRefresh={requestRefresh}
        bellOn={bellOn} onBell={() => { setBellOn(!bellOn); say(bellOn ? 'Notifications off' : 'Notifications on'); }}
        onSettings={() => setSettingsOpen(true)}
      >
        <div id="sec-overview" style={{ scrollMarginTop: 46 }} />
        <SmartSummary briefing={briefing} />
        <KpiRow briefing={briefing} />
        <MtdStrip briefing={briefing} />
        <OtbCards briefing={briefing} />
        <div id="sec-pickup" style={{ scrollMarginTop: 46 }} />
        <PickupSection briefing={briefing} />
        <div id="sec-pace" style={{ scrollMarginTop: 46 }} />
        <OtbTab briefing={briefing} />
        <div id="sec-ai" style={{ scrollMarginTop: 46 }} />
        <AiTab briefing={briefing} hotelId={hotelId} onFeedback={setFb} />
      </Shell>
      <SettingsSheet
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        lang={lang} onLang={changeLang}
        textSize={textSize} onTextSize={d => setTextSize(s => Math.min(5, Math.max(1, s + d)))}
        onSignOut={signOut}
      />
      <FeedbackSheet
        open={!!fb} verdict={fb?.verdict ?? 1}
        onClose={() => setFb(null)} onSubmit={submitFeedback}
      />
      <Toast msg={toast} />
    </>
  );
}
