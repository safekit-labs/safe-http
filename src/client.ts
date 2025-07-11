/**
 * Main client implementation for the SafeHTTP library
 */

import type { HttpRouteDefinition } from "./types/http-route-definition";
import type { 
  ClientRequestOptions, 
  RouteMap, 
  HttpClient, 
  ClientResponse,
  InferRequestType,
  InferResponseType
} from "./client-types";
import { createParseFn } from "./libs/parser";
import { 
  mergePath, 
  replaceUrlParams, 
  buildSearchParams, 
  deepMerge, 
  getContentType, 
  serializeBody,
  isObject
} from "./client-utils";

class HttpClientRequest {
  private url: string;
  private method: string;
  private route: HttpRouteDefinition;
  private baseOptions: ClientRequestOptions;

  constructor(
    baseUrl: string, 
    route: HttpRouteDefinition, 
    baseOptions: ClientRequestOptions = {}
  ) {
    this.url = mergePath(baseUrl, route.path);
    this.method = route.method.toUpperCase();
    this.route = route;
    this.baseOptions = baseOptions;
  }

  async execute<T extends HttpRouteDefinition>(
    args: InferRequestType<T> = {} as InferRequestType<T>,
    options: ClientRequestOptions = {}
  ): Promise<ClientResponse<InferResponseType<T>>> {
    const mergedOptions = deepMerge(this.baseOptions, options);
    
    // Validate and process request parameters
    const processedArgs = await this.validateRequest(args);
    
    // Build the URL
    let finalUrl = this.url;
    
    // Replace URL parameters
    if (processedArgs.params) {
      finalUrl = replaceUrlParams(finalUrl, processedArgs.params);
    }
    
    // Add query parameters
    if (processedArgs.query) {
      const searchParams = buildSearchParams(processedArgs.query);
      if (searchParams.toString()) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + searchParams.toString();
      }
    }
    
    // Prepare headers
    const headers = new Headers();
    
    // Add request headers
    if (processedArgs.headers) {
      for (const [key, value] of Object.entries(processedArgs.headers)) {
        headers.set(key, String(value));
      }
    }
    
    // Add options headers
    const optionsHeaders = typeof mergedOptions.headers === 'function' 
      ? await mergedOptions.headers() 
      : mergedOptions.headers;
      
    if (optionsHeaders) {
      for (const [key, value] of Object.entries(optionsHeaders)) {
        headers.set(key, value);
      }
    }
    
    // Prepare body
    let body: BodyInit | undefined;
    const shouldHaveBody = !['GET', 'HEAD'].includes(this.method);
    
    if (shouldHaveBody && processedArgs.body !== undefined) {
      body = serializeBody(processedArgs.body);
      
      // Set content type if not already set
      if (!headers.has('Content-Type')) {
        const contentType = getContentType(processedArgs.body);
        if (contentType) {
          headers.set('Content-Type', contentType);
        }
      }
    }
    
    // Make the request
    const fetchFn = mergedOptions.fetch || fetch;
    const response = await fetchFn(finalUrl, {
      method: this.method,
      headers,
      body,
      ...mergedOptions.init,
    });
    
    // Validate response if schema is provided
    const validatedResponse = await this.validateResponse(response);
    
    return validatedResponse as ClientResponse<InferResponseType<T>>;
  }

  private async validateRequest(args: any): Promise<any> {
    const processedArgs: any = {};
    
    // Validate params
    if (this.route.request?.params && args.params !== undefined) {
      const validator = createParseFn(this.route.request.params);
      processedArgs.params = await validator(args.params);
    } else if (args.params) {
      processedArgs.params = args.params;
    }
    
    // Validate query
    if (this.route.request?.query && args.query !== undefined) {
      const validator = createParseFn(this.route.request.query);
      processedArgs.query = await validator(args.query);
    } else if (args.query) {
      processedArgs.query = args.query;
    }
    
    // Validate body
    if (this.route.request?.body && args.body !== undefined) {
      const validator = createParseFn(this.route.request.body);
      processedArgs.body = await validator(args.body);
    } else if (args.body) {
      processedArgs.body = args.body;
    }
    
    // Validate headers
    if (this.route.request?.headers && args.headers !== undefined) {
      const validator = createParseFn(this.route.request.headers);
      processedArgs.headers = await validator(args.headers);
    } else if (args.headers) {
      processedArgs.headers = args.headers;
    }
    
    return processedArgs;
  }

  private async validateResponse(response: Response): Promise<ClientResponse> {
    const statusCode = response.status as keyof typeof this.route.responses;
    const responseDefinition = this.route.responses[statusCode];
    
    if (responseDefinition && typeof responseDefinition === 'object' && responseDefinition.schema) {
      // Clone response to read body for validation
      const clonedResponse = response.clone();
      
      try {
        const responseData = await clonedResponse.json();
        const validator = createParseFn(responseDefinition.schema);
        await validator(responseData); // Validate but don't replace original response
      } catch (error) {
        // If validation fails, still return the response but it might be invalid
        console.warn('Response validation failed:', error);
      }
    }
    
    return response as ClientResponse;
  }
}

function createEndpoint(
  baseUrl: string, 
  route: HttpRouteDefinition, 
  baseOptions: ClientRequestOptions = {}
) {
  return (args?: any, options?: ClientRequestOptions) => {
    const request = new HttpClientRequest(baseUrl, route, baseOptions);
    return request.execute(args, options);
  };
}

function isRouteDefinition(value: any): value is HttpRouteDefinition {
  return (
    isObject(value) &&
    typeof value.path === 'string' &&
    typeof value.method === 'string' &&
    typeof value.responses === 'object'
  );
}

function createClientFromRouteMap<T extends RouteMap>(
  routeMap: T,
  baseUrl: string,
  baseOptions: ClientRequestOptions = {}
): HttpClient<T> {
  const client: any = {};
  
  for (const [key, value] of Object.entries(routeMap)) {
    if (isRouteDefinition(value)) {
      client[key] = createEndpoint(baseUrl, value, baseOptions);
    } else if (isObject(value)) {
      client[key] = createClientFromRouteMap(value as RouteMap, baseUrl, baseOptions);
    }
  }
  
  return client as HttpClient<T>;
}

export function httpClient<T extends RouteMap>(
  routeMap: T,
  config: Omit<RequestInit, 'headers' | 'method' | 'body'> & {
    baseUrl?: string;
    headers?: ClientRequestOptions['headers'];
    fetch?: ClientRequestOptions['fetch'];
  } = {}
): HttpClient<T> {
  const { baseUrl = '', headers, fetch, ...requestInit } = config;
  
  // Build base options from config
  const baseOptions: ClientRequestOptions = {
    headers,
    fetch,
    init: requestInit,
  };
  
  return createClientFromRouteMap(routeMap, baseUrl, baseOptions);
}