import { z } from "zod";
import { httpClient, HttpRouteDefinition, HTTP_STATUS_CODE } from "../src";
import type { HttpClient, RouteMap, ClientConfig } from "../src";

// Example route definitions
export const getUserRoute = {
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
        email: z.string(),
      }),
    },
  },
} as const satisfies HttpRouteDefinition;

export const createUserRoute = {
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

// Route map definition
export const apiKeyRoutesMap = {
  users: {
    get: getUserRoute,
    create: createUserRoute,
  },
} as const satisfies RouteMap;

// ❌ PROBLEM: This will cause the TypeScript error you're experiencing
// The inferred return type includes complex nested types that reference internal paths
export const createApiKeySafekitSdkWithError = (config?: ClientConfig) => {
  return httpClient(apiKeyRoutesMap, config);
};

// ❌ This will fail with: "The inferred type of 'createApiKeySafekitSdkWithError' cannot be named without a reference to..."
// Uncomment the line below to see the error:
// export type ApiKeySafekitSdkWithError = ReturnType<typeof createApiKeySafekitSdkWithError>;

console.log("❌ The above type export would fail with ts(2742) error");

// ==================== SOLUTIONS ====================

// ✅ SOLUTION 1: Add explicit type annotation to the function
export const createApiKeySafekitSdk = (config?: ClientConfig): HttpClient<typeof apiKeyRoutesMap> => {
  return httpClient(apiKeyRoutesMap, config);
};

export type ApiKeySafekitSdk = ReturnType<typeof createApiKeySafekitSdk>;

// ✅ SOLUTION 2: Export the type directly (simpler)
export type ApiKeySafekitSdkDirect = HttpClient<typeof apiKeyRoutesMap>;

// ✅ SOLUTION 3: Use a factory function with explicit typing
export function createTypedApiSdk<T extends RouteMap>(routes: T, config?: ClientConfig): HttpClient<T> {
  return httpClient(routes, config);
}

export const apiSdkFactoryExample = createTypedApiSdk(apiKeyRoutesMap);
export type ApiSdkFactoryType = typeof apiSdkFactoryExample;

// ✅ SOLUTION 4: Create a wrapper class (for more complex scenarios)
export class ApiKeySdk {
  private client: HttpClient<typeof apiKeyRoutesMap>;

  constructor(config?: ClientConfig) {
    this.client = httpClient(apiKeyRoutesMap, config);
  }

  get users() {
    return this.client.users;
  }

  // You can add additional methods here for complex logic
  async getUserWithRetry(id: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.client.users.get({ params: { id } });
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

// ✅ SOLUTION 5: Use module augmentation (for library-wide fixes)
// This would go in a separate .d.ts file in a real project:
// declare module "@safekit/safe-http" {
//   export interface GlobalClientConfig extends ClientConfig {}
//   export type SafeHttpClient<T extends RouteMap> = HttpClient<T>;
// }

/**
 * Default instance examples
 */
export const apiKeySafekitSdk = createApiKeySafekitSdk();
export const apiSdkClass = new ApiKeySdk();

// ✅ Usage examples that demonstrate all solutions work
export const exampleUsage = async () => {
  // Solution 1: Explicit function typing
  const sdk1 = createApiKeySafekitSdk({
    baseUrl: "https://api.example.com",
    headers: { "Authorization": "Bearer token" },
  });

  // Solution 3: Factory function
  const sdk2 = createTypedApiSdk(apiKeyRoutesMap, {
    baseUrl: "https://api.example.com",
  });

  // Solution 4: Class wrapper
  const sdk3 = new ApiKeySdk({
    baseUrl: "https://api.example.com",
  });

  // All provide the same type-safe API
  const user1 = await sdk1.users.get({ params: { id: "123" } });
  const user2 = await sdk2.users.get({ params: { id: "123" } });
  const user3 = await sdk3.users.get({ params: { id: "123" } });
  const userWithRetry = await sdk3.getUserWithRetry("123");

  return { user1, user2, user3, userWithRetry };
};

// ✅ Type validation examples
export const typeValidationExamples = () => {
  const check1: ApiKeySafekitSdk = createApiKeySafekitSdk();
  const check2: ApiKeySafekitSdkDirect = createApiKeySafekitSdk();
  const check3: ApiSdkFactoryType = createTypedApiSdk(apiKeyRoutesMap);
  
  return { check1, check2, check3 };
};