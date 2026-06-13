const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization, X-Requested-With";

function hostnameFromEnv(value) {
  if (!value) return null;
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname;
  } catch {
    return value.replace(/^https?:\/\//, "").split("/")[0] || null;
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return false;

  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith(".myshopify.com") || hostname === "myshopify.com") {
      return true;
    }

    const customDomain = hostnameFromEnv(process.env.SHOP_CUSTOM_DOMAIN);
    if (customDomain && hostname === customDomain) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function corsPreflightResponse(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return new Response(null, { status: 204, headers });
}

export function withCors(request, response) {
  const origin = request.headers.get("Origin");
  if (!origin || !isAllowedOrigin(origin)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
