import { authenticate } from "../shopify.server";

const REAUTH_URL_HEADER = "X-Shopify-API-Request-Failure-Reauthorize-Url";

/**
 * Auth loaders throw Response objects (App Bridge HTML, redirects, reauth headers).
 * Return them from loaders instead of throwing — Vercel SSR turns thrown Responses
 * into empty 410 errors, which breaks embedded OAuth and causes
 * "admin.shopify.com refused to connect" in the Admin iframe.
 */
export async function returnAuthResponse(request) {
  try {
    await authenticate.admin(request);
    return null;
  } catch (err) {
    if (err instanceof Response) {
      return finalizeAuthResponse(request, err);
    }
    throw err;
  }
}

/**
 * Run authenticate.admin in a route loader; return auth Responses directly.
 */
export async function authenticateAdminForLoader(request, onAuthenticated) {
  try {
    const auth = await authenticate.admin(request);
    return onAuthenticated ? onAuthenticated(auth) : auth;
  } catch (err) {
    if (err instanceof Response) {
      return finalizeAuthResponse(request, err);
    }
    throw err;
  }
}

/**
 * Embedded document requests must bypass Vercel SSR for auth handoffs.
 * Static auth pages handle their own HTML.
 */
export function shouldBypassEmbeddedAuthDocument(request) {
  const url = new URL(request.url);

  if (url.searchParams.get("embedded") !== "1") {
    return false;
  }

  if (request.headers.get("authorization")) {
    return false;
  }

  const { pathname } = url;

  if (pathname.startsWith("/apps/")) {
    return false;
  }

  if (pathname === "/auth/session-token") {
    return false;
  }

  if (pathname === "/auth/exit-iframe" && url.searchParams.get("exitIframe")) {
    return false;
  }

  return pathname.startsWith("/app") || pathname.startsWith("/auth/");
}

export async function handleEmbeddedAuthDocument(request) {
  try {
    await authenticate.admin(request);
    return null;
  } catch (err) {
    if (err instanceof Response) {
      return finalizeAuthResponse(request, err);
    }
    throw err;
  }
}

/**
 * Normalize auth Responses for embedded iframe flows on Vercel.
 * Converts 401 reauthorize headers into exit-iframe redirects so OAuth
 * (accounts.shopify.com) opens in the top window, not inside the iframe.
 */
export async function finalizeAuthResponse(request, response) {
  const url = new URL(request.url);
  const isEmbedded = url.searchParams.get("embedded") === "1";
  const isDocument = !request.headers.get("authorization");

  const reauthUrl = response.headers.get(REAUTH_URL_HEADER);
  if (isEmbedded && isDocument && response.status === 401 && reauthUrl) {
    const appUrl = process.env.SHOPIFY_APP_URL || url.origin;
    const params = new URLSearchParams({
      shop: url.searchParams.get("shop") || "",
      host: url.searchParams.get("host") || "",
      exitIframe: reauthUrl,
    });
    return Response.redirect(
      `${appUrl}/auth/exit-iframe?${params.toString()}`,
      302,
    );
  }

  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  return wrapAuthHtmlResponse(response);
}

/** Wrap App Bridge HTML fragments in a full document for reliable iframe delivery. */
async function wrapAuthHtmlResponse(response) {
  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const body = await response.text();
  if (body.includes("<!DOCTYPE") || body.includes("<html")) {
    return new Response(body, {
      status: response.status,
      headers: response.headers,
    });
  }

  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/html;charset=utf-8");

  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
    { status: response.status || 200, headers },
  );
}

/**
 * Redirect to a Shopify or external URL from an embedded app route.
 * Uses App Bridge top-frame navigation — required for admin.shopify.com,
 * accounts.shopify.com, billing confirmation URLs, etc.
 *
 * @see https://community.shopify.com/t/admin-shopify-com-refused-to-connect-when-trying-to-redirect-to-confirmation-url/393327
 */
export async function redirectOutsideIframe(request, url) {
  const { redirect } = await authenticate.admin(request);
  throw redirect(url, { target: "_parent" });
}
