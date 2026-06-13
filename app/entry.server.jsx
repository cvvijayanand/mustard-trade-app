import { handleRequest as vercelHandleRequest } from "@vercel/react-router/entry.server";
import { addDocumentResponseHeaders } from "./shopify.server";
import { corsPreflightResponse } from "./lib/cors.server";

export { streamTimeout } from "@vercel/react-router/entry.server";

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
  loadContext,
) {
  const { pathname } = new URL(request.url);
  const isAppProxyRoute = pathname.startsWith("/apps/");

  if (isAppProxyRoute && request.method === "OPTIONS") {
    return corsPreflightResponse(request);
  }

  if (!isAppProxyRoute) {
    addDocumentResponseHeaders(request, responseHeaders);
  }

  return vercelHandleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    reactRouterContext,
    loadContext,
  );
}
