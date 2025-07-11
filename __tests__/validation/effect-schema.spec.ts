import { describe, it, expect, vi, beforeEach } from "vitest";
import { Schema as S, ParseResult } from "effect";
import { httpClient } from "@/client";
import { HTTP_STATUS_CODE } from "@/libs/status-codes";
import type { HttpRouteDefinition } from "@/types/http-route-definition";

// Adapter to make Effect Schema compatible with SchemaValidator interface
const createEffectSchemaAdapter = <T>(schema: S.Schema<T, any, never>) => ({
  parse: (input: unknown): T => {
    try {
      return S.decodeUnknownSync(schema)(input);
    } catch (error) {
      throw new Error("Validation failed");
    }
  }
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Effect Schema Validation", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
  });

  it("should validate params with Effect Schema", async () => {
    const route = {
      path: "/users/:id",
      method: "get",
      request: {
        params: createEffectSchemaAdapter(S.Struct({
          id: S.String.pipe(S.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)),
        })),
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

  it("should validate query with Effect Schema", async () => {
    const route = {
      path: "/users",
      method: "get",
      request: {
        query: createEffectSchemaAdapter(S.Struct({
          page: S.Number.pipe(S.greaterThanOrEqualTo(1)),
          limit: S.Number.pipe(S.between(1, 100)),
          active: S.optional(S.Boolean),
        })),
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

  it("should validate body with Effect Schema", async () => {
    const route = {
      path: "/users",
      method: "post",
      request: {
        body: createEffectSchemaAdapter(S.Struct({
          name: S.String.pipe(S.minLength(1)),
          email: S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
          age: S.Number.pipe(S.between(0, 150)),
        })),
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