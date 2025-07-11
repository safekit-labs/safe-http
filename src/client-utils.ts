/**
 * Client utilities for the SafeHTTP library
 */

export const mergePath = (base: string, path: string): string => {
  base = base.replace(/\/+$/, '');
  base = base + '/';
  path = path.replace(/^\/+/, '');
  return base + path;
};

export const replaceUrlParams = (urlString: string, params: Record<string, string | undefined>): string => {
  let result = urlString;
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      const paramPattern = new RegExp(`:${key}(?=\/|$|\\?|#)`, 'g');
      result = result.replace(paramPattern, encodeURIComponent(value));
    }
  }
  
  return result;
};

export const buildSearchParams = (query: Record<string, any>): URLSearchParams => {
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          searchParams.append(key, String(item));
        }
      }
    } else {
      searchParams.set(key, String(value));
    }
  }
  
  return searchParams;
};

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const deepMerge = <T extends Record<string, any>>(target: T, source: Record<string, any>): T => {
  if (!isObject(target) && !isObject(source)) {
    return source as T;
  }
  
  const merged = { ...target } as Record<string, any>;
  
  for (const key in source) {
    const value = source[key];
    if (isObject(merged[key]) && isObject(value)) {
      merged[key] = deepMerge(merged[key], value);
    } else {
      merged[key] = value;
    }
  }
  
  return merged as T;
};

export const getContentType = (body: any): string | undefined => {
  if (typeof body === 'string') {
    try {
      JSON.parse(body);
      return 'application/json';
    } catch {
      return 'text/plain';
    }
  }
  
  if (body instanceof FormData) {
    return undefined; // Let browser set multipart/form-data with boundary
  }
  
  if (body instanceof URLSearchParams) {
    return 'application/x-www-form-urlencoded';
  }
  
  if (isObject(body)) {
    return 'application/json';
  }
  
  return undefined;
};

export const serializeBody = (body: any): BodyInit | undefined => {
  if (body === undefined || body === null) {
    return undefined;
  }
  
  if (typeof body === 'string' || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob || body instanceof ArrayBuffer) {
    return body;
  }
  
  if (isObject(body) || Array.isArray(body)) {
    return JSON.stringify(body);
  }
  
  return String(body);
};