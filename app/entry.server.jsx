import { handleRequest as vercelHandleRequest } from "@vercel/react-router/entry.server";
import { addDocumentResponseHeaders, authenticate } from "./shopify.server";
import { corsPreflightResponse } from "./lib/cors.server";

export { streamTimeout } from "@vercel/react-router/entry.server";

const RAW_AUTH_PATHS = ["/auth/session-token", "/auth/callback"];

async function handleRawAuthRequest(request) {
  try {
    await authenticate.admin(request);
    return null;
  } catch (err) {
    if (err instanceof Response) {
      return err;
    }
    throw err;
  }
}

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

  if (RAW_AUTH_PATHS.includes(pathname)) {
    const authResponse = await handleRawAuthRequest(request);
    if (authResponse) {
      return authResponse;
    }
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
