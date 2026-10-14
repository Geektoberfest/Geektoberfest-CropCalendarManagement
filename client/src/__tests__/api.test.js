import { describe, it, expect, vi, beforeEach } from "vitest";

describe("API Base URL configuration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should not double-append /api when VITE_API_URL includes /api", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:5000/api");
    const { default: api } = await import("../services/api");
    expect(api.defaults.baseURL).toBe("http://localhost:5000/api");
  });

  it("should handle trailing slashes in VITE_API_URL properly", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:5000/api/");
    const { default: api } = await import("../services/api");
    expect(api.defaults.baseURL).toBe("http://localhost:5000/api");
  });

  it("should append /api when VITE_API_URL is host only", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:5000");
    const { default: api } = await import("../services/api");
    expect(api.defaults.baseURL).toBe("http://localhost:5000/api");
  });
});
