import { NextRequest } from "next/server";

export function createRequest(
  method: string,
  url: string,
  options?: { body?: unknown; headers?: Record<string, string> }
): NextRequest {
  const fullUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  };
  if (options?.body && method !== "GET") {
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(fullUrl, init as Parameters<typeof NextRequest>[1]);
}
