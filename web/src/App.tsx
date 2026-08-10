import { useEffect, useState } from 'react';
import { fetchLatestBriefing } from './api';
import type { Briefing } from './types';
import { Shell, type Tab } from './components/Shell';
import { KpiRow, SmartSummary } from './components/SmartSummary';

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
      <SmartSummary briefing={briefing} />
      <KpiRow briefing={briefing} />
      <div className="card" style={{ padding: 18, textAlign: 'center', color: 'var(--n500)', fontSize: 13 }}>
        Next components: MTD strip · OTB cards · pace charts · pickup + butterfly ·
        demand calendar · ADR bridge · AI cards · history
      </div>
    </Shell>
  );
}
