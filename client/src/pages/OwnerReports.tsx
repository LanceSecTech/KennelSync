import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, todayString } from "@/lib/dateUtils";
import { CalendarDays, DollarSign, ShieldAlert, ClipboardList, FileBarChart } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type OwnerReportSummary = inferRouterOutputs<AppRouter>["report"]["ownerSummary"];

/**
 * Report types shown in the Reports page dropdown.
 *
 * To add a report:
 * 1. Add an entry here (unique `id`, `label`, `description`, `icon`).
 * 2. Implement the body in `SelectedReportPanel` (same file) using `data` from `report.ownerSummary`.
 * 3. If the new report needs extra query params, extend the tRPC input and server handler.
 */
export const OWNER_REPORT_TYPE_OPTIONS = [
  {
    id: "end_of_day",
    label: "End of day",
    description: "Today’s check-ins, check-outs, cancellations, and add-on task progress.",
    icon: ClipboardList,
  },
  {
    id: "financial",
    label: "Financial & usage",
    description: "Revenue trends, occupancy, booking status mix, and unpaid balances.",
    icon: DollarSign,
  },
  {
    id: "vaccines",
    label: "Vaccine compliance",
    description: "Missing, expired, and soon-to-expire required vaccines for guest dogs.",
    icon: ShieldAlert,
  },
  {
    id: "birthdays",
    label: "Upcoming birthdays",
    description: "Dogs with birthdays in the selected date range.",
    icon: CalendarDays,
  },
] as const;

export type OwnerReportTypeId = (typeof OWNER_REPORT_TYPE_OPTIONS)[number]["id"];

function optionMeta(id: OwnerReportTypeId) {
  return OWNER_REPORT_TYPE_OPTIONS.find((o) => o.id === id)!;
}

