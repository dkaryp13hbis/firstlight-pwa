/** AI Insights tab — card anatomy per spec v1.2: tag badge, headline,
 *  evidence KPIs, what/why/action, at-stake. Feedback thumbs wire to the
 *  API in the go-live pass. */
import { useState } from 'react';
import type { Briefing, Insight } from '../types';
import { SectionLabel } from './Overview';

const TAG_STYLE: Record<string, { bg: string; fg: string; bd: string; label: string }> = {
  ALERT:       { bg: 'rgba(199,65,27,.10)', fg: '#C7411B', bd: 'rgba(199,65,27,.22)', label: 'Alert' },
  warning:     { bg: 'rgba(199,65,27,.10)', fg: '#C7411B', bd: 'rgba(199,65,27,.22)', label: 'Alert' },
  OPPORTUNITY: { bg: 'rgba(46,124,247,.10)', fg: '#1E6DD8', bd: 'rgba(46,124,247,.22)', label: 'Opportunity' },
  opportunity: { bg: 'rgba(46,124,247,.10)', fg: '#1E6DD8', bd: 'rgba(46,124,247,.22)', label: 'Opportunity' },
  MONITOR:     { bg: 'rgba(124,91,255,.10)', fg: '#6344D9', bd: 'rgba(124,91,255,.22)', label: 'Monitor' },
};

function Card({ ins }: { ins: Insight }) {
  const [open, setOpen] = useState(false);
  const tag = TAG_STYLE[ins.tag ?? ins.type ?? 'MONITOR'] ?? TAG_STYLE.MONITOR;
  const kpis = ins.evidence ?? ins.kpis ?? [];
  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 8 }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <h2 style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#0A1F4D', lineHeight: 1.38 }}>
          {ins.headline ?? ins.title}
        </h2>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 7,
          background: tag.bg, color: tag.fg, border: '1px solid ' + tag.bd, whiteSpace: 'nowrap',
        }}>{tag.label}</span>
        <span style={{ color: 'var(--cap)', fontSize: 12, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}>▾</span>
      </div>
      {open && (
        <div style={{ marginTop: 12 }}>
          {kpis.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpis.length, 2)}, 1fr)`, gap: 8, marginBottom: 12 }}>
              {kpis.slice(0, 2).map((k, i) => (
                <div key={i} style={{ background: '#F6F8FC', borderRadius: 10, padding: '9px 11px' }}>
                  <div className="t-cap">{k.label}</div>
                  <div className="t-value" style={{ fontSize: 15 }}>{k.value}</div>
                  {k.sub && <div className="t-cap" style={{ marginTop: 2 }}>{k.sub}</div>}
                </div>
              ))}
            </div>
          )}
          {ins.what_happened && (
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--n800)', marginBottom: 8 }}>
              <b style={{ fontWeight: 800 }}>What happened: </b>{ins.what_happened}
            </p>
          )}
          {ins.why_it_matters && (
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--n600)', marginBottom: 8 }}>
              <b style={{ fontWeight: 800, color: 'var(--n800)' }}>Why it matters: </b>{ins.why_it_matters}
            </p>
          )}
          {ins.recommended_action && (
            <div style={{ background: '#F1F6FF', borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.5 }}>
              <b style={{ fontWeight: 800 }}>Suggested review: </b>{ins.recommended_action}
              {ins.by_when && <span style={{ color: 'var(--n600)' }}> By when: {ins.by_when}</span>}
              {ins.at_stake?.value && (
                <span className="t-delta" style={{ color: 'var(--coral)' }}> At stake: {ins.at_stake.value}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AiTab({ briefing }: { briefing: Briefing }) {
  const insights = briefing.ai_insights?.insights ?? [];
  if (!insights.length) {
    return <p style={{ textAlign: 'center', color: 'var(--n500)', padding: 24, fontSize: 13 }}>No insights for today.</p>;
  }
  return (
    <>
      <SectionLabel>AI Insights</SectionLabel>
      {insights.map((ins, i) => <Card key={ins.id || i} ins={ins} />)}
    </>
  );
}
