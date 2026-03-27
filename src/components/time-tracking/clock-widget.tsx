"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square } from "lucide-react";

interface ActiveEntry {
  id: string;
  clockIn: string;
  status: string;
}

interface ClockWidgetProps {
  initialActiveEntry: ActiveEntry | null;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function ClockWidget({ initialActiveEntry }: ClockWidgetProps) {
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(
    initialActiveEntry
  );
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);

  // Calculate elapsed time from active entry
  useEffect(() => {
    if (!activeEntry) {
      setElapsed(0);
      return;
    }

    const clockInTime = new Date(activeEntry.clockIn).getTime();

    function updateElapsed() {
      const now = Date.now();
      setElapsed(Math.floor((now - clockInTime) / 1000));
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const handleClockToggle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/time-entries/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Clock error:", error);
        return;
      }

      const data = await res.json();
      const entry = data.timeEntry;

      if (entry.clockOut) {
        // Clocked out
        setActiveEntry(null);
      } else {
        // Clocked in
        setActiveEntry({
          id: entry.id,
          clockIn: entry.clockIn,
          status: entry.status,
        });
      }
    } catch (err) {
      console.error("Clock toggle failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const isClockedIn = activeEntry !== null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Clock
          </span>
          <Badge variant={isClockedIn ? "success" : "secondary"}>
            {isClockedIn ? "Clocked In" : "Clocked Out"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div
            className={`text-4xl font-mono font-bold tabular-nums ${
              isClockedIn ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            }`}
          >
            {formatElapsed(elapsed)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isClockedIn ? "Current session" : "Ready to start"}
          </p>
        </div>

        <button
          onClick={handleClockToggle}
          disabled={loading}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium shadow transition-colors disabled:opacity-50 disabled:pointer-events-none ${
            isClockedIn
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {loading ? (
            <span className="animate-pulse">Processing...</span>
          ) : isClockedIn ? (
            <>
              <Square className="h-4 w-4" />
              Clock Out
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Clock In
            </>
          )}
        </button>
      </CardContent>
    </Card>
  );
}
