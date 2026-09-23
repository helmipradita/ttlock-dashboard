import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppHeader } from "@/components/layout/AppHeader";
import { LockHistorySection } from "@/components/LockHistorySection";
import { AllLockboxesSection } from "@/components/AllLockboxesSection";
import { GatewaysSection } from "@/components/GatewaysSection";
import { TopologyOverlay } from "@/components/TopologyOverlay";

interface TopologyTarget {
  id: number;
  name: string;
  lockNum: number;
}

export default function App() {
  const [topologyTarget, setTopologyTarget] = useState<TopologyTarget | null>(null);

  function handleLockSelect(lockId: number) {
    document.getElementById("lock-search")?.scrollIntoView({ behavior: "smooth" });
    void lockId;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <Tabs defaultValue="locks">
          <TabsList>
            <TabsTrigger value="locks">Lockboxes</TabsTrigger>
            <TabsTrigger value="gateways">Gateways</TabsTrigger>
          </TabsList>

          <TabsContent value="locks" className="space-y-6 mt-4">
            <LockHistorySection />
            <AllLockboxesSection onLockSelect={handleLockSelect} />
          </TabsContent>

          <TabsContent value="gateways" className="mt-4">
            <GatewaysSection
              onOpenTopology={(id, name, lockNum) =>
                setTopologyTarget({ id, name, lockNum })
              }
            />
          </TabsContent>
        </Tabs>
      </main>

      {topologyTarget && (
        <TopologyOverlay
          gatewayId={topologyTarget.id}
          gatewayName={topologyTarget.name}
          lockNum={topologyTarget.lockNum}
          open
          onClose={() => setTopologyTarget(null)}
        />
      )}
    </div>
  );
}
