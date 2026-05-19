import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AlbumRow,
  AlbumStatus,
  AlbumType,
  UserRow,
} from "@/types/database";
import { ALBUM_VALUES, DIAGRAMADOR_RATE } from "@/lib/constants";
import { computePaymentCycle, toDateOnly } from "@/lib/financial";

export interface AlbumWithRelations extends AlbumRow {
  responsible_name: string | null;
  problems_count: number;
  open_problems_count: number;
}

export interface AlbumListFilters {
  q?: string;
  turma?: string;
  status?: AlbumStatus;
  type?: AlbumType;
  responsibleId?: string;
  hasProblems?: "yes" | "no";
  page?: number;
  pageSize?: number;
}

/**
 * Hydrate albums with responsible name and problem counts in a single pass,
 * leveraging RLS for row-level access. Service role is NOT used here.
 */
export async function listAlbums(filters: AlbumListFilters = {}) {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("albums")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.responsibleId)
    query = query.eq("responsible_id", filters.responsibleId);
  if (filters.turma)
    query = query.eq("class_code", filters.turma.trim());
  if (filters.q) {
    const term = `%${filters.q}%`;
    query = query.or(
      `student_name.ilike.${term},faculty.ilike.${term},student_code.ilike.${term}`,
    );
  }

  const { data: rawAlbums, count, error } = await query;
  if (error) {
    console.error("[listAlbums] error:", error);
    return { rows: [] as AlbumWithRelations[], total: 0, page, pageSize };
  }
  const albums = (rawAlbums ?? []) as AlbumRow[];
  if (albums.length === 0) {
    return { rows: [] as AlbumWithRelations[], total: count ?? 0, page, pageSize };
  }

  // Fetch users referenced
  const userIds = Array.from(new Set(albums.map((a) => a.responsible_id)));
  const { data: rawUsers } = await supabase.from("users").select("id, name").in("id", userIds);
  const users = (rawUsers ?? []) as Pick<UserRow, "id" | "name">[];
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  // Fetch problems for these albums
  const albumIds = albums.map((a) => a.id);
  const { data: rawProblems } = await supabase
    .from("album_problems")
    .select("album_id, resolved")
    .in("album_id", albumIds);
  const problems = (rawProblems ?? []) as { album_id: string; resolved: boolean }[];
  const counts = new Map<string, { total: number; open: number }>();
  for (const p of problems) {
    const c = counts.get(p.album_id) ?? { total: 0, open: 0 };
    c.total += 1;
    if (!p.resolved) c.open += 1;
    counts.set(p.album_id, c);
  }

  let rows: AlbumWithRelations[] = albums.map((a) => ({
    ...a,
    responsible_name: userMap.get(a.responsible_id) ?? null,
    problems_count: counts.get(a.id)?.total ?? 0,
    open_problems_count: counts.get(a.id)?.open ?? 0,
  }));

  // Post-filter by problems flag (kept simple at app layer to avoid complex SQL)
  if (filters.hasProblems === "yes") {
    rows = rows.filter((r) => r.problems_count > 0);
  } else if (filters.hasProblems === "no") {
    rows = rows.filter((r) => r.problems_count === 0);
  }

  return { rows, total: count ?? 0, page, pageSize };
}

export async function getAlbumById(id: string) {
  const supabase = await createClient();
  const { data: rawAlbum, error } = await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !rawAlbum) return null;
  const album = rawAlbum as AlbumRow;

  const { data: rawProblems } = await supabase
    .from("album_problems")
    .select("*")
    .eq("album_id", id)
    .order("created_at", { ascending: false });

  const { data: rawResponsible } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("id", album.responsible_id)
    .maybeSingle();

  return {
    album,
    problems: (rawProblems ?? []) as import("@/types/database").AlbumProblemRow[],
    responsible: rawResponsible as Pick<UserRow, "id" | "name" | "email"> | null,
  };
}

