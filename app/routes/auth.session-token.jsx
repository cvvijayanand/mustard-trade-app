import { boundary } from "@shopify/shopify-app-react-router/server";

/**
 * Session-token bounce page. App Bridge runs here inside the Admin iframe,
 * fetches a session token, and reloads the URL in shopify-reload.
 * Must return HTML directly — do not call authenticate.admin here.
 */
export const loader = async () => {
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>` +
      `<script data-api-key="${apiKey}" src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>` +
      `</body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html;charset=utf-8" },
    },
  );
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
