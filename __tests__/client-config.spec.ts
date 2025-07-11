import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { httpClient } from "@/client";
import { HTTP_STATUS_CODE } from "@/libs/status-codes";
import type { HttpRouteDefinition } from "@/types/http-route-definition";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("HTTP Client Config Options", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  const testRoute = {
    path: "/test",
    method: "get",
    responses: {
      [HTTP_STATUS_CODE.OK]: {
        description: "Test response",
        schema: z.object({
          message: z.string(),
        }),
      },
    },
  } as const satisfies HttpRouteDefinition;

  it("should accept baseUrl, headers, and fetch as config options", async () => {
    const customFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = httpClient(
      { test: testRoute },
      {
        baseUrl: "https://custom.example.com",
        headers: {
          "X-API-Key": "test-key",
          "X-Custom-Header": "custom-value",
        },
        fetch: customFetch,
      }
    );

    await client.test();

    expect(customFetch).toHaveBeenCalledWith(
      "https://custom.example.com/test",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      })
    );

    const calledHeaders = customFetch.mock.calls[0][1].headers;
    expect(calledHeaders.get("X-API-Key")).toBe("test-key");
    expect(calledHeaders.get("X-Custom-Header")).toBe("custom-value");
  });

  it("should support headers as a function", async () => {
    const customFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const headersFn = vi.fn().mockReturnValue({
      "X-Dynamic-Header": "dynamic-value",
    });

    const client = httpClient(
      { test: testRoute },
      {
        baseUrl: "https://api.example.com",
        headers: headersFn,
        fetch: customFetch,
      }
    );

    await client.test();

    expect(headersFn).toHaveBeenCalled();
    
    const calledHeaders = customFetch.mock.calls[0][1].headers;
    expect(calledHeaders.get("X-Dynamic-Header")).toBe("dynamic-value");
  });

  it("should support headers as an async function", async () => {
    const customFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const asyncHeadersFn = vi.fn().mockResolvedValue({
      "X-Async-Header": "async-value",
      "Authorization": "Bearer async-token",
    });

    const client = httpClient(
      { test: testRoute },
      {
        baseUrl: "https://api.example.com",
        headers: asyncHeadersFn,
        fetch: customFetch,
      }
    );

    await client.test();

    expect(asyncHeadersFn).toHaveBeenCalled();
    
    const calledHeaders = customFetch.mock.calls[0][1].headers;
    expect(calledHeaders.get("X-Async-Header")).toBe("async-value");
    expect(calledHeaders.get("Authorization")).toBe("Bearer async-token");
  });

  it("should support additional fetch configuration options", async () => {
    const customFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = httpClient(
      { test: testRoute },
      {
        baseUrl: "https://api.example.com",
        headers: {
          "X-API-Key": "test-key",
        },
        fetch: customFetch,
        mode: "cors",
        credentials: "include",
        cache: "no-cache",
      }
    );

    await client.test();

    expect(customFetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
        mode: "cors",
        credentials: "include",
        cache: "no-cache",
      })
    );
  });

  it("should work with just baseUrl", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = httpClient(
      { test: testRoute },
      {
        baseUrl: "https://api.example.com",
      }
    );

    await client.test();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.objectContaining({
        method: "GET",
      })
    );
  });

  it("should handle POST request with custom headers and fetch", async () => {
    const postRoute = {
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
            id: z.number(),
            name: z.string(),
            email: z.string(),
          }),
        },
      },
    } as const satisfies HttpRouteDefinition;

    const customFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, name: "John Doe", email: "john@example.com" }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const client = httpClient(
      { createUser: postRoute },
      {
        baseUrl: "https://api.example.com",
        headers: {
          "Authorization": "Bearer token123",
          "X-API-Version": "v2",
        },
        fetch: customFetch,
      }
    );

    await client.createUser({
      body: { name: "John Doe", email: "john@example.com" },
    });

    expect(customFetch).toHaveBeenCalledWith(
      "https://api.example.com/users",
      expect.objectContaining({
        method: "POST",
        headers: expect.any(Headers),
        body: JSON.stringify({ name: "John Doe", email: "john@example.com" }),
      })
    );

    const calledHeaders = customFetch.mock.calls[0][1].headers;
    expect(calledHeaders.get("Authorization")).toBe("Bearer token123");
    expect(calledHeaders.get("X-API-Version")).toBe("v2");
    expect(calledHeaders.get("Content-Type")).toBe("application/json");
  });
});