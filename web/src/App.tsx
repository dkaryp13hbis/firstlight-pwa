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

  if (error) return <p style={{ padding: 32, textAlign: 'center' }}>Could not load briefing: {error}</p>;
  if (!briefing) return <p style={{ padding: 32, textAlign: 'center', color: 'var(--n500)' }}>Loading briefing…</p>;

  return (
    <Shell
      hotelName={briefing.data.hotel_name}
      tab={tab}
      onTab={setTab}
      aiCount={briefing.ai_insights?.insights?.length ?? 0}
    >
      {tab === 'Overview' && (
        <>
          <SmartSummary briefing={briefing} />
          <KpiRow briefing={briefing} />
          <MtdStrip briefing={briefing} />
          <OtbCards briefing={briefing} />
        </>
      )}
      {tab === 'Pickup' && <PickupSection briefing={briefing} />}
      {tab === 'OTB' && <OtbTab briefing={briefing} />}
      {tab === 'AI Insights' && <AiTab briefing={briefing} />}
    </Shell>
  );
}
