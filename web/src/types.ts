/** Briefing payload contract (subset of HotelDataSnapshot the UI reads).
 *  Mirrors GET /briefing/latest from the FirstLight API (Phase A). */

export interface DayBlock {
  revenue: number;
  revenueLY: number;
  roomNights: number;
  roomNightsLY: number;
  adr: number;
  adrLY: number;
  occupancy: number;      // 0..1
  occupancyLY: number;
}

export interface MtdBlock extends DayBlock {
  month_name: string;
}

export interface PaceMonth {
  month: string;          // "Aug"
  month_num: number;
  rn: number;
  rn_stly: number;
  rn_final_ly: number;
  rev: number;
  rev_stly: number;
  rev_final: number;
  adr: number;
  adr_stly: number;
  adr_final_ly: number;
  occ: number;            // 0..1
  stly: number;
  final: number;
  status: 'ahead' | 'behind' | 'on_track';
}

export interface PickupWindow { revenue: number; roomNights: number; }

export interface PickupBlock {
  today: PickupWindow;
  last1d: PickupWindow;
  last3d: PickupWindow;
  last7d: PickupWindow;
  date1d: string;
  date3d: string;
  date7d: string;
  cancellationsToday: number;
  cancellations1d: number;
  cancellations3d: number;
  cancellations7d: number;
  cancellationRevenueToday: number;
  cancellationRevenue: number;
  cancellationRevenue3d: number;
  cancellationRevenue7d: number;
}

export interface Insight {
  id?: string;
  tag?: 'ALERT' | 'OPPORTUNITY' | 'MONITOR';
  type?: string;
  headline?: string;
  title?: string;
  what_happened?: string;
  why_it_matters?: string;
  recommended_action?: string;
  by_when?: string;
  at_stake?: { value: string };
  evidence?: { label: string; value: string; sub?: string }[];
  kpis?: { label: string; value: string; sub?: string; direction?: string }[];
}

/* Signal-query rows (fail-open on the backend — always optional here) */
export interface PickupDailyRow { ref_date: string; stay_year: number; stay_month: number; net_rn: number; net_rev?: number }
export interface CancelDailyRow { ref_date: string; stay_year: number; stay_month: number; cancel_rn: number; cancel_rev?: number }
export interface OtbDateRow { stay_date: string; rn_ty: number; rev_ty: number; rn_stly: number; rev_stly: number }

export interface BriefingData {
  hotel_name: string;
  report_date: string;
  generated_at: string;   // "HH:MM" Athens
  total_rooms: number;
  yesterday: DayBlock;
  mtd: MtdBlock;
  pace: PaceMonth[];
  pace_current: PaceMonth[];
  pickup: PickupBlock;
  topChannels?: { name: string; rev: number; rev_stly: number; pct: number; var: number | null; trend: string }[];
  pickup_daily?: PickupDailyRow[];   // Q9  — net rooms by booking date × stay month
  cancel_daily?: CancelDailyRow[];   // Q14 — cancellations by booking date × stay month
  otb_by_date?: OtbDateRow[];        // Q10 — rooms on the books per stay date, next 90 d
}

export interface Briefing {
  report_date: string;
  generated_at: string;   // ISO
  data: BriefingData;
  ai_insights: { executive_summary?: string; insights?: Insight[] };
  kpi_summary?: unknown;
}
