"use client";

import { useRealtimeStore } from "@/stores/realtime-store";

interface ActiveNowCounterProps {
  initialCount: number;
}

export function ActiveNowCounter({ initialCount }: ActiveNowCounterProps) {
  const liveCount = useRealtimeStore((s) => s.activeNowCount);
  const connected = useRealtimeStore((s) => s.connected);

  // Use live count if connected, otherwise initial server-rendered count
  const displayCount = connected && liveCount > 0 ? liveCount : initialCount;

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold">{displayCount}</span>
      {connected && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
      )}
    </div>
  );
}
