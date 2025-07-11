import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { httpClient } from "@/client";
import { HTTP_STATUS_CODE } from "@/libs/status-codes";
import type { HttpRouteDefinition } from "@/types/http-route-definition";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Validation", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));
  });

  describe("request validation", () => {
    it("should validate params with Zod schema", async () => {
      const route = {
        path: "/users/:id",
        method: "get",
        request: {
          params: z.object({
            id: z.string().uuid(),
          }),
        },
        responses: {
          [HTTP_STATUS_CODE.OK]: { description: "User found" },
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

    it("should validate query parameters", async () => {
      const route = {
        path: "/users",
        method: "get",
        request: {
          query: z.object({
            page: z.number().min(1),
            limit: z.number().min(1).max(100),
            active: z.boolean().optional(),
          }),
        },
        responses: {
          [HTTP_STATUS_CODE.OK]: { description: "Users found" },
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

      // Invalid limit should throw
      await expect(
        client.getUsers({ query: { page: 1, limit: 101 } })
      ).rejects.toThrow();
    });

    it("should validate request body", async () => {
      const route = {
        path: "/users",
        method: "post",
        request: {
          body: z.object({
            name: z.string().min(1),
            email: z.string().email(),
            age: z.number().min(0).max(150),
          }),
        },
        responses: {
          [HTTP_STATUS_CODE.CREATED]: { description: "User created" },
        },
      } as const satisfies HttpRouteDefinition;

      const client = httpClient({ createUser: route });

      // Valid body should work
      await expect(
        client.createUser({
          body: { name: "John Doe", email: "john@example.com", age: 30 }
        })
      ).resolves.toBeDefined();

      // Empty name should throw
      await expect(
        client.createUser({
          body: { name: "", email: "john@example.com", age: 30 }
        })
      ).rejects.toThrow();

      // Invalid email should throw
      await expect(
        client.createUser({
          body: { name: "John", email: "invalid-email", age: 30 }
        })
      ).rejects.toThrow();

      // Invalid age should throw
      await expect(
        client.createUser({
          body: { name: "John", email: "john@example.com", age: -1 }
        })
      ).rejects.toThrow();
    });

    it("should validate headers", async () => {
      const route = {
        path: "/users",
        method: "get",
        request: {
          headers: z.object({
            "x-api-key": z.string().min(1),
            "x-version": z.string().optional(),
          }),
        },
        responses: {
          [HTTP_STATUS_CODE.OK]: { description: "Users found" },
        },
      } as const satisfies HttpRouteDefinition;

      const client = httpClient({ getUsers: route });

      // Valid headers should work
      await expect(
        client.getUsers({
          headers: { "x-api-key": "valid-key", "x-version": "1.0" }
        })
      ).resolves.toBeDefined();

      // Missing required header should throw
      await expect(
        // @ts-expect-error Testing runtime validation with intentionally invalid types
        client.getUsers({ headers: { "x-version": "1.0" } })
      ).rejects.toThrow();

      // Empty API key should throw
      await expect(
        client.getUsers({ headers: { "x-api-key": "" } })
      ).rejects.toThrow();
    });
  });

  describe("response validation", () => {
    it("should handle response validation (warning on failure)", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      
      const route = {
        path: "/users/:id",
        method: "get",
        responses: {
          [HTTP_STATUS_CODE.OK]: {
            description: "User found",
            schema: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string().email(),
            }),
          },
        },
      } as const satisfies HttpRouteDefinition;

      // Mock response with invalid email
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: "123", name: "John", email: "invalid-email" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = httpClient({ getUser: route });
      
      // Should not throw, but should warn
      const response = await client.getUser();
      expect(response).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith("Response validation failed:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    it("should handle valid response validation", async () => {
      const route = {
        path: "/users/:id",
        method: "get",
        responses: {
          [HTTP_STATUS_CODE.OK]: {
            description: "User found",
            schema: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string().email(),
            }),
          },
        },
      } as const satisfies HttpRouteDefinition;

      // Mock response with valid data
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: "123", name: "John", email: "john@example.com" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = httpClient({ getUser: route });
      
      const response = await client.getUser();
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });
  });

  describe("different schema types", () => {
    it("should work with custom validation functions", async () => {
      const customValidator = (input: unknown) => {
        if (typeof input !== "string" || input.length < 3) {
          throw new Error("String must be at least 3 characters");
        }
        return input;
      };

      const route = {
        path: "/test",
        method: "post",
        request: {
          body: customValidator,
        },
        responses: {
          [HTTP_STATUS_CODE.OK]: { description: "Success" },
        },
      } as const satisfies HttpRouteDefinition;

      const client = httpClient({ test: route });

      // Valid input should work
      await expect(client.test({ body: "valid input" })).resolves.toBeDefined();

      // Invalid input should throw
      await expect(client.test({ body: "ab" })).rejects.toThrow();
    });

    it("should work with null validation (skip validation)", async () => {
      const route = {
        path: "/test",
        method: "post",
        request: {
          body: null,
        },
        responses: {
          [HTTP_STATUS_CODE.OK]: { description: "Success" },
        },
      } as const satisfies HttpRouteDefinition;

      const client = httpClient({ test: route });

      // Any input should work
      await expect(client.test({ body: "anything" })).resolves.toBeDefined();
      await expect(client.test({ body: 123 })).resolves.toBeDefined();
      await expect(client.test({ body: { any: "object" } })).resolves.toBeDefined();
    });
  });
});