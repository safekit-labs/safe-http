import { describe, it, expect, vi, beforeEach } from "vitest";
import { httpClient } from "@/client";
import { HTTP_STATUS_CODE } from "@/libs/status-codes";
import type { HttpRouteDefinition } from "@/types/http-route-definition";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Null Validation (Skip Validation)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
  });

  it("should skip params validation with null", async () => {
    const route = {
      path: "/users/:id",
      method: "get",
      request: {
        params: null,
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "Success" },
      },
    } as const satisfies HttpRouteDefinition;

    const client = httpClient({ getUser: route });

    // Any params should work (no validation)
    await expect(
      client.getUser({ params: "anything" })
    ).resolves.toBeDefined();

    await expect(
      client.getUser({ params: { any: "object" } })
    ).resolves.toBeDefined();

    await expect(
      client.getUser({ params: 123 })
    ).resolves.toBeDefined();
  });

  it("should skip query validation with null", async () => {
    const route = {
      path: "/search",
      method: "get",
      request: {
        query: null,
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "Success" },
      },
    } as const satisfies HttpRouteDefinition;

    const client = httpClient({ search: route });

    // Any query should work (no validation)
    await expect(
      client.search({ query: "string query" })
    ).resolves.toBeDefined();

    await expect(
      client.search({ query: { complex: { nested: "object" } } })
    ).resolves.toBeDefined();
  });

  it("should skip body validation with null", async () => {
    const route = {
      path: "/data",
      method: "post",
      request: {
        body: null,
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "Success" },
      },
    } as const satisfies HttpRouteDefinition;

    const client = httpClient({ postData: route });

    // Any body should work (no validation)
    await expect(
      client.postData({ body: "raw string" })
    ).resolves.toBeDefined();

    await expect(
      client.postData({ body: { invalid: { data: "structure" } } })
    ).resolves.toBeDefined();

    await expect(
      client.postData({ body: [1, 2, 3, "mixed", { array: true }] })
    ).resolves.toBeDefined();
  });
});