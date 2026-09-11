/** Superadmin portal shell — firstlight.hbis.io/superadmin-control
 *  (approved plan docs/ADMIN_PLAN.md, 2026-09-11). Left-nav layout with all
 *  Phase-1 sections; sections marked "soon" are stubs that fill in build
 *  order (audit log + users after C3, then hotels, overview, health, …).
 *  Gate v1 = founder emails client-side + every API call authorized
 *  server-side; becomes users.is_platform_admin + TOTP under C3. */
import { useEffect, useState } from 'react';
import { sessionEmail } from '../api';
import { ClientsView } from '../components/AdminPortal';
import { HotelsView, HealthView, FeedbackView, AuditView } from './sections';
import { Boundary } from './kit';

const ADMIN_EMAILS = ['dk@bi-automations.com', 'd.karypidis@hbis.io'];

type Section =
  | 'Overview' | 'Hotels' | 'Onboarding' | 'Clients' | 'Users' | 'Health'
  | 'Feedback' | 'Notifications' | 'Kill switches' | 'Audit log' | 'Security';

const SECTIONS: { name: Section; ready: boolean; soon: string }[] = [
  { name: 'Overview', ready: true, soon: '' },
  { name: 'Hotels', ready: true, soon: '' },
  { name: 'Onboarding', ready: false, soon: 'New-hotel wizard, connector instructions, dry run — portal step 8' },
  { name: 'Clients', ready: true, soon: '' },
  { name: 'Users', ready: false, soon: 'Create with temporary password, reset, lock, sessions, impersonation — arrives with the own-login system (C3)' },
  { name: 'Health', ready: true, soon: '' },
  { name: 'Feedback', ready: true, soon: '' },
  { name: 'Notifications', ready: false, soon: 'Per-hotel schedules, delivery stats, test push — portal step 11' },
  { name: 'Kill switches', ready: false, soon: 'AI narration / push / logins / pipeline, each with reason + audit — portal step 7' },
  { name: 'Audit log', ready: true, soon: '' },
  { name: 'Security', ready: false, soon: 'Active sessions with revoke, failed logins by user/IP — portal step 12' },
];

function Overview() {
  const [health, setHealth] = useState<{ status?: string; build?: string; stale_hotels?: string[] } | null>(null);
  useEffect(() => {
    fetch('https://web-cloudflare.up.railway.app/health')
      .then(r => r.json()).then(setHealth).catch(() => setHealth(null));
  }, []);
  const stale = health?.stale_hotels ?? [];
  const ok = health?.status === 'ok' && stale.length === 0;
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, background: '#fff',
        borderRadius: 16, padding: '18px 20px', marginBottom: 14, boxShadow: '0 1px 3px rgba(10,20,45,.07)',
      }}>
        <span style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: health == null ? '#F1F3F8' : ok ? '#E7F5EC' : '#FDEFEA',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>{health == null ? '…' : ok ? '✓' : '!'}</span>
        <span>
          <div style={{ fontSize: 16.5, fontWeight: 800, color: '#0F2860', letterSpacing: '-.01em' }}>
            {health == null ? 'Checking the platform…'
              : ok ? 'Nothing wrong today'
              : stale.length ? `${stale.length} hotel${stale.length > 1 ? 's' : ''} with stale data`
              : 'Service degraded'}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6E7A96' }}>
            {health ? <>backend {health.build} · live check just now</> : 'API unreachable'}
          </div>
        </span>
      </div>
      {stale.length > 0 && (
        <div style={{ background: '#FDEFEA', border: '1px solid #F5CFC7', color: '#B0433A', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
          Stale: {stale.join(', ')} — check Data health / trigger a refresh from Hotels (coming) or the app.
        </div>
      )}
      <ClientsView />
    </div>
  );
}

