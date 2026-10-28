import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppHeader } from "@/components/layout/AppHeader";
import { LockHistorySection } from "@/components/LockHistorySection";
import { AllLockboxesSection } from "@/components/AllLockboxesSection";
import { GatewaysSection } from "@/components/GatewaysSection";
import { Lock, Network } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface LockSelect {
  id: number;
  n: number;
}

export default function App() {
  useTheme(); // Initialize and listen to system/stored theme
  const [lockSelect, setLockSelect] = useState<LockSelect | null>(null);
  const [tab, setTab] = useState("locks");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }
      // Press "/" to focus search
      if (e.key === "/" || (e.ctrlKey && e.key === "k")) {
        e.preventDefault();
        const searchInput = document.getElementById("lock-search") as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleLockSelect(lockId: number) {
    setLockSelect((s) => ({ id: lockId, n: (s?.n ?? 0) + 1 }));
    document.getElementById("lock-search")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleOpenLock(lockId: number) {
    setLockSelect((s) => ({ id: lockId, n: (s?.n ?? 0) + 1 }));
    setTab("locks");
    setTimeout(() => {
      document.getElementById("lock-search")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />
      <main className="max-w-6xl w-full mx-auto px-6 py-6 space-y-6 flex-1">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList className="h-9 p-1 bg-muted border border-border rounded-md">
              <TabsTrigger value="locks" className="gap-1.5 text-xs px-3 py-1 font-medium">
                <Lock className="w-3.5 h-3.5" />
                <span>Lockboxes</span>
              </TabsTrigger>
              <TabsTrigger value="gateways" className="gap-1.5 text-xs px-3 py-1 font-medium">
                <Network className="w-3.5 h-3.5" />
                <span>Gateways</span>
              </TabsTrigger>
            </TabsList>

            <span className="text-xs text-muted-foreground hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-foreground font-medium text-xs">/</kbd> to search
            </span>
          </div>

          <TabsContent value="locks" className="space-y-6 mt-4">
            <div className="relative z-20">
              <LockHistorySection lockSelect={lockSelect} />
            </div>
            <div className="relative z-10">
              <AllLockboxesSection
                onLockSelect={handleLockSelect}
                selectedLockId={lockSelect?.id ?? null}
              />
            </div>
          </TabsContent>

          <TabsContent value="gateways" className="mt-4">
            <GatewaysSection onOpenLock={handleOpenLock} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
