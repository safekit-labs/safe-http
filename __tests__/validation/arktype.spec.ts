import { describe, it, expect, vi, beforeEach } from "vitest";
import { type } from "arktype";
import { httpClient } from "@/client";
import { HTTP_STATUS_CODE } from "@/libs/status-codes";
import type { HttpRouteDefinition } from "@/types/http-route-definition";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ArkType Validation", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
  });

  it("should validate params with ArkType schema", async () => {
    const route: HttpRouteDefinition = {
      path: "/users/:id",
      method: "get",
      request: {
        params: type({
          id: "string.uuid",
        }),
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "Success" },
      },
    };

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

  it("should validate query with ArkType schema", async () => {
    const route: HttpRouteDefinition = {
      path: "/users",
      method: "get",
      request: {
        query: type({
          page: "number>=1",
          limit: "number>0",
          "active?": "boolean",
        }),
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "Success" },
      },
    };

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

  it("should validate body with ArkType schema", async () => {
    const route: HttpRouteDefinition = {
      path: "/users",
      method: "post",
      request: {
        body: type({
          name: "string>=1",
          email: "string.email",
          age: "number>=0",
        }),
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

    // Invalid email should throw
    await expect(
      client.createUser({
        body: { name: "John", email: "invalid-email", age: 30 }
      })
    ).rejects.toThrow();
  });
});