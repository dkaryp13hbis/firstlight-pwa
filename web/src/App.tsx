import { useEffect, useState } from 'react';
import { fetchLatestBriefing } from './api';
import type { Briefing } from './types';
import { Shell, type Tab } from './components/Shell';
import { KpiRow, SmartSummary } from './components/SmartSummary';
import { MtdStrip, OtbCards } from './components/Overview';
import { PickupSection } from './components/Pickup';
import { OtbTab } from './components/Charts';
import { AiTab } from './components/AiCards';

export default function App() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    fetchLatestBriefing().then(setBriefing).catch(e => setError(String(e)));
  }, []);

  const nav = (t: Tab) => {
    setTab(t);
    const id = { Overview: 'sec-overview', Pickup: 'sec-pickup', OTB: 'sec-pace', 'AI Insights': 'sec-ai' }[t];
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (error) return <p style={{ padding: 32, textAlign: 'center' }}>Could not load briefing: {error}</p>;
  if (!briefing) return <p style={{ padding: 32, textAlign: 'center', color: 'var(--n500)' }}>Loading briefing…</p>;

  return (
    <Shell
      hotelName={briefing.data.hotel_name}
      tab={tab}
      onTab={nav}
      aiCount={briefing.ai_insights?.insights?.length ?? 0}
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
      <AiTab briefing={briefing} />
    </Shell>
  );
}
