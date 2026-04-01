import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TelegramUsersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200/90 bg-white/96 p-5 shadow-sm sm:p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search / filter bar */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