export async function listDiagramadores(): Promise<
  Pick<UserRow, "id" | "name" | "email" | "role" | "active">[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, name, email, role, active")
    .eq("active", true)
    .order("name");
  return (data ?? []) as Pick<UserRow, "id" | "name" | "email" | "role" | "active">[];
}

/**
 * Returns lightweight album rows for analytics. Respects RLS.
 */
export async function listAlbumsForAnalytics() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("albums")
    .select(
      "id, type, status, value, responsible_id, student_name, class_code, created_at, completed_at, payment_date, cycle_start, cycle_end",
    )
    .order("created_at", { ascending: false })
    .limit(1000);
  return (data ?? []) as Pick<AlbumRow, "id" | "type" | "status" | "value" | "responsible_id" | "student_name" | "class_code" | "created_at" | "completed_at" | "payment_date" | "cycle_start" | "cycle_end">[];
}

// ---------------------------------------------------------------------------
// Analytics aggregations
// ---------------------------------------------------------------------------

export interface PaymentAlbumItem {
  id: string;
  student_name: string;
  class_code: string | null;
  type: AlbumType;
  status: AlbumStatus;
  value: number;
  responsibleName: string;
}

export interface DashboardStats {
  totalThisWeek: number;
  totalThisMonth: number;
  totalAll: number;
  inProgress: number;
  concluded: number;
  problemRate: number; // 0..1
  byUser: { name: string; value: number }[];
  byType: { name: string; value: number }[];
  byStatus: { name: string; value: number }[];
  nextPayments: { date: string; total: number; count: number; albums: PaymentAlbumItem[] }[];
}

interface AnalyticsAlbum {
  id: string;
  type: AlbumType;
  status: AlbumStatus;
  value: number;
  responsible_id: string;
  student_name: string;
  class_code: string | null;
  created_at: string;
  completed_at: string | null;
  payment_date: string | null;
  cycle_start: string | null;
  cycle_end: string | null;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday-based week
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export async function computeDashboardStats(
  albums: AnalyticsAlbum[],
  users: Pick<UserRow, "id" | "name">[],
): Promise<DashboardStats> {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const userName = new Map(users.map((u) => [u.id, u.name]));

  let totalThisWeek = 0;
  let totalThisMonth = 0;
  let inProgress = 0;
  let concluded = 0;
  const byUser = new Map<string, number>();
  const byType = new Map<AlbumType, number>();
  const byStatus = new Map<AlbumStatus, number>();
  const nextPayments = new Map<string, { total: number; count: number; albums: PaymentAlbumItem[] }>();

  for (const a of albums) {
    const created = new Date(a.created_at);
    if (created >= weekStart) totalThisWeek++;
    if (created >= monthStart) totalThisMonth++;
    if (a.status === "concluido" || a.status === "enviado") concluded++;
    else if (a.status !== "descartado") inProgress++;

    if (a.status !== "descartado") {
      byUser.set(
        a.responsible_id,
        (byUser.get(a.responsible_id) ?? 0) + 1,
      );
      byType.set(a.type, (byType.get(a.type) ?? 0) + 1);
    }
    byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1);

    if (a.payment_date && (a.status === "enviado" || a.status === "concluido")) {
      const key = a.payment_date;
      const cur = nextPayments.get(key) ?? { total: 0, count: 0, albums: [] };
      cur.total += Number(a.value);
      cur.count += 1;
      cur.albums.push({
        id: a.id,
        student_name: a.student_name,
        class_code: a.class_code,
        type: a.type,
        status: a.status,
        value: Number(a.value),
        responsibleName: userName.get(a.responsible_id) ?? "Desconhecido",
      });
      nextPayments.set(key, cur);
    }
  }

