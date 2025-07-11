import { HTTP_STATUS_CODE } from "@/index";
import { HttpRouteDefinition } from "@/types/http-route-definition";
import { z } from "zod";

// Theoretical
import { httpClient } from "@/index";

const tags = ["api-key"];

// ========================================================================
// SCHEMAS
// ========================================================================

export const apiErrorResponseSchema = z.object({
  errorCode: z.string(),
  message: z.string(),
  timestamp: z.string(),
  translatedMessage: z.string(),
  traceId: z.string().optional(),
});

// ========================================================================
// ROUTE DEFINITION
// ========================================================================

// ------------------ CREATE ------------------

export const createApiKeyHttpRoute: HttpRouteDefinition = {
  path: "/organizations/:organizationId/api-keys",
  method: "post",
  tags,
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
} as const;

// ------------------ GET API KEY ------------------

export const getApiKeyHttpRoute: HttpRouteDefinition = {
  path: "/organizations/:organizationId/api-keys/:apiKeyId",
  method: "get",
  tags,
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
} as const;

// ------------------ STORAGE ROUTES ------------------

export const uploadFileHttpRoute: HttpRouteDefinition = {
  path: "/storage/files",
  method: "post",
  tags: ["storage"],
  operationId: "uploadFile",
  summary: "Upload File",
  description: "Uploads a file to storage",
  request: {
    body: z.object({
      file: z.any().describe("File to upload"),
      metadata: z
        .object({
          name: z.string(),
          contentType: z.string(),
        })
        .optional(),
    }),
  },
  responses: {
    [HTTP_STATUS_CODE.CREATED]: {
      description: "File uploaded successfully",
      schema: z.object({
        data: z.object({
          fileId: z.string(),
          url: z.string(),
          size: z.number(),
        }),
      }),
    },
  },
} as const;

export const getFileHttpRoute: HttpRouteDefinition = {
  path: "/storage/files/:fileId",
  method: "get",
  tags: ["storage"],
  operationId: "getFile",
  summary: "Get File",
  description: "Retrieves file metadata and download URL",
  request: {
    params: z.object({
      fileId: z.string().describe("File ID"),
    }),
    query: z.object({
      download: z.boolean().optional().describe("Generate download URL"),
    }),
  },
  responses: {
    [HTTP_STATUS_CODE.OK]: {
      description: "File retrieved successfully",
      schema: z.object({
        data: z.object({
          fileId: z.string(),
          name: z.string(),
          contentType: z.string(),
          size: z.number(),
          downloadUrl: z.string().optional(),
        }),
      }),
    },
  },
} as const;

// ========================================================================
// ROUTE MAPS
// ========================================================================

export const apiKeyRoutesMap = {
  create: createApiKeyHttpRoute,
  get: getApiKeyHttpRoute,
} as const;

export const storageRoutesMap = {
  upload: uploadFileHttpRoute,
  getFile: getFileHttpRoute,
} as const;

// ========================================================================
// IMPLEMENTATION EXAMPLES
// ========================================================================

// ------------------ FLAT (NON-NESTED) IMPLEMENTATION ------------------

const flatSdk = httpClient({
  createApiKey: createApiKeyHttpRoute,
  getApiKey: getApiKeyHttpRoute,
  uploadFile: uploadFileHttpRoute,
  getFile: getFileHttpRoute,
});

export async function flatExample() {
  await flatSdk.createApiKey({
    params: { organizationId: "123" },
    body: { userId: "123" },
  });

  await flatSdk.getApiKey({
    params: { organizationId: "123", apiKeyId: "api-key-456" },
    query: { includePermissions: true },
  });

  await flatSdk.uploadFile({
    body: {
      file: new File([], "document.pdf"),
      metadata: { name: "document.pdf", contentType: "application/pdf" },
    },
  });

  await flatSdk.getFile({
    params: { fileId: "file-789" },
    query: { download: true },
  });
}

// ------------------ NESTED IMPLEMENTATION ------------------

const nestedSdk = httpClient({
  apiKey: apiKeyRoutesMap,
  storage: storageRoutesMap,
});

export async function nestedExample() {
  await nestedSdk.apiKey.create({
    params: { organizationId: "123" },
    body: { userId: "123" },
  });

  await nestedSdk.apiKey.get({
    params: { organizationId: "123", apiKeyId: "api-key-456" },
    query: { includePermissions: true },
  });

  await nestedSdk.storage.upload({
    body: {
      file: new File([], "document.pdf"),
      metadata: { name: "document.pdf", contentType: "application/pdf" },
    },
  });

  await nestedSdk.storage.getFile({
    params: { fileId: "file-789" },
    query: { download: true },
  });
}
