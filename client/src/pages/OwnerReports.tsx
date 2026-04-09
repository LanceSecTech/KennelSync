import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useKennel } from "@/contexts/KennelContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate, todayString } from "@/lib/dateUtils";
import { CalendarDays, DollarSign, ShieldAlert, ClipboardList } from "lucide-react";

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

  const { data, isLoading } = trpc.report.ownerSummary.useQuery(
    { kennelId: kennelId!, startDate, endDate, vaccineWindowDays: parseInt(windowDays, 10) || 30 },
    { enabled: !!kennelId },
  );

  const statusRows = useMemo(() => {
    if (!data?.operations?.statusCounts) return [];
    return Object.entries(data.operations.statusCounts).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-44" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Operational, vaccine, and financial summaries.</p>
      </div>

      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4 grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" className="mt-1" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" className="mt-1" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Vaccine soon window (days)</Label>
            <Input className="mt-1" value={windowDays} onChange={(e) => setWindowDays(e.target.value.replace(/[^0-9]/g, ""))} />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-primary" /> Birthdays
            </h3>
            {!data?.birthdays?.upcoming?.length ? (
              <p className="text-xs text-muted-foreground">No birthdays in selected range.</p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {data.birthdays.upcoming.map((d: any) => (
                  <div key={d.dogId} className="text-xs flex items-center justify-between rounded bg-muted/30 px-2 py-1.5">
                    <span className="font-medium">{d.dogName}</span>
                    <span className="text-muted-foreground">{formatDate(d.nextBirthday)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-600" /> Vaccine Reports
            </h3>
            <div className="flex gap-2 text-xs">
              <Badge variant="destructive">Expired: {data?.vaccinations?.expired?.length || 0}</Badge>
              <Badge variant="secondary">Missing: {data?.vaccinations?.missing?.length || 0}</Badge>
              <Badge variant="secondary">Soon: {data?.vaccinations?.soon?.length || 0}</Badge>
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {[
                ...(data?.vaccinations?.missing || []),
                ...(data?.vaccinations?.expired || []),
                ...(data?.vaccinations?.soon || []),
              ]
                .slice(0, 20)
                .map((v: any, i: number) => (
                  <div key={`${v.dogId}-${v.vaccineName}-${i}`} className="text-xs rounded bg-muted/30 px-2 py-1.5">
                    <span className="font-medium">{v.dogName}</span> · {v.vaccineName}
                    <span className="text-muted-foreground">
                      {" · "}
                      {v.status === "missing" ? "Missing required" : formatDate(v.expirationDate)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-primary" /> End of Day
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatCell label="In Today" value={data?.endOfDay?.checkedInToday || 0} />
              <StatCell label="Out Today" value={data?.endOfDay?.checkedOutToday || 0} />
              <StatCell label="Canceled" value={data?.endOfDay?.cancelledOrDeniedToday || 0} />
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries(data?.endOfDay?.addOnTaskSummary || {}).map(([name, row]: any) => (
                <div key={name} className="flex items-center justify-between rounded bg-muted/30 px-2 py-1.5">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{row.completed}/{row.scheduled} done</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-green-600" /> Financial & Usage
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatCell label="Daily $" value={(data?.financials?.dailyRevenue || 0).toFixed(0)} />
              <StatCell label="Weekly $" value={(data?.financials?.weeklyRevenue || 0).toFixed(0)} />
              <StatCell label="Monthly $" value={(data?.financials?.monthlyRevenue || 0).toFixed(0)} />
            </div>
            <div className="text-xs text-muted-foreground">
              Occupancy: {data?.operations?.occupancy?.occupied || 0}/{data?.operations?.occupancy?.capacity || 0}
            </div>
            <div className="flex flex-wrap gap-1">
              {statusRows.map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-[10px]">{k}: {String(v)}</Badge>
              ))}
            </div>
            {!!data?.financials?.unpaidBalances?.length && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.financials.unpaidBalances.slice(0, 10).map((u: any) => (
                  <div key={u.bookingId} className="text-xs rounded bg-muted/30 px-2 py-1.5 flex items-center justify-between">
                    <span>{u.dogName}</span>
                    <span className="font-medium">${Number(u.amount || 0).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-muted/30 p-2">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
