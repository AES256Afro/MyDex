import { vi } from "vitest";

export function mockFetchResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function setupFetchMock() {
  const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse(200, {}));
  global.fetch = fetchMock;
  return fetchMock;
}

export function resetFetchMock() {
  if (vi.isMockFunction(global.fetch)) {
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  }
}
