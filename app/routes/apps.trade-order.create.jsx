/**
 * App Proxy route — storefront theme → app
 *
 * Craft (or any OS 2.0 theme) calls: POST /apps/trade-order/create
 * Configure App Proxy in shopify.app.toml
 */

import { authenticate } from "../shopify.server";
import { createTradeOrder } from "../lib/trade-order.server";

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json(
      { success: false, error: "Method not allowed" },
      { status: 405 },
    );
  }

  try {
    const { admin, session } = await authenticate.public.appProxy(request);

    if (!admin || !session) {
      return Response.json(
        {
          success: false,
          error:
            "App is not authorized for this store. Open the app once from Shopify Admin (Apps → mustard-trade-app) to complete installation.",
        },
        { status: 503 },
      );
    }

    const payload = await request.json();
    const result = await createTradeOrder(admin, payload);
    return Response.json(result);
  } catch (err) {
    console.error("Trade order create failed:", err);
    return Response.json(
      { success: false, error: err.message || "Order creation failed" },
      { status: 500 },
    );
  }
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  return Response.json({ error: "Use POST" }, { status: 405 });
};
