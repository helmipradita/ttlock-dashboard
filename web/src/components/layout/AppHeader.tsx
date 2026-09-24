import { useQuery } from "@tanstack/react-query";
import { getAuthStatus } from "@/api/client";
import { formatDate } from "@/lib/format";
import { User, Shield } from "lucide-react";
import { StatusBadge } from "@/components/status";

export function AppHeader() {
  const { data } = useQuery({
    queryKey: ["auth"],
    queryFn: getAuthStatus,
    refetchInterval: 60_000,
  });

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-4 shadow-lg border-b border-white/5">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">TTLOCK Dashboard</h1>
            <p className="text-[11px] text-white/40 leading-tight">Smart Lock Monitoring</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {data?.authenticated ? (
            <>
              <StatusBadge variant="online" label="Active" size="xs" />
              <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full text-xs">
                <User className="w-3 h-3 text-white/60" />
                <span className="text-white/80">{data.username}</span>
              </span>
              <span className="text-white/30 text-[10px]">
                Expires {formatDate(data.expiresAt)}
              </span>
            </>
          ) : (
            <StatusBadge variant="offline" label="Not authenticated" size="xs" />
          )}
        </div>
      </div>
    </header>
  );
}
