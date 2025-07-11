import { describe, it, expect, vi, beforeEach } from "vitest";
import * as s from "superstruct";
import { httpClient } from "@/client";
import { HTTP_STATUS_CODE } from "@/libs/status-codes";
import type { HttpRouteDefinition } from "@/types/http-route-definition";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Custom UUID validator for Superstruct
const uuid = () => s.define<string>("uuid", (value) => {
  if (typeof value !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
});

// Custom email validator for Superstruct
const email = () => s.define<string>("email", (value) => {
  if (typeof value !== "string") return false;
  return value.includes("@") && value.includes(".");
});

describe("Superstruct Validation", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
  });

  it("should validate params with Superstruct schema", async () => {
    const route = {
      path: "/users/:id",
      method: "get",
      request: {
        params: s.object({
          id: uuid(),
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

  it("should validate query with Superstruct schema", async () => {
    const route = {
      path: "/users",
      method: "get",
      request: {
        query: s.object({
          page: s.min(s.number(), 1),
          limit: s.size(s.number(), 1, 100),
          active: s.optional(s.boolean()),
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

  it("should validate body with Superstruct schema", async () => {
    const route = {
      path: "/users",
      method: "post",
      request: {
        body: s.object({
          name: s.size(s.string(), 1, Infinity),
          email: email(),
          age: s.size(s.number(), 0, 150),
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