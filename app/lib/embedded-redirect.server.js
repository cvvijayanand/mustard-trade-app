import { authenticate } from "../shopify.server";

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
      return wrapAuthHtmlResponse(err);
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
      return wrapAuthHtmlResponse(err);
    }
    throw err;
  }
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
