/** Smart Summary — the navy hero card. Collapsed: verdict headline +
 *  Performance / Pickup / On the Books sections; expanded: the full hero
 *  paragraph. Sections are computed FROM DATA (render-from-data — the split
 *  no longer happens server-side). */
import { useMemo, useState } from 'react';
import type { Briefing } from '../types';
import { euro, kilo, signedPct, varPct } from '../api';
import { InfoButton } from './Info';

function speak(text: string, btn: HTMLButtonElement) {
  const s = window.speechSynthesis;
  if (!s) return;
  if (s.speaking) { s.cancel(); btn.textContent = '🔊'; return; }
  const go = () => {
    const vs = s.getVoices();
    const fem = /samantha|karen|moira|tessa|martha|serena|victoria|zira|aria|jenny|susan|catherine|nicky|female|woman/i;
    let pick = vs.find(v => v.lang?.startsWith('en') && fem.test(v.name))
      ?? vs.find(v => /google us english|google uk english female/i.test(v.name))
      ?? vs.find(v => v.lang?.startsWith('en'));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 1.0; u.pitch = 1.05;
    if (pick) u.voice = pick;
    u.onend = () => { btn.textContent = '🔊'; };
    u.onerror = () => { btn.textContent = '🔊'; };
    btn.textContent = '⏹';
    s.speak(u);
  };
  if (s.getVoices().length) go();
  else {
    s.onvoiceschanged = () => { s.onvoiceschanged = null; go(); };
    setTimeout(() => { if (btn.textContent !== '⏹') go(); }, 300);
  }
}

/* bold €/%/numbers on the navy surface, mirroring highlight_dark */
function Rich({ text }: { text: string }) {
  const parts = text.split(/([+\-−]?€?\d(?:[\d.,]*\d)?(?:[KkMm]\b)?%?)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^[+\-−]?€?\d/.test(p)
          ? <strong key={i} style={{
              color: p.startsWith('-') || p.startsWith('−') ? '#FFB4A3'
                : p.startsWith('+') ? '#56FFC4' : '#fff',
              fontWeight: 800,
            }}>{p}</strong>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}

function splitHero(text: string): { headline: string | null } {
  const parts = text.trim().split(/(?<=[.!?;»])\s+/).filter(Boolean);
  if (parts.length && parts[0].length <= 40 && /^[«"']?(good morning|καλημ)/i.test(parts[0])) {
    parts.shift();
  }
  return { headline: parts.length >= 2 ? parts[0] : null };
}

function Section(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,.12)' }}>
      <div style={{
        fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase',
        color: 'var(--cyan)', fontWeight: 600, marginBottom: 4,
      }}>{props.label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,.78)', fontWeight: 600 }}>
        {props.children}
      </div>
    </div>
  );
}

const B = (p: { children: React.ReactNode }) =>
  <b style={{ color: '#fff', fontWeight: 800 }}>{p.children}</b>;

export function SmartSummary({ briefing }: { briefing: Briefing }) {
  const [open, setOpen] = useState(false);
  const d = briefing.data;
  const hero = briefing.ai_insights?.executive_summary ?? '';
  const { headline } = useMemo(() => splitHero(hero), [hero]);

  const ydRev = varPct(d.yesterday.revenue, d.yesterday.revenueLY);
  const mtdRev = varPct(d.mtd.revenue, d.mtd.revenueLY);
  const fyRev = d.pace.reduce((s, p) => s + p.rev, 0);
  const fyStly = d.pace.reduce((s, p) => s + p.rev_stly, 0);
  const fyVar = fyStly ? ((fyRev - fyStly) / fyStly) * 100 : 0;

  return (
    <div style={{
      borderRadius: 'var(--r-card)', padding: 20, marginBottom: 14, color: '#fff',
      background:
        'radial-gradient(90% 100% at 92% 0%, rgba(56,225,240,.4) 0%, rgba(46,124,247,.16) 40%, rgba(10,31,77,0) 70%),' +
        'linear-gradient(160deg, #0F2860, #0A1F4D)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10,
          letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--cyan)', fontWeight: 600,
        }}>
          <span style={{ width: 5, height: 5, background: 'var(--cyan)', borderRadius: '50%' }} />
          Smart Summary
          <InfoButton k="hero" dark />
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 600, letterSpacing: '.04em' }}>
            Last refresh {(() => { const dt = new Date(briefing.data.report_date + 'T00:00:00Z'); return `${String(dt.getUTCDate()).padStart(2, '0')} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dt.getUTCMonth()]}`; })()} · {d.generated_at}
          </span>
          <button title="Listen to the briefing" onClick={e => speak(hero, e.currentTarget)} style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 999, width: 32, height: 32, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>🔊</button>
        </span>
      </div>

      {!open && headline ? (
        <>
          <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-.02em', marginBottom: 12 }}>
            <Rich text={headline} />
          </div>
          <Section label="Performance">
            Yesterday <B>{euro(d.yesterday.revenue)}</B> · <B>{signedPct(ydRev, 0)}</B> vs LY
            &ensp;·&ensp;MTD <B>{kilo(d.mtd.revenue)}</B> · <B>{signedPct(mtdRev, 0)}</B>
          </Section>
          <Section label="Pickup">
            <B>+{d.pickup.last7d.roomNights}</B> rn booked · 7 days
            &ensp;·&ensp;<B>−{d.pickup.cancellations7d}</B> cancelled
          </Section>
          <Section label="On the Books">
            Full year <B>€{(fyRev / 1e6).toFixed(2)}M</B> vs <B>€{(fyStly / 1e6).toFixed(2)}M</B> STLY
            · <B>{signedPct(fyVar, 0)}</B>
          </Section>
          <button onClick={() => setOpen(true)} style={{
            border: 'none', background: 'none', color: 'var(--cyan)',
            fontSize: 13.5, fontWeight: 700, marginTop: 3, padding: 0,
          }}>Read the full briefing →</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'rgba(255,255,255,.85)' }}>
            <Rich text={hero} />
          </div>
          {headline && (
            <button onClick={() => setOpen(false)} style={{
              border: 'none', background: 'none', color: 'var(--cyan)',
              fontSize: 13.5, fontWeight: 700, marginTop: 8, padding: 0,
            }}>Show less ↑</button>
          )}
        </>
      )}
    </div>
  );
}
