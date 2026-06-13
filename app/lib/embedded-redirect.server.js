import { authenticate } from "../shopify.server";

/**
 * Auth loaders throw Response objects (App Bridge breakout HTML).
 * Return them directly so Vercel SSR does not drop the body.
 */
export async function returnAuthResponse(request) {
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
