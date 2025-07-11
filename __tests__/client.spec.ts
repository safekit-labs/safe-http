import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { httpClient } from "@/client";
import { HTTP_STATUS_CODE } from "@/libs/status-codes";
import type { HttpRouteDefinition } from "@/types/http-route-definition";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("HTTP Client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("basic functionality", () => {
    const simpleRoute = {
      path: "/users/:id",
      method: "get",
      request: {
        params: z.object({
          id: z.string(),
        }),
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: {
          description: "User found",
          schema: z.object({
            id: z.string(),
            name: z.string(),
          }),
        },
      },
    } as const satisfies HttpRouteDefinition;

    it("should create a client with a single route", () => {
      const client = httpClient({ getUser: simpleRoute });
      expect(typeof client.getUser).toBe("function");
    });

    it("should make a GET request with params", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: "123", name: "John" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = httpClient({ getUser: simpleRoute }, { baseUrl: "https://api.example.com" });
      
      await client.getUser({ params: { id: "123" } });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users/123",
        expect.objectContaining({
          method: "GET",
          headers: expect.any(Headers),
        })
      );
    });

    it("should handle query parameters", async () => {
      const routeWithQuery = {
        path: "/users",
        method: "get",
        request: {
          query: z.object({
            page: z.number().optional(),
            limit: z.number().optional(),
          }),
        },
        responses: {
          [HTTP_STATUS_CODE.OK]: {
            description: "Users list",
          },
        },
      } as const satisfies HttpRouteDefinition;

      mockFetch.mockResolvedValue(new Response("[]", { status: 200 }));

      const client = httpClient({ getUsers: routeWithQuery }, { baseUrl: "https://api.example.com" });
      
      await client.getUsers({ query: { page: 1, limit: 10 } });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users?page=1&limit=10",
        expect.any(Object)
      );
    });

    it("should handle POST requests with body", async () => {
      const createRoute = {
        path: "/users",
        method: "post",
        request: {
          body: z.object({
            name: z.string(),
            email: z.string().email(),
          }),
        },
        responses: {
          [HTTP_STATUS_CODE.CREATED]: {
            description: "User created",
            schema: z.object({
              id: z.string(),
              name: z.string(),
              email: z.string(),
            }),
          },
        },
      } as const satisfies HttpRouteDefinition;

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: "123", name: "John", email: "john@example.com" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = httpClient({ createUser: createRoute }, { baseUrl: "https://api.example.com" });
      
      await client.createUser({ 
        body: { name: "John", email: "john@example.com" } 
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "John", email: "john@example.com" }),
          headers: expect.any(Headers),
        })
      );
    });
  });

  describe("nested routes", () => {
    const getUserRoute = {
      path: "/users/:id",
      method: "get",
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: { description: "User found" },
      },
    } as const satisfies HttpRouteDefinition;

    const createUserRoute = {
      path: "/users",
      method: "post",
      request: {
        body: z.object({ name: z.string() }),
      },
      responses: {
        [HTTP_STATUS_CODE.CREATED]: { description: "User created" },
      },
    } as const satisfies HttpRouteDefinition;

    const userRoutes = {
      get: getUserRoute,
      create: createUserRoute,
    };

    it("should create nested client structure", () => {
      const client = httpClient({ user: userRoutes });
      
      expect(typeof client.user.get).toBe("function");
      expect(typeof client.user.create).toBe("function");
    });

    it("should make requests through nested structure", async () => {
      mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));

      const client = httpClient({ user: userRoutes }, { baseUrl: "https://api.example.com" });
      
      await client.user.get({ params: { id: "123" } });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users/123",
        expect.any(Object)
      );
    });
  });

  describe("error handling", () => {
    it("should handle validation errors", async () => {
      const route = {
        path: "/users",
        method: "post",
        request: {
          body: z.object({
            name: z.string(),
            age: z.number().min(0),
          }),
        },
        responses: {
          [HTTP_STATUS_CODE.CREATED]: { description: "User created" },
        },
      } as const satisfies HttpRouteDefinition;

      const client = httpClient({ createUser: route });

      await expect(
        client.createUser({ body: { name: "John", age: -1 } })
      ).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const route = {
        path: "/users",
        method: "get",
        responses: {
          [HTTP_STATUS_CODE.OK]: { description: "Users found" },
        },
      } as const satisfies HttpRouteDefinition;

      const client = httpClient({ getUsers: route });

      await expect(client.getUsers()).rejects.toThrow("Network error");
    });
  });
});