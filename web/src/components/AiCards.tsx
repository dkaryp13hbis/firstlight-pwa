/** FL Pulse — insight cards per the fl-pulse-19a-20b handoff (2026-09-05):
 *  collapsed white rows (title + tinted sans tag pill + chevron), expanded
 *  body with stat boxes, What/Why paragraphs, Suggested review in ink-blue,
 *  "Was this useful? Yes/No" pills + Watch. Fonts: Manrope per the app's
 *  one-type-system rule (handoff's Outfit/Plex Mono not adopted). */
import { useState } from 'react';
import type { Briefing, Insight } from '../types';
import { SectionLabel, EyeIcon } from './Overview';
import { track } from '../lib/track';
import { monthKeyFromCardId } from '../lib/watch';
export interface FeedbackRequest { cardId: string; verdict: 1 | -1; card: Insight | null }

/* tinted sans pills per handoff (Monitor renders as Watch/amber) */
const TAG_STYLE: Record<string, { bg: string; fg: string; bd: string; label: string }> = {
  ALERT:       { fg: '#B0433A', bg: '#FDEFEA', bd: '#F5CFC7', label: 'Alert' },
  warning:     { fg: '#B0433A', bg: '#FDEFEA', bd: '#F5CFC7', label: 'Alert' },
  OPPORTUNITY: { fg: '#1E5FD0', bg: '#EAF1FE', bd: '#CBDCFB', label: 'Opportunity' },
  opportunity: { fg: '#1E5FD0', bg: '#EAF1FE', bd: '#CBDCFB', label: 'Opportunity' },
  MONITOR:     { fg: '#8A6D1F', bg: '#FBF3DF', bd: '#EDDCA8', label: 'Watch' },
};

/** Signed numbers (+24.2%, −56.1pts) tinted green/red for bare-eye scanning.
 *  Only explicit signs count — the dash in a range like "Sep 9–11" is
 *  preceded by a digit and stays plain. */
function SignedText({ text }: { text: string }) {
  const parts = String(text).split(/(^|[\s(])([+\-−]€?\d[\d.,]*(?:%|\s?pts|\s?pp)?)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^[+\-−]€?\d/.test(p)
          ? <b key={i} style={{ color: p.startsWith('+') ? '#1A7A50' : '#B0433A', fontWeight: 700 }}>{p}</b>
          : <span key={i}>{p}</span>)}
    </>
  );
}

function statColor(v: string): string {
  if (/^\+/.test(v)) return '#1A7A50';
  if (/^[-−]/.test(v)) return '#B0433A';
  return '#0f1b34';
}

