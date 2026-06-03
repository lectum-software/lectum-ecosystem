import type { AxiosRequestConfig } from "axios";

export type ApiMethod = "POST" | "GET" | "PUT" | "DELETE";

export type CallEndpointParams = {
  route: string;
  method?: ApiMethod;
  body?: object;
  params?: Record<string, string | number | boolean | undefined | null>;
  query?: Record<string, string | number | boolean | undefined | null>;
  config?: AxiosRequestConfig;
};

const normalizeRouteParams = (route: string, params?: CallEndpointParams["params"]) => {
  if (!params) return route;

  return Object.entries(params).reduce((url, [key, value]) => {
    if (value === undefined || value === null) return url;
    return url.replace(`:${key}`, encodeURIComponent(String(value)));
  }, route);
};

const normalizeQuery = (query?: CallEndpointParams["query"]) => {
  if (!query) return "";

  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  });

  const value = search.toString();
  return value ? `?${value}` : "";
};

export const callEndpoint = ({
  route,
  method,
  body,
  params,
  query,
  config,
}: CallEndpointParams) => {
  const url = `${normalizeRouteParams(route, params)}${normalizeQuery(query)}`;

  return {
    url,
    body,
    method: method || (body ? "POST" : "GET"),
    config,
  };
};