  // Problem rate (approximation - we count distinct albums having at least 1 problem)
  // computed in the page using a separate query for accuracy
  return {
    totalThisWeek,
    totalThisMonth,
    totalAll: albums.length,
    inProgress,
    concluded,
    problemRate: 0, // filled by page
    byUser: Array.from(byUser.entries())
      .map(([id, value]) => ({ name: userName.get(id) ?? "Desconhecido", value }))
      .sort((a, b) => b.value - a.value),
    byType: Array.from(byType.entries())
      .map(([k, v]) => ({ name: k, value: v }))
      .sort((a, b) => b.value - a.value),
    byStatus: Array.from(byStatus.entries())
      .map(([k, v]) => ({ name: k, value: v })),
    nextPayments: Array.from(nextPayments.entries())
      .map(([date, info]) => ({ date, total: info.total, count: info.count, albums: info.albums }))
      .filter((p) => new Date(p.date) >= new Date(now.toDateString()))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4),
  };
}

/**
 * Aggregate revenue by user for admin financial view.
 */
export function revenueByUser(
  albums: AnalyticsAlbum[],
  users: Pick<UserRow, "id" | "name">[],
) {
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const map = new Map<string, number>();
  for (const a of albums) {
    if (a.status === "descartado") continue;
    map.set(
      a.responsible_id,
      (map.get(a.responsible_id) ?? 0) + Number(a.value),
    );
  }
  return Array.from(map.entries())
    .map(([id, value]) => ({
      name: userName.get(id) ?? "Desconhecido",
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Group totals by payment cycle.
 */
export function revenueByCycle(albums: AnalyticsAlbum[]) {
  const map = new Map<
    string,
    { paymentDate: string; total: number; count: number; label: string }
  >();
  for (const a of albums) {
    if (a.status === "descartado") continue;
    if (!a.payment_date) continue;
    const cur =
      map.get(a.payment_date) ??
      {
        paymentDate: a.payment_date,
        total: 0,
        count: 0,
        label: computePaymentCycle(new Date(a.payment_date + "T12:00:00"))
          .label,
      };
    cur.total += Number(a.value);
    cur.count += 1;
    map.set(a.payment_date, cur);
  }
  return Array.from(map.values()).sort((a, b) =>
    b.paymentDate.localeCompare(a.paymentDate),
  );
}

// ---------------------------------------------------------------------------
// Financial cycle queries
// ---------------------------------------------------------------------------

export interface CycleAlbum {
  id: string;
  student_name: string;
  class_code: string | null;
  type: AlbumType;
  value: number;
  responsible_id: string;
  payment_date: string;
  status: AlbumStatus;
}

/**
 * Fetch all albums that count toward payment (enviado or concluido).
 * Admins see all; diagramadores see only their own.
 */
export async function listSentAlbums(responsibleId?: string): Promise<CycleAlbum[]> {
  const supabase = await createClient();
  let query = supabase
    .from("albums")
    .select("id, student_name, class_code, type, value, responsible_id, payment_date, status")
    .in("status", ["enviado", "concluido"] as AlbumStatus[])
    .not("payment_date", "is", null)
    .order("payment_date", { ascending: false });
  if (responsibleId) query = query.eq("responsible_id", responsibleId);
  const { data } = await query;
  return (data ?? []) as unknown as CycleAlbum[];
}

type UserWithRate = Pick<UserRow, "id" | "name" | "role" | "commission_rate">;

function getEffectiveRate(user: UserWithRate): number {
  if (user.commission_rate !== null && user.commission_rate !== undefined) return user.commission_rate;
  return user.role === "admin" ? 1.0 : DIAGRAMADOR_RATE;
}

export interface UserEarningsSummary {
  userId: string;
  name: string;
  earnings: number;
  total: number;
  count: number;
  rate: number;
}

export function computeDiagramadorEarnings(
  albums: CycleAlbum[],
  users: UserWithRate[],
): UserEarningsSummary[] {
  // Include diagramadores + admins who have a custom commission_rate (e.g. Laura)
  const commissioned = users.filter((u) => u.role !== "admin" || u.commission_rate !== null);
  const map = new Map<string, { name: string; total: number; count: number; rate: number }>();
  for (const u of commissioned) map.set(u.id, { name: u.name, total: 0, count: 0, rate: getEffectiveRate(u) });

  for (const a of albums) {
    const entry = map.get(a.responsible_id);
    if (!entry) continue;
    entry.total += Number(a.value);
    entry.count += 1;
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.count > 0)
    .map(([uid, v]) => ({
      userId: uid,
      name: v.name,
      earnings: v.total * v.rate,
      total: v.total,
      count: v.count,
      rate: v.rate,
    }))
    .sort((a, b) => b.earnings - a.earnings);
}

export interface CycleSummary {
  paymentDate: string;
  label: string;
  total: number;
  count: number;
  byUser: { name: string; total: number; earnings: number; count: number; isAdmin: boolean; isOwner: boolean }[];
  isPast: boolean;
  albums: PaymentAlbumItem[];
}

// Compute the production cycle label from its payment date.
// Payment on day 3 of month M → produced in month M-1 Cycle A (3rd→18th)
// Payment on day 18 of month M → produced in month M-1 Cycle B (18th→3rd)
function productionLabelFromPaymentDate(paymentDateStr: string): string {
  const [year, month, day] = paymentDateStr.split("-").map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prodDay = day === 3 ? 3 : 18;
  const prodDate = new Date(
    `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(prodDay).padStart(2, "0")}T12:00:00`,
  );
  return computePaymentCycle(prodDate).label;
}

export function buildCycleSummaries(
  albums: CycleAlbum[],
  users: UserWithRate[],
  today: Date,
): CycleSummary[] {
  const userMap = new Map(users.map((u) => [u.id, u]));
  const cycleMap = new Map<
    string,
    { total: number; count: number; byUser: Map<string, { total: number; count: number }>; albums: PaymentAlbumItem[] }
  >();

  for (const a of albums) {
    if (!a.payment_date) continue;
    const key = a.payment_date;
    if (!cycleMap.has(key)) {
      cycleMap.set(key, { total: 0, count: 0, byUser: new Map(), albums: [] });
    }
    const entry = cycleMap.get(key)!;
    entry.total += Number(a.value);
    entry.count += 1;
    const uid = a.responsible_id;
    const u = entry.byUser.get(uid) ?? { total: 0, count: 0 };
    u.total += Number(a.value);
    u.count += 1;
    entry.byUser.set(uid, u);
    entry.albums.push({
      id: a.id,
      student_name: a.student_name,
      class_code: a.class_code,
      type: a.type,
      status: a.status,
      value: Number(a.value),
      responsibleName: userMap.get(uid)?.name ?? "Desconhecido",
    });
  }

  const todayStr = toDateOnly(today);

  return Array.from(cycleMap.entries())
    .map(([paymentDate, entry]) => ({
      paymentDate,
      label: productionLabelFromPaymentDate(paymentDate),
      total: entry.total,
      count: entry.count,
      albums: entry.albums,
      byUser: Array.from(entry.byUser.entries()).map(([uid, v]) => {
        const user = userMap.get(uid);
        const isAdmin = user?.role === "admin";
        const isOwner = isAdmin && !user?.commission_rate;
        const rate = user ? getEffectiveRate(user) : DIAGRAMADOR_RATE;
        return {
          name: user?.name ?? "Desconhecido",
          total: v.total,
          earnings: v.total * rate,
          count: v.count,
          isAdmin,
          isOwner,
        };
      }).sort((a, b) => b.total - a.total),
      isPast: paymentDate < todayStr,
    }))
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

/**
 * Ensure ALBUM_VALUES matches what's persisted (sanity).
 */
export function expectedValue(type: AlbumType): number {
  return ALBUM_VALUES[type];
}

/**
 * Current cycle helper for header strip.
 */
export function currentCycleInfo() {
  const now = new Date();
  const cycle = computePaymentCycle(now);
  return {
    label: cycle.label,
    paymentDate: toDateOnly(cycle.paymentDate),
  };
}
