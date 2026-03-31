"use client";

import { useRealtimeStore } from "@/stores/realtime-store";
import { Badge } from "@/components/ui/badge";

export function LiveActivityFeed() {
  const clockEvents = useRealtimeStore((s) => s.recentClockEvents);
  const connected = useRealtimeStore((s) => s.connected);

  if (clockEvents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {connected ? "Waiting for activity..." : "Connecting..."}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {clockEvents.map((event, idx) => (
        <div
          key={`${event.userId}-${event.time}-${idx}`}
          className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
        >
          <div className="flex items-center gap-2">
            <Badge
              variant={event.type === "CLOCK_IN" ? "default" : "secondary"}
              className="text-[10px]"
            >
              {event.type === "CLOCK_IN" ? "IN" : "OUT"}
            </Badge>
            <span className="font-medium">{event.userName}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(event.time).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}
