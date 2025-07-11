import { describe, it, expect, vi, beforeEach } from "vitest";
import * as v from "valibot";
import { httpClient } from "@/client";
import { HTTP_STATUS_CODE } from "@/libs/status-codes";
import type { HttpRouteDefinition } from "@/types/http-route-definition";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Valibot Validation", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
  });

  it("should validate params with Valibot schema", async () => {
    const route = {
      path: "/users/:id",
      method: "get",
      request: {
        params: v.object({
          id: v.pipe(v.string(), v.uuid()),
        }),
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "Success" },
      },
    } as const satisfies HttpRouteDefinition;

    const client = httpClient({ getUser: route });

    // Valid UUID should work
    await expect(
      client.getUser({ params: { id: "123e4567-e89b-12d3-a456-426614174000" } })
    ).resolves.toBeDefined();

    // Invalid UUID should throw
    await expect(
      client.getUser({ params: { id: "invalid-uuid" } })
    ).rejects.toThrow();
  });

  it("should validate query with Valibot schema", async () => {
    const route = {
      path: "/users",
      method: "get",
      request: {
        query: v.object({
          page: v.pipe(v.number(), v.minValue(1)),
          limit: v.pipe(v.number(), v.minValue(1), v.maxValue(100)),
          active: v.optional(v.boolean()),
        }),
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "Success" },
      },
    } as const satisfies HttpRouteDefinition;

    const client = httpClient({ getUsers: route });

    // Valid query should work
    await expect(
      client.getUsers({ query: { page: 1, limit: 10, active: true } })
    ).resolves.toBeDefined();

    // Invalid page should throw
    await expect(
      client.getUsers({ query: { page: 0, limit: 10 } })
    ).rejects.toThrow();
  });

  it("should validate body with Valibot schema", async () => {
    const route = {
      path: "/users",
      method: "post",
      request: {
        body: v.object({
          name: v.pipe(v.string(), v.minLength(1)),
          email: v.pipe(v.string(), v.email()),
          age: v.pipe(v.number(), v.minValue(0), v.maxValue(150)),
        }),
      },
      responses: {
        [HTTP_STATUS_CODE.CREATED]: { description: "Created" },
      },
    } as const satisfies HttpRouteDefinition;

    const client = httpClient({ createUser: route });

    // Valid body should work
    await expect(
      client.createUser({
        body: { name: "John Doe", email: "john@example.com", age: 30 }
      })
    ).resolves.toBeDefined();

    // Invalid email should throw
    await expect(
      client.createUser({
        body: { name: "John", email: "invalid-email", age: 30 }
      })
    ).rejects.toThrow();
  });
});