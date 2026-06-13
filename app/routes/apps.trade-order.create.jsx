/**
 * App Proxy route — storefront theme → app
 *
 * Craft (or any OS 2.0 theme) calls: POST /apps/trade-order/create
 * Configure App Proxy in shopify.app.toml
 */

import { authenticate } from "../shopify.server";
import { createTradeOrder } from "../lib/trade-order.server";

function proxyJson(body, status = 200) {
  // App proxy expects a normal 2xx response; non-2xx often becomes a Shopify error page.
  return Response.json(body, { status });
}

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return proxyJson({ success: false, error: "Method not allowed" });
  }

  try {
    const { admin, session } = await authenticate.public.appProxy(request);

    if (!admin || !session) {
      return proxyJson({
        success: false,
        error:
          "App is not authorized for this store. Open the app once from Shopify Admin (Apps → mustard-trade-app) to complete installation.",
      });
    }

    const payload = await request.json();
    const result = await createTradeOrder(admin, payload);
    return proxyJson(result);
  } catch (err) {
    if (err instanceof Response) {
      throw err;
    }

    console.error("Trade order create failed:", err);
    return proxyJson({
      success: false,
      error: err.message || "Order creation failed",
    });
  }
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  // Health check for app proxy — Shopify treats 4xx/5xx as proxy failures.
  return proxyJson({ ok: true, message: "POST JSON to create a trade order" });
};
