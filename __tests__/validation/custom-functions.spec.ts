import { describe, it, expect, vi, beforeEach } from "vitest";
import { httpClient } from "@/client";
import { HTTP_STATUS_CODE } from "@/libs/status-codes";
import type { HttpRouteDefinition } from "@/types/http-route-definition";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Custom Function Validation", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
  });

  it("should validate params with custom function", async () => {
    const route: HttpRouteDefinition = {
      path: "/users/:id",
      method: "get",
      request: {
        params: (input: unknown) => {
          if (typeof input !== "string" || !input.startsWith("user_")) {
            throw new Error("User ID must be a string starting with 'user_'");
          }
          return input;
        },
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "Success" },
      },
    };

    const client = httpClient({ getUser: route });

    // Valid user ID should work
    await expect(
      client.getUser({ params: "user_123" })
    ).resolves.toBeDefined();

    // Invalid user ID should throw
    await expect(
      client.getUser({ params: "invalid_123" })
    ).rejects.toThrow("User ID must be a string starting with 'user_'");
  });

  it("should validate query with custom function", async () => {
    const route: HttpRouteDefinition = {
      path: "/search",
      method: "get",
      request: {
        query: (input: unknown) => {
          if (typeof input !== "object" || input === null) {
            throw new Error("Query must be an object");
          }
          
          const query = input as Record<string, unknown>;
          
          if (typeof query.q !== "string" || query.q.length < 3) {
            throw new Error("Search query must be at least 3 characters");
          }
          
          if (query.limit !== undefined && (typeof query.limit !== "number" || query.limit < 1 || query.limit > 100)) {
            throw new Error("Limit must be between 1 and 100");
          }
          
          return query as { q: string; limit?: number };
        },
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "Success" },
      },
    };

    const client = httpClient({ search: route });

    // Valid query should work
    await expect(
      client.search({ query: { q: "hello world", limit: 10 } })
    ).resolves.toBeDefined();

    // Invalid query (too short) should throw
    await expect(
      client.search({ query: { q: "hi", limit: 10 } })
    ).rejects.toThrow("Search query must be at least 3 characters");
  });

  it("should validate body with custom function", async () => {
    const route: HttpRouteDefinition = {
      path: "/users",
      method: "post",
      request: {
        body: (input: unknown) => {
          if (typeof input !== "object" || input === null) {
            throw new Error("Body must be an object");
          }
          
          const user = input as Record<string, unknown>;
          
          if (typeof user.name !== "string" || user.name.trim().length === 0) {
            throw new Error("Name is required and must be a non-empty string");
          }
          
          if (typeof user.email !== "string" || !user.email.includes("@")) {
            throw new Error("Valid email is required");
          }
          
          if (user.age !== undefined && (typeof user.age !== "number" || user.age < 0 || user.age > 150)) {
            throw new Error("Age must be between 0 and 150");
          }
          
          return user as { name: string; email: string; age?: number };
        },
      },
      responses: {
        [HTTP_STATUS_CODE.CREATED]: { description: "Created" },
      },
    };

    const client = httpClient({ createUser: route });

    // Valid body should work
    await expect(
      client.createUser({
        body: { name: "John Doe", email: "john@example.com", age: 30 }
      })
    ).resolves.toBeDefined();

    // Invalid body (missing @) should throw
    await expect(
      client.createUser({
        body: { name: "John", email: "invalid-email", age: 30 }
      })
    ).rejects.toThrow("Valid email is required");
  });
});