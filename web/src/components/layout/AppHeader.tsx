import { useQuery } from "@tanstack/react-query";
import { getAuthStatus } from "@/api/client";
import { formatDate } from "@/lib/format";

export function AppHeader() {
  const { data } = useQuery({
    queryKey: ["auth"],
    queryFn: getAuthStatus,
    refetchInterval: 60_000,
  });

  return (
    <header className="bg-gradient-to-br from-gray-900 to-gray-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <h1 className="text-lg font-semibold">TTLOCK Dashboard</h1>
      <div className="flex items-center gap-4 text-sm">
        {data?.authenticated ? (
          <>
            <span className="bg-white/15 px-3 py-1 rounded-full flex items-center gap-2">
              <span>👤</span>
              <span>{data.username}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
              <span>Active</span>
            </span>
            <span className="text-white/50 text-xs">
              Expires: {formatDate(data.expiresAt)}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]" />
            <span>Not authenticated</span>
          </span>
        )}
      </div>
    </header>
  );
}
