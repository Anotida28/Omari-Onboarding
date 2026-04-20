import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { apiRequest, ApiRequestError } from "./api";

const mockFetch = () => global.fetch as unknown as any;

describe("apiRequest", () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn() as any;
  });

  it("surfaces backend message and fields on failure", async () => {
    mockFetch().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: "ValidationError",
        message: "Validation failed",
        fields: { reason: "Required" },
      }),
    });

    await expect(apiRequest("/api/adjustments", { method: "POST" })).rejects.toMatchObject({
      name: "ApiRequestError",
      message: "Validation failed",
      status: 400,
      code: "ValidationError",
      fields: { reason: "Required" },
    } as Partial<ApiRequestError>);
  });

  it("falls back to status text when response body is not JSON", async () => {
    mockFetch().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => {
        throw new Error("invalid json");
      },
    });

    await expect(apiRequest("/api/reports/dashboard")).rejects.toMatchObject({
      name: "ApiRequestError",
      message: "Service Unavailable",
      status: 503,
    } as Partial<ApiRequestError>);
  });
});
