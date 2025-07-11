import { describe, it, expect, vi, beforeEach } from "vitest";
import { HTTP_STATUS_CODE, httpClient } from "@/index";
import type { HttpRouteDefinition } from "@/types/http-route-definition";
import { z } from "zod";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Specification Example", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));
  });

  describe("route definitions", () => {
    const apiErrorResponseSchema = z.object({
      errorCode: z.string(),
      message: z.string(),
      timestamp: z.string(),
      translatedMessage: z.string(),
      traceId: z.string().optional(),
    });

    const createApiKeyHttpRoute = {
      path: "/organizations/:organizationId/api-keys",
      method: "post",
      tags: ["api-key"],
      operationId: "createApiKey",
      summary: "Create API Key",
      description:
        "Creates a new API key for the organization with specified permissions and expiration.",
      request: {
        params: z.object({
          organizationId: z.string().describe("Organization ID"),
        }),
        body: z.object({
          userId: z.string().describe("User ID"),
          displayName: z.string().describe("Display Name"),
          description: z.string().describe("Description"),
          environment: z.string().describe("Environment"),
          expiresAt: z.string().describe("Expires At"),
          grantedPermissions: z.array(z.string()).describe("Granted Permissions"),
          roleIds: z.array(z.string()).describe("Role IDs"),
        }),
      },
      responses: {
        [HTTP_STATUS_CODE.CREATED]: {
          description: "API key created successfully",
          schema: z.object({
            data: z.object({
              apiKey: z.string().describe("API key"),
            }),
          }),
        },
        [HTTP_STATUS_CODE.BAD_REQUEST]: {
          description: "Invalid request parameters",
          schema: apiErrorResponseSchema,
        },
        [HTTP_STATUS_CODE.UNAUTHORIZED]: {
          description: "User not authenticated",
          schema: apiErrorResponseSchema,
        },
      },
    } as const satisfies HttpRouteDefinition;

    const getApiKeyHttpRoute = {
      path: "/organizations/:organizationId/api-keys/:apiKeyId",
      method: "get",
      tags: ["api-key"],
      operationId: "getApiKey",
      summary: "Get API Key",
      description: "Retrieves an API key by ID with optional filtering.",
      request: {
        params: z.object({
          organizationId: z.string().describe("Organization ID"),
          apiKeyId: z.string().describe("API Key ID"),
        }),
        query: z.object({
          includePermissions: z.boolean().optional().describe("Include permissions in response"),
          includeUsage: z.boolean().optional().describe("Include usage statistics"),
        }),
      },
      responses: {
        [HTTP_STATUS_CODE.OK]: {
          description: "API key retrieved successfully",
          schema: z.object({
            data: z.object({
              id: z.string(),
              displayName: z.string(),
              description: z.string(),
              environment: z.string(),
              expiresAt: z.string(),
              createdAt: z.string(),
              lastUsedAt: z.string().optional(),
            }),
          }),
        },
        [HTTP_STATUS_CODE.NOT_FOUND]: {
          description: "API key not found",
          schema: apiErrorResponseSchema,
        },
        [HTTP_STATUS_CODE.UNAUTHORIZED]: {
          description: "User not authenticated",
          schema: apiErrorResponseSchema,
        },
      },
    } as const satisfies HttpRouteDefinition;

    it("should work with flat SDK implementation", async () => {
      const flatSdk = httpClient({
        createApiKey: createApiKeyHttpRoute,
        getApiKey: getApiKeyHttpRoute,
      });

      // This should be properly typed
      await flatSdk.createApiKey({
        params: { organizationId: "123" },
        body: { 
          userId: "123", 
          displayName: "Test Key",
          description: "Test Description",
          environment: "test",
          expiresAt: "2024-12-31",
          grantedPermissions: ["read"],
          roleIds: ["role1"]
        },
      });

      await flatSdk.getApiKey({
        params: { organizationId: "123", apiKeyId: "api-key-456" },
        query: { includePermissions: true },
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should work with nested SDK implementation", async () => {
      const apiKeyRoutesMap = {
        create: createApiKeyHttpRoute,
        get: getApiKeyHttpRoute,
      } as const;

      const nestedSdk = httpClient({
        apiKey: apiKeyRoutesMap,
      });

      // This should be properly typed with nested access
      await nestedSdk.apiKey.create({
        params: { organizationId: "123" },
        body: { 
          userId: "123",
          displayName: "Test Key",
          description: "Test Description", 
          environment: "test",
          expiresAt: "2024-12-31",
          grantedPermissions: ["read"],
          roleIds: ["role1"]
        },
      });

      await nestedSdk.apiKey.get({
        params: { organizationId: "123", apiKeyId: "api-key-456" },
        query: { includePermissions: true },
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should enforce type safety", () => {
      const flatSdk = httpClient({
        createApiKey: createApiKeyHttpRoute,
        getApiKey: getApiKeyHttpRoute,
      });

      // TypeScript should enforce these types at compile time
      expect(typeof flatSdk.createApiKey).toBe("function");
      expect(typeof flatSdk.getApiKey).toBe("function");
    });
  });
});