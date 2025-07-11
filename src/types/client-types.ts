/**
 * Client types for the SafeHTTP library
 */

import type { HttpRouteDefinition } from "./http-route-definition";
import type { SchemaValidator, InferSchemaOutput } from "./schema";

export type ClientRequestOptions = {
  fetch?: typeof fetch;
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  init?: RequestInit;
};

// ========================================================================
// TYPE SIMPLIFICATION UTILITIES
// ========================================================================

/**
 * Prettifies a type by flattening intersections and making it more readable
 * Converts intersections like A & B into a single object type
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Simplifies complex conditional types and removes unnecessary complexity
 * Helps TypeScript display cleaner types in IDE tooltips
 */
export type Simplify<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

/**
 * Recursively simplifies nested object types
 * Applies simplification to all nested properties
 */
export type DeepSimplify<T> = T extends Record<string, any>
  ? {
      [K in keyof T]: T[K] extends Record<string, any>
        ? DeepSimplify<T[K]>
        : T[K];
    }
  : T;

/**
 * Flattens deeply nested type structures (function-safe)
 * Removes unnecessary wrapper types and complexity while preserving functions
 */
export type FlattenType<T> = T extends (...args: any[]) => any
  ? T
  : T extends any[] 
  ? T
  : T extends Record<string, any>
  ? Prettify<{
      [K in keyof T]: FlattenType<T[K]>;
    }>
  : T;

/**
 * Combines all simplification utilities for maximum type cleaning (function-safe)
 */
export type CleanType<T> = T extends (...args: any[]) => any
  ? T
  : Prettify<Simplify<FlattenType<T>>>;


// More precise request type inference that properly handles schema extraction
export type InferRequestType<T extends HttpRouteDefinition> = CleanType<
  T extends { request: infer R }
    ? R extends Record<string, any>
      ? {
          [K in keyof R]: InferSchemaOutput<R[K]>
        } extends infer Result
        ? keyof Result extends never
          ? {}
          : Result
        : {}
      : {}
    : {}
>;

// Helper to check if an object has any keys
export type HasRequiredKeys<T> = keyof T extends never ? false : true;

// Infer response type from route definition
export type InferResponseType<T extends HttpRouteDefinition> = CleanType<
  T["responses"] extends Record<any, any>
    ? {
        [K in keyof T["responses"]]: T["responses"][K] extends { schema: infer S }
          ? S extends SchemaValidator<any>
            ? InferSchemaOutput<S>
            : unknown
          : unknown;
      }[keyof T["responses"]]
    : unknown
>;

export interface ClientResponse<T = unknown> extends Response {
  json(): Promise<T>;
}

// Client endpoint with proper conditional args
export type ClientEndpoint<T extends HttpRouteDefinition> =
  HasRequiredKeys<InferRequestType<T>> extends true
    ? (args: InferRequestType<T>, options?: ClientRequestOptions) => Promise<ClientResponse<InferResponseType<T>>>
    : (args?: InferRequestType<T>, options?: ClientRequestOptions) => Promise<ClientResponse<InferResponseType<T>>>;

// Route map types - fix circular reference
export interface RouteMap {
  [key: string]: HttpRouteDefinition | RouteMap;
}

export type InferRouteClient<T> = T extends HttpRouteDefinition
  ? ClientEndpoint<T>
  : T extends RouteMap
  ? {
      [K in keyof T]: InferRouteClient<T[K]>;
    }
  : never;

export type ClientConfig = Omit<RequestInit, 'headers' | 'method' | 'body'> & {
  baseUrl?: string;
  headers?: ClientRequestOptions['headers'];
  fetch?: ClientRequestOptions['fetch'];
};

export type HttpClient<T extends RouteMap> = {
  [K in keyof T]: InferRouteClient<T[K]>;
};