export default function PortalShell() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [sec, setSec] = useState<Section>('Overview');
  useEffect(() => { void sessionEmail().then(e => setEmail(e)); }, []);

  if (email === undefined) return null;
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return (
      <div style={{ minHeight: '100vh', background: '#EAEDF1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '26px 28px', maxWidth: 360, textAlign: 'center', boxShadow: '0 8px 30px rgba(10,20,45,.1)' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0F2860', marginBottom: 8 }}>FirstLight</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#5A6780', lineHeight: 1.55 }}>
            {email ? 'This area is not available for your account.'
              : <>Sign in first in the app, then return here.<br /><a href="/" style={{ color: '#2E7CF7', fontWeight: 700 }}>Open FirstLight →</a></>}
          </div>
        </div>
      </div>
    );
  }

  const active = SECTIONS.find(s => s.name === sec)!;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#EAEDF1' }}>
      <nav style={{
        width: 220, flexShrink: 0, background: 'linear-gradient(180deg,#0F2860,#0A1F4D)',
        padding: '18px 12px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 16px' }}>
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
            <path d="M18 38 38 28 54 33 74 16" stroke="#2E7CF7" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="74" cy="16" r="5" fill="#38E1F0" />
            <rect x="18" y="50" width="8" height="36" rx="4" fill="#fff" /><rect x="18" y="50" width="26" height="8" rx="4" fill="#fff" /><rect x="18" y="64" width="19" height="8" rx="4" fill="#fff" />
            <rect x="62" y="50" width="8" height="36" rx="4" fill="#fff" /><rect x="62" y="78" width="24" height="8" rx="4" fill="#fff" />
          </svg>
          <span style={{ font: "700 15px 'Outfit', 'Manrope', sans-serif", color: '#fff', letterSpacing: '-.02em' }}>
            First<span style={{ color: '#38E1F0' }}>Light</span>
          </span>
        </div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(56,225,240,.8)', padding: '0 8px 8px', textTransform: 'uppercase' }}>Superadmin</div>
        {SECTIONS.map(s => (
          <button key={s.name} onClick={() => setSec(s.name)} style={{
            display: 'flex', alignItems: 'center', width: '100%', gap: 8, textAlign: 'left',
            border: 'none', borderRadius: 10, padding: '9px 10px', marginBottom: 2, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: sec === s.name ? 800 : 600,
            background: sec === s.name ? 'rgba(255,255,255,.12)' : 'transparent',
            color: sec === s.name ? '#fff' : 'rgba(255,255,255,.72)',
          }}>
            {s.name}
            {!s.ready && <span style={{
              marginLeft: 'auto', fontSize: 8.5, fontWeight: 800, letterSpacing: '.06em',
              color: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.25)',
              borderRadius: 6, padding: '1px 5px',
            }}>SOON</span>}
          </button>
        ))}
        <a href="/" style={{
          display: 'block', margin: '16px 8px 0', fontSize: 11.5, fontWeight: 700,
          color: 'rgba(255,255,255,.6)', textDecoration: 'none',
        }}>← Back to the app</a>
      </nav>
      <main style={{ flex: 1, minWidth: 0, padding: '22px 26px 60px', maxWidth: 1560 }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#0F2860', letterSpacing: '-.02em', marginBottom: 14 }}>{sec}</div>
        <Boundary key={sec}>
          {sec === 'Overview' && <Overview />}
          {sec === 'Clients' && <ClientsView />}
          {sec === 'Hotels' && <HotelsView />}
          {sec === 'Health' && <HealthView />}
          {sec === 'Feedback' && <FeedbackView />}
          {sec === 'Audit log' && <AuditView />}
        </Boundary>
        {!active.ready && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '22px 22px', maxWidth: 560, boxShadow: '0 1px 3px rgba(10,20,45,.07)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F2860', marginBottom: 6 }}>Being built</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#5A6780', lineHeight: 1.6 }}>{active.soon}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9AA4B8', marginTop: 10 }}>
              Build order and dates: docs/ADMIN_PLAN.md — Phase 1 completes early October.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
