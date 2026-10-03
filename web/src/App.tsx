import { useState } from "react";
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
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="locks" className="gap-1.5">
              <Lock className="w-4 h-4" />
              Lockboxes
            </TabsTrigger>
            <TabsTrigger value="gateways" className="gap-1.5">
              <Network className="w-4 h-4" />
              Gateways
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locks" className="space-y-6 mt-4">
            <LockHistorySection lockSelect={lockSelect} />
            <AllLockboxesSection
              onLockSelect={handleLockSelect}
              selectedLockId={lockSelect?.id ?? null}
            />
          </TabsContent>

          <TabsContent value="gateways" className="mt-4">
            <GatewaysSection onOpenLock={handleOpenLock} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