function Card({ ins, cardId, voted, onFeedback, watchKey, watched, onWatch }: {
  ins: Insight; cardId: string; voted: string | null;
  onFeedback: (r: FeedbackRequest) => void;
  watchKey: string | null; watched: boolean; onWatch?: (monthKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const tag = TAG_STYLE[ins.tag ?? ins.type ?? 'MONITOR'] ?? TAG_STYLE.MONITOR;
  const kpisRaw = ins.evidence ?? ins.kpis ?? [];
  /* legacy cards carry "€X at stake" subs — estimates are no longer shown */
  const kpis = kpisRaw.map(k => (/at stake/i.test(k.sub ?? '') ? { ...k, sub: undefined } : k));
  const vote = (v: 1 | -1, label: string, color: string) => (
    <button key={label} onClick={() => onFeedback({ cardId, verdict: v, card: ins })} style={{
      fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', border: 'none', borderRadius: 999,
      padding: '6px 12px', cursor: 'pointer',
      background: voted === String(v) ? '#E8F0FE' : '#F1F3F8',
      color: voted === String(v) ? '#1E5FD0' : color,
      outline: voted === String(v) ? '1.5px solid #CBDCFB' : 'none',
    }}>{label}</button>
  );
  return (
    <div style={{
      borderRadius: 16, background: '#fff', boxShadow: '0 1px 2px rgba(15,27,52,.05)',
      overflow: 'hidden', marginBottom: 10,
    }}>
      <button onClick={() => { if (!open) track('card_expand', { card: ins.id ?? ins.title }); setOpen(!open); }} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', cursor: 'pointer',
        background: '#fff', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit',
        borderBottom: open ? '1px solid #E2E7F0' : 'none',
      }}>
        <span style={{
          flex: 1, fontSize: 14, fontWeight: open ? 700 : 600, lineHeight: 1.35,
          color: '#0f1b34', textWrap: 'pretty' as never,
        }}><SignedText text={ins.headline ?? ins.title ?? ''} /></span>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '.03em', padding: '5px 10px',
          borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
          color: tag.fg, background: tag.bg, border: '1px solid ' + tag.bd,
        }}>{tag.label}</span>
        <span style={{ flexShrink: 0, display: 'inline-flex', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .25s ease' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6E7A96" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>
      {open && (
        <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {kpis.length > 0 && (
            <div style={{ display: 'flex', gap: 10 }}>
              {kpis.slice(0, 2).map((k, i) => (
                <div key={i} style={{ flex: 1, border: '1px solid #E2E7F0', borderRadius: 12, padding: '11px 12px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6E7A96' }}>{k.label}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4, color: statColor(String(k.value)), fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
                  {k.sub && <div style={{ fontSize: 10, fontWeight: 600, color: '#6E7A96', marginTop: 2 }}>{k.sub}</div>}
                </div>
              ))}
            </div>
          )}
          {ins.what_happened && (
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#3D4A66', textWrap: 'pretty' as never }}>
              <b style={{ color: '#0f1b34', fontWeight: 700 }}>What happened:</b> <SignedText text={ins.what_happened} />
            </p>
          )}
          {ins.why_it_matters && (
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#3D4A66', textWrap: 'pretty' as never }}>
              <b style={{ color: '#0f1b34', fontWeight: 700 }}>Why it matters:</b> <SignedText text={ins.why_it_matters} />
            </p>
          )}
          {ins.recommended_action && (
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#1E3A70', textWrap: 'pretty' as never }}>
              <b style={{ fontWeight: 700 }}>Suggested review:</b> <SignedText text={ins.recommended_action.replace(/\s*At stake: €[\d.,]+\.?/gi, '')} />
              {ins.by_when && <> <b style={{ fontWeight: 700 }}>By when:</b> {ins.by_when}</>}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E7F0', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#6E7A96' }}>
              Was this useful?
              {vote(1, 'Yes', '#1E5FD0')}
              {vote(-1, 'No', '#6E7A96')}
            </div>
            {watchKey && onWatch && (
              <button onClick={() => onWatch(watchKey)} title={watched ? 'Stop watching this month' : 'Watch this month'} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 999, padding: '7px 13px',
                color: '#1E5FD0', background: watched ? '#E8F0FE' : '#fff', border: '1px solid #CBDCFB',
              }}><EyeIcon on={!!watched} size={13} />{watched ? 'Watching' : 'Watch'}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AiTab({ briefing, hotelId, onFeedback, watched, onWatch }: {
  briefing: Briefing; hotelId: string; onFeedback: (r: FeedbackRequest) => void;
  watched?: Set<string>;                     // month keys on the watchlist
  onWatch?: (monthKey: string) => void;      // "Watch" on month-scoped cards
}) {
  const insights = briefing.ai_insights?.insights ?? [];
  if (!insights.length) {
    return <p style={{ textAlign: 'center', color: 'var(--n500)', padding: 24, fontSize: 13 }}>No insights for today.</p>;
  }
  return (
    <div data-share-root="FL Pulse">
      <SectionLabel icon="pulse" info="ai" title="FL Pulse">
        FL Pulse
        <span style={{
          background: '#2E7CF7', color: '#fff', fontSize: 10.5, fontWeight: 700,
          minWidth: 18, height: 18, borderRadius: 999, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', padding: '0 5px',
        }}>{insights.length}</span>
      </SectionLabel>
      {insights.map((ins, i) => {
        const cardId = ins.id || `card_${i + 1}`;
        const voted = localStorage.getItem(`fl_fb_${hotelId}_${briefing.report_date}_${cardId}`);
        const watchKey = onWatch ? monthKeyFromCardId(ins.id) : null;
        return <Card key={cardId} ins={ins} cardId={cardId} voted={voted} onFeedback={onFeedback}
          watchKey={watchKey} watched={!!(watchKey && watched?.has(watchKey))} onWatch={onWatch} />;
      })}
    </div>
  );
}