export default function OwnerReports() {
  const { activeKennelId } = useKennel();
  const { data: myKennels } = trpc.kennel.myKennels.useQuery();
  const kennelId = activeKennelId ?? myKennels?.[0]?.id ?? null;

  const [startDate, setStartDate] = useState(() => todayString());
  const [endDate, setEndDate] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() + 30);
    return t.toISOString().split("T")[0];
  });
  const [windowDays, setWindowDays] = useState("30");
  const [reportType, setReportType] = useState<OwnerReportTypeId>("end_of_day");

  const { data, isLoading, isFetching } = trpc.report.ownerSummary.useQuery(
    { kennelId: kennelId!, startDate, endDate, vaccineWindowDays: parseInt(windowDays, 10) || 30 },
    { enabled: !!kennelId },
  );

  const statusRows = useMemo(() => {
    if (!data?.operations?.statusCounts) return [];
    return Object.entries(data.operations.statusCounts).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const meta = optionMeta(reportType);
  const Icon = meta.icon;

  return (
    <div className="p-4 pb-10 max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Choose a date range and report type. Only one report is shown at a time.
        </p>
      </div>

      <Card className="border border-border/60 shadow-sm bg-white">
        <CardHeader className="pb-4 space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-primary shrink-0" />
            Report filters
          </CardTitle>
          <CardDescription>Select the period and which report to run.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="report-date-from" className="text-xs font-medium text-foreground">
                Date from
              </Label>
              <Input
                id="report-date-from"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-date-to" className="text-xs font-medium text-foreground">
                Date to
              </Label>
              <Input
                id="report-date-to"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="report-type" className="text-xs font-medium text-foreground">
                Report type
              </Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as OwnerReportTypeId)}>
                <SelectTrigger id="report-type" className="w-full bg-background" size="default">
                  <SelectValue placeholder="Choose a report" />
                </SelectTrigger>
                <SelectContent>
                  {OWNER_REPORT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {reportType === "vaccines" && (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-3 space-y-2">
              <Label htmlFor="vaccine-window" className="text-xs font-medium text-foreground">
                Vaccine “soon” window (days)
              </Label>
              <Input
                id="vaccine-window"
                className="max-w-[12rem] bg-background"
                value={windowDays}
                onChange={(e) => setWindowDays(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Used only for this report: how far ahead to flag vaccines that will expire soon.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!kennelId ? (
        <Card className="border border-border/60 shadow-sm bg-white">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Select or create a kennel to view reports.
          </CardContent>
        </Card>
      ) : isLoading && !data ? (
        <Card className="border border-border/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8 space-y-4">
            <div className="h-6 bg-muted rounded-md w-48 animate-pulse" />
            <div className="h-4 bg-muted rounded w-full max-w-md animate-pulse" />
            <div className="h-40 bg-muted/60 rounded-xl animate-pulse" />
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/60 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-lg font-semibold leading-tight">{meta.label}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm leading-relaxed">
                    {meta.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Date range
                </p>
                <p className="text-sm text-foreground tabular-nums">
                  {formatDate(startDate)} — {formatDate(endDate)}
                </p>
                {isFetching ? (
                  <span className="text-[11px] text-muted-foreground animate-pulse">Updating…</span>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <SelectedReportPanel
              reportType={reportType}
              data={data}
              statusRows={statusRows}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SelectedReportPanel({
  reportType,
  data,
  statusRows,
}: {
  reportType: OwnerReportTypeId;
  data: OwnerReportSummary | undefined;
  statusRows: [string, unknown][];
}) {
  switch (reportType) {
    case "birthdays":
      return <BirthdaysReportBody data={data} />;
    case "vaccines":
      return <VaccinesReportBody data={data} />;
    case "end_of_day":
      return <EndOfDayReportBody data={data} />;
    case "financial":
      return <FinancialReportBody data={data} statusRows={statusRows} />;
    default: {
      const _exhaustive: never = reportType;
      return _exhaustive;
    }
  }
}

function BirthdaysReportBody({ data }: { data: OwnerReportSummary | undefined }) {
  const list = data?.birthdays?.upcoming ?? [];
  if (!list.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No birthdays in this range. Try widening the date window.
      </p>
    );
  }
  return (
    <ul className="space-y-2 max-h-[min(28rem,70vh)] overflow-y-auto pr-1">
      {list.map((d: { dogId: number; dogName: string; nextBirthday: string }) => (
        <li
          key={d.dogId}
          className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm"
        >
          <span className="font-medium text-foreground">{d.dogName}</span>
          <span className="text-muted-foreground tabular-nums shrink-0">{formatDate(d.nextBirthday)}</span>
        </li>
      ))}
    </ul>
  );
}

function VaccinesReportBody({ data }: { data: OwnerReportSummary | undefined }) {
  const missing = data?.vaccinations?.missing ?? [];
  const expired = data?.vaccinations?.expired ?? [];
  const soon = data?.vaccinations?.soon ?? [];
  const combined = [...missing, ...expired, ...soon];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant="destructive" className="font-normal">
          Expired: {expired.length}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          Missing: {missing.length}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          Soon: {soon.length}
        </Badge>
      </div>
      {!combined.length ? (
        <p className="text-sm text-muted-foreground">No vaccine issues in the current lists for this kennel.</p>
      ) : (
        <ul className="space-y-2 max-h-[min(28rem,70vh)] overflow-y-auto pr-1">
          {combined.map(
            (
              v: {
                dogId: number;
                dogName: string;
                vaccineName: string;
                status?: string;
                expirationDate?: string | null;
              },
              i: number,
            ) => (
              <li
                key={`${v.dogId}-${v.vaccineName}-${i}`}
                className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm space-y-0.5"
              >
                <div className="font-medium text-foreground">
                  {v.dogName}
                  <span className="font-normal text-muted-foreground"> · {v.vaccineName}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {v.status === "missing" ? "Missing required record" : formatDate(v.expirationDate)}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function EndOfDayReportBody({ data }: { data: OwnerReportSummary | undefined }) {
  const addOns = data?.endOfDay?.addOnTaskSummary || {};
  const entries = Object.entries(addOns);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatBlock label="Checked in today" value={data?.endOfDay?.checkedInToday ?? 0} />
        <StatBlock label="Checked out today" value={data?.endOfDay?.checkedOutToday ?? 0} />
        <StatBlock label="Canceled / denied today" value={data?.endOfDay?.cancelledOrDeniedToday ?? 0} />
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Add-on tasks
        </h4>
        {!entries.length ? (
          <p className="text-sm text-muted-foreground">No add-on task summary for this period.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map(([name, row]) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm"
              >
                <span>{name}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {(row as { completed: number; scheduled: number }).completed}/
                  {(row as { completed: number; scheduled: number }).scheduled} done
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FinancialReportBody({
  data,
  statusRows,
}: {
  data: OwnerReportSummary | undefined;
  statusRows: [string, unknown][];
}) {
  const unpaid = data?.financials?.unpaidBalances ?? [];
  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Revenue (approximate)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatBlock label="Daily" value={`$${(data?.financials?.dailyRevenue || 0).toFixed(0)}`} />
          <StatBlock label="Weekly" value={`$${(data?.financials?.weeklyRevenue || 0).toFixed(0)}`} />
          <StatBlock label="Monthly" value={`$${(data?.financials?.monthlyRevenue || 0).toFixed(0)}`} />
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Occupancy
        </h4>
        <p className="text-sm text-foreground">
          <span className="font-semibold tabular-nums">{data?.operations?.occupancy?.occupied ?? 0}</span>
          <span className="text-muted-foreground"> / </span>
          <span className="tabular-nums">{data?.operations?.occupancy?.capacity ?? 0}</span>
          <span className="text-muted-foreground"> spots in use</span>
        </p>
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Bookings by status
        </h4>
        {!statusRows.length ? (
          <p className="text-sm text-muted-foreground">No status breakdown available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {statusRows.map(([k, v]) => (
              <Badge key={k} variant="outline" className="font-normal text-xs py-1 px-2.5">
                {k}: {String(v)}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Unpaid balances
        </h4>
        {!unpaid.length ? (
          <p className="text-sm text-muted-foreground">No unpaid balances in the sample shown.</p>
        ) : (
          <ul className="space-y-2 max-h-[min(20rem,50vh)] overflow-y-auto pr-1">
            {unpaid.map((u: { bookingId: number; dogName: string; amount: unknown }) => (
              <li
                key={u.bookingId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm"
              >
                <span className="font-medium">{u.dogName}</span>
                <span className="tabular-nums font-semibold">${Number(u.amount || 0).toFixed(0)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/15 px-4 py-4 text-center">
      <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}
