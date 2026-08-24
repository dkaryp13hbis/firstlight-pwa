/** ⓘ explainers — canonical texts and the canon button/panel styling. */
import { useState } from 'react';

export const INFO: Record<string, string> = {
  hero: 'The analyst writes this summary once early each morning with the AI. The KPI cards below refresh during the day as the hotel system posts late charges — so their numbers can drift a few euros from the morning text. Both are correct for their moment.',
  yday: "Yesterday's final numbers against the same day last year — revenue, how full you were, at what average rate, and how many rooms. The four dials of the morning.",
  otb3: 'Revenue and rooms already booked for the next three months, compared with the same date last year (STLY). Green means ahead of last year’s pace.',
  pickup: 'The fresh demand flowing in: what was booked and cancelled today, yesterday, and over the last 3 and 7 days. Net = booked minus cancelled — what you actually kept.',
  fly: 'Rooms booked (right, blue) against rooms cancelled (left, red) for each stay month — following the pickup window you select above (Today, Yesterday, 3-Day or 7-Day). Same counting as those boxes, split by month. A long red wing means demand is leaking; the net shows what you kept.',
  vel: 'How fast each month is filling right now: rooms per day over the last 7 and 14 days, vs last year’s speed and the speed needed to reach last year’s final. Speed warns you before totals do.',
  pace: 'Each future month three ways: what’s on the books now (blue), where last year stood on this same date (grey), and where the month finally ended last year (dashed). Useful to spot months running ahead or behind before they arrive.',
  crev: 'Monthly revenue on the books (bars) vs the same time last year (grey bars). The dashed marks are where that month finally ended last year — the target to beat.',
  cocc: 'How full each month is so far (dark line) vs the same time last year (grey). Dashed = last year’s final. Months already finished show only their final result.',
  cadr: 'The average nightly rate per month vs the same time last year, with last year’s final rate as the dashed reference. Falling ADR with rising occupancy = trading rate for volume.',
  bridge: 'Splits the ADR change vs last year into two causes: MIX (selling a different blend of channels) and RATE (selling at different prices). They always add up exactly — so you know whether the conversation is pricing or strategy.',
  meter: 'Each month’s progress towards last year’s final total. The tick marks where last year stood on today’s date — ahead of the tick means ahead of your own pace. Green spill = the month already beat last year.',
  heat: 'Occupancy on the books for every one of the next 60 nights — darker is fuller. A red outline flags a date far behind last year: expected demand that hasn’t arrived.',
  sources: 'Where this year’s revenue comes from, by booking source, compared with the same time last year. Watch for a cheap channel quietly growing its share.',
  ai: 'The analyst’s ranked findings for today: what happened, why it matters, and a suggested action. Only changes that passed significance checks appear here.',
  watch: 'Months or dates you asked FirstLight to follow. Each gets a one-line update on every refresh — rooms booked vs the same time last year, what came in since yesterday, and whether the booking speed is enough to reach last year’s final — whether or not it made today’s Signals. Improving / Getting worse compares with yesterday’s briefing.',
};

export function InfoButton({ k, dark }: { k: string; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const text = INFO[k];
  if (!text) return null;
  return (
    <>
      <button title="What is this?" onClick={e => { e.stopPropagation(); setOpen(!open); }} style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginLeft: 7,
        border: dark ? '1.5px solid rgba(255,255,255,.35)' : '1.5px solid #A0AAC0',
        color: dark ? 'rgba(255,255,255,.75)' : '#6E7A96',
        background: dark ? 'transparent' : '#fff',
        fontSize: 11, fontWeight: 700, lineHeight: 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      }}>i</button>
      {open && (
        <div style={{
          background: dark ? 'rgba(255,255,255,.08)' : '#F7F9FC',
          color: dark ? 'rgba(255,255,255,.75)' : '#4D5A74',
          borderRadius: 10, padding: '10px 12px', fontSize: 11.5, lineHeight: 1.55,
          margin: '8px 0', fontWeight: 400, flexBasis: '100%', textAlign: 'left', textTransform: 'none', letterSpacing: 0,
        }}>{text}</div>
      )}
    </>
  );
}
