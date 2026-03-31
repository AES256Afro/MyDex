import { create } from "zustand";

interface ClockEvent {
  userId: string;
  userName: string;
  time: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
}

interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
}

interface SecurityAlert {
  id: string;
  title: string;
  severity: string;
  description?: string;
}

interface DeviceStatusEvent {
  deviceId: string;
  hostname: string;
  status: string;
  previousStatus?: string;
}

interface RealtimeState {
  connected: boolean;
  activeNowCount: number;
  recentClockEvents: ClockEvent[];
  pendingNotifications: RealtimeNotification[];
  recentAlerts: SecurityAlert[];

  setConnected: (connected: boolean) => void;
  setActiveCount: (count: number) => void;
  addClockEvent: (event: ClockEvent) => void;
  addNotification: (notification: RealtimeNotification) => void;
  clearNotification: (id: string) => void;
  addSecurityAlert: (alert: SecurityAlert) => void;
}

export type { RealtimeNotification, ClockEvent, SecurityAlert, DeviceStatusEvent };

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connected: false,
  activeNowCount: 0,
  recentClockEvents: [],
  pendingNotifications: [],
  recentAlerts: [],

  setConnected: (connected) => set({ connected }),
  setActiveCount: (count) => set({ activeNowCount: count }),
  addClockEvent: (event) =>
    set((state) => ({
      recentClockEvents: [event, ...state.recentClockEvents].slice(0, 20),
    })),
  addNotification: (notification) =>
    set((state) => ({
      pendingNotifications: [notification, ...state.pendingNotifications].slice(
        0,
        50
      ),
    })),
  clearNotification: (id) =>
    set((state) => ({
      pendingNotifications: state.pendingNotifications.filter(
        (n) => n.id !== id
      ),
    })),
  addSecurityAlert: (alert) =>
    set((state) => ({
      recentAlerts: [alert, ...state.recentAlerts].slice(0, 20),
    })),
}));
