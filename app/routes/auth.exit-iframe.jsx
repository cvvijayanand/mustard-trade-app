import { boundary } from "@shopify/shopify-app-react-router/server";
import { returnAuthResponse } from "../lib/embedded-redirect.server";

/**
 * Break out of the Admin iframe before OAuth / account selection.
 * Shopify blocks accounts.shopify.com inside iframes — this page runs in
 * the iframe and opens the destination in the top window.
 */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const exitIframe = url.searchParams.get("exitIframe");

  if (exitIframe) {
    const appUrl = process.env.SHOPIFY_APP_URL || url.origin;
    const destination = new URL(exitIframe, appUrl).toString();
    const apiKey = process.env.SHOPIFY_API_KEY || "";

    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>` +
        `<script data-api-key="${apiKey}" src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>` +
        `<script>window.open(${JSON.stringify(destination)}, "_top")</script>` +
        `</body></html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html;charset=utf-8" },
      },
    );
  }

  return returnAuthResponse(request);
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
