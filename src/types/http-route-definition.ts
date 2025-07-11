import { HttpStatusCode } from "./http-status-code";
import { SchemaValidator } from "./schema";

/**
 * Used to define the contract for an HTTP response.
 */
export type HttpResponseDefinition = {
  description: string;
  schema?: SchemaValidator<any>;
  headers?: Record<string, {
    description: string;
    schema?: SchemaValidator<any> | { type: string; example?: string };
  }>;
};

/**
 * Used to define the contract for an HTTP route.
 */
export type HttpRouteDefinition = {
  path: string;
  method: "post" | "get" | "put" | "delete" | "patch";
  tags?: string[];
  operationId?: string;
  summary?: string;
  description?: string;
  middleware?: string[];
  request?: {
    params?: SchemaValidator<any>;
    query?: SchemaValidator<any>;
    body?: SchemaValidator<any>;
    headers?: SchemaValidator<any>;
  };
  responses: Partial<Record<HttpStatusCode, HttpResponseDefinition | string>>;
};