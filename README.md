# @safekit/safe-http

⚠️ **EXPERIMENTAL ALPHA VERSION** ⚠️
This package is in active development and **not ready for production use**. Expect breaking changes between versions.

A lightweight type-safe HTTP client builder with schema validation and automatic type inference for TypeScript applications.

[![npm version](https://badge.fury.io/js/@safekit%2Fsafe-http.svg)](https://badge.fury.io/js/@safekit%2Fsafe-http)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

🔒 **Type-safe HTTP clients** - Automatic TypeScript inference for requests and responses
📋 **Schema validation** - Validate requests and responses with your favorite validation library
🎨 **Multiple schemas** - Supports Zod, Yup, Valibot, ArkType, Effect Schema, Superstruct, and more
🔗 **Flexible organization** - Flat or nested SDK structures
✅ **Full request/response coverage** - Validate params, query, body, headers, and responses
🚀 **Zero runtime overhead** - Pure TypeScript types with optional runtime validation

## Installation

```bash
# npm
npm install @safekit/safe-http

# yarn
yarn add @safekit/safe-http

# bun
bun add @safekit/safe-http
```

## Quick Start

```typescript
import { httpClient } from "@safekit/safe-http";
import { z } from "zod";

// Define your route
const getUserRoute = {
  path: "/users/:id",
  method: "get" as const,
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "User found",
      schema: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      }),
    },
  },
} as const;

// Create type-safe client
const api = httpClient({
  getUser: getUserRoute,
});

// Use with full type safety
const user = await api.getUser({
  params: { id: "123" }, // ✅ Typed and validated
});
// user is automatically typed as { id: string, name: string, email: string }
```

## Route Definitions

Define HTTP routes with full type safety:

```typescript
import { z } from "zod";
import { HTTP_STATUS_CODE } from "@safekit/safe-http";

import type { HttpRouteDefinition } from "@safekit/safe-http";

const createUserRoute: HttpRouteDefinition = {
  path: "/users",
  method: "post",
  tags: ["users"],
  operationId: "createUser",
  summary: "Create a new user",
  description: "Creates a new user with the provided information",
  request: {
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0).max(150),
    }),
    headers: z
      .object({
        "x-api-key": z.string(),
      })
      .optional(),
  },
  responses: {
    [HTTP_STATUS_CODE.CREATED]: {
      description: "User created successfully",
      schema: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      }),
    },
    [HTTP_STATUS_CODE.BAD_REQUEST]: {
      description: "Invalid input",
      schema: z.object({
        error: z.string(),
        details: z.array(z.string()),
      }),
    },
  },
};
```

## Client Creation

### Flat Structure

```typescript
const api = httpClient({
  getUser: getUserRoute,
  createUser: createUserRoute,
  updateUser: updateUserRoute,
  deleteUser: deleteUserRoute,
});

// Usage
await api.getUser({ params: { id: "123" } });
await api.createUser({ body: { name: "John", email: "john@example.com" } });
```

### Nested Structure

```typescript
const api = httpClient({
  users: {
    get: getUserRoute,
    create: createUserRoute,
    update: updateUserRoute,
    delete: deleteUserRoute,
  },
  posts: {
    list: listPostsRoute,
    create: createPostRoute,
  },
});

// Usage
await api.users.get({ params: { id: "123" } });
await api.posts.list({ query: { page: 1, limit: 10 } });
```

## Request Types

Safe-HTTP supports all common request parameters:

```typescript
const route = {
  path: "/users/:id/posts",
  method: "get" as const,
  request: {
    params: z.object({
      id: z.string(),
    }),
    query: z.object({
      page: z.number().default(1),
      limit: z.number().max(100).default(20),
      search: z.string().optional(),
    }),
    headers: z.object({
      authorization: z.string(),
    }),
    body: z
      .object({
        filters: z.array(z.string()),
      })
      .optional(),
  },
  responses: {
    200: {
      description: "Posts retrieved",
      schema: z.object({
        posts: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            content: z.string(),
          }),
        ),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
        }),
      }),
    },
  },
};

const api = httpClient({ getPosts: route });

// All parameters are typed and validated
const result = await api.getPosts({
  params: { id: "user-123" },
  query: { page: 1, limit: 50, search: "typescript" },
  headers: { authorization: "Bearer token" },
  body: { filters: ["published", "featured"] },
});
```

## Validation

### Request Validation

Requests are automatically validated before being sent:

```typescript
const api = httpClient({
  createUser: {
    path: "/users",
    method: "post" as const,
    request: {
      body: z.object({
        email: z.string().email(),
        age: z.number().min(0),
      }),
    },
    responses: { 201: { description: "Created" } },
  },
});

// ✅ Valid request
await api.createUser({
  body: { email: "user@example.com", age: 25 },
});

// ❌ Throws validation error
await api.createUser({
  body: { email: "invalid-email", age: -5 },
});
```

### Response Validation

Responses are validated against the defined schema:

```typescript
const api = httpClient({
  getUser: {
    path: "/users/:id",
    method: "get" as const,
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        description: "User found",
        schema: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().email(),
        }),
      },
    },
  },
});

// Response is automatically validated and typed
const user = await api.getUser({ params: { id: "123" } });
// user: { id: string, name: string, email: string }
```

## Error Handling

```typescript
import { HttpClientError } from "@safekit/safe-http";

try {
  const user = await api.getUser({ params: { id: "123" } });
} catch (error) {
  if (error instanceof HttpClientError) {
    console.log("HTTP Error:", error.status, error.message);
    console.log("Response:", error.response);
  } else {
    console.log("Validation Error:", error.message);
  }
}
```

## Advanced Usage

### Custom Functions

You can use custom validation functions:

```typescript
const validateEmail = (value: unknown): string => {
  if (typeof value !== "string" || !value.includes("@")) {
    throw new Error("Invalid email");
  }
  return value;
};

const route = {
  path: "/users",
  method: "post" as const,
  request: {
    body: validateEmail,
  },
  responses: { 201: { description: "Created" } },
};
```

### No Validation

Skip validation entirely with `null`:

```typescript
const route = {
  path: "/webhook",
  method: "post" as const,
  request: {
    body: null, // No validation
  },
  responses: { 200: { description: "OK" } },
};
```

## API Reference

### `httpClient(routes)`

Creates a type-safe HTTP client from route definitions.

**Parameters:**

- `routes` - Object containing route definitions (flat or nested)

**Returns:**

- HTTP client with methods corresponding to route keys

### `HttpRouteDefinition`

```typescript
interface HttpRouteDefinition {
  path: string;
  method: "get" | "post" | "put" | "delete" | "patch";
  tags?: string[];
  operationId?: string;
  summary?: string;
  description?: string;
  request?: {
    params?: SchemaValidator<any>;
    query?: SchemaValidator<any>;
    body?: SchemaValidator<any>;
    headers?: SchemaValidator<any>;
  };
  responses: Record<HttpStatusCode, HttpResponseDefinition | string>;
}
```

## Schema Support

Safe-HTTP supports multiple validation libraries through a unified interface:

```typescript
import { z } from "zod";
import * as yup from "yup";
import * as v from "valibot";

// Zod
const zodRoute = {
  path: "/users",
  method: "post" as const,
  request: {
    body: z.object({
      name: z.string(),
      age: z.number().min(0),
    }),
  },
  responses: { 201: { description: "Created" } },
};

// Yup
const yupRoute = {
  path: "/users",
  method: "post" as const,
  request: {
    body: yup.object({
      name: yup.string().required(),
      age: yup.number().min(0).required(),
    }),
  },
  responses: { 201: { description: "Created" } },
};

// Valibot
const valibotRoute = {
  path: "/users",
  method: "post" as const,
  request: {
    body: v.object({
      name: v.string(),
      age: v.pipe(v.number(), v.minValue(0)),
    }),
  },
  responses: { 201: { description: "Created" } },
};
```

### `SchemaValidator<T>`

Union type supporting multiple validation libraries:

- Zod: `{ parse: (input: unknown) => T }`
- Yup: `{ validateSync: (input: unknown) => T }`
- Superstruct: `{ create: (input: unknown) => T }`
- Custom functions: `(input: unknown) => T`
- And more...

## What's Not Included

Safe-HTTP focuses on type-safe HTTP clients and doesn't include:

- HTTP server/framework functionality
- Built-in authentication (bring your own)
- Request caching (use external libraries)
- File upload utilities (use standard APIs)

## Inspiration

This library draws inspiration from:

- [Hono](https://github.com/honojs/hono) - Lightweight web framework
- [tRPC](https://github.com/trpc/trpc) - End-to-end typesafe APIs
- [Zod](https://github.com/colinhacks/zod) - TypeScript schema validation

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [safekit](https://github.com/safekit-labs)
