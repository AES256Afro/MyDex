"use client";

import { useRealtime } from "@/hooks/use-realtime";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useEffect } from "react";
import { toast } from "sonner";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtime();

  const recentAlerts = useRealtimeStore((s) => s.recentAlerts);

  // Show toast for security alerts
  useEffect(() => {
    if (recentAlerts.length > 0) {
      const latest = recentAlerts[0];
      toast.error(latest.title, {
        description: latest.description || `Severity: ${latest.severity}`,
        duration: 8000,
      });
    }
  }, [recentAlerts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
