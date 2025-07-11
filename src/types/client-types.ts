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

// Helper to extract schema from request definition
type ExtractSchemaType<T, K extends string> = T extends { request: { [P in K]: infer S } }
  ? S extends SchemaValidator<any>
    ? InferSchemaOutput<S>
    : never
  : never;

// Extract request parameters with proper conditional types
export type InferRequestType<T extends HttpRouteDefinition> = {} &
  (T extends { request: { params: any } }
    ? { params: ExtractSchemaType<T, "params"> }
    : {}) &
  (T extends { request: { query: any } }
    ? { query: ExtractSchemaType<T, "query"> }
    : {}) &
  (T extends { request: { body: any } }
    ? { body: ExtractSchemaType<T, "body"> }
    : {}) &
  (T extends { request: { headers: any } }
    ? { headers: ExtractSchemaType<T, "headers"> }
    : {});

// Helper to check if an object has any keys
export type HasRequiredKeys<T> = keyof T extends never ? false : true;

// Infer response type from route definition
export type InferResponseType<T extends HttpRouteDefinition> = T["responses"] extends Record<any, any>
  ? {
      [K in keyof T["responses"]]: T["responses"][K] extends { schema: infer S }
        ? S extends SchemaValidator<any>
          ? InferSchemaOutput<S>
          : unknown
        : unknown;
    }[keyof T["responses"]]
  : unknown;

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