"use client";

import { format } from "date-fns";

export function LocalTime({ date, fmt }: { date: string; fmt: string }) {
  return <>{format(new Date(date), fmt)}</>;
}
