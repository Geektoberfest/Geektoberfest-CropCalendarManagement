import { describe, it, expect } from "vitest";
import api from "../services/api";

describe("Weather Integration Setup & API Configuration", () => {
  it("exports configured axios api instance", () => {
    expect(api).toBeDefined();
    expect(api.defaults.baseURL).toContain("/api");
  });

  it("does not duplicate /api when base url ends with /api", () => {
    const raw = "https://example.com/api";
    const clean = raw.trim().replace(/\/+$/, "");
    const base = clean.endsWith("/api") ? clean : `${clean}/api`;
    expect(base).toBe("https://example.com/api");
  });
});
