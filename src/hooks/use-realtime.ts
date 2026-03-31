"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRealtimeStore } from "@/stores/realtime-store";

export function useRealtime() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const store = useRealtimeStore;

  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/v1/events/stream");
    eventSourceRef.current = es;

    es.onopen = () => {
      store.getState().setConnected(true);
    };

    es.onerror = () => {
      store.getState().setConnected(false);
      es.close();
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    // Listen to specific event types
    es.addEventListener("CLOCK_IN", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.getState().addClockEvent({ ...data, type: "CLOCK_IN" });
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("CLOCK_OUT", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.getState().addClockEvent({ ...data, type: "CLOCK_OUT" });
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("NOTIFICATION", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.getState().addNotification(data);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("SECURITY_ALERT", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.getState().addSecurityAlert(data);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("ACTIVE_COUNT", (e) => {
      try {
        const data = JSON.parse(e.data);
        store.getState().setActiveCount(data.count);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("DEVICE_STATUS", () => {
      // Could extend store for device status if needed
    });
  }, [store]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      store.getState().setConnected(false);
    };
  }, [connect, store]);
}
