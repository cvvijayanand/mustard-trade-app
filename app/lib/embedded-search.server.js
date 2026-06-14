import { redirect } from "react-router";

/** Query params Shopify sends with embedded app document requests. */
export const EMBEDDED_QUERY_KEYS = [
  "shop",
  "host",
  "embedded",
  "locale",
  "session",
];

export function getEmbeddedSearchParams(url) {
  const params = new URLSearchParams();

  for (const key of EMBEDDED_QUERY_KEYS) {
    const value = url.searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  }

  return params;
}

export function appendEmbeddedSearch(pathname, url) {
  const params = getEmbeddedSearchParams(url);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Embedded Admin requests must include ?shop= — redirect to login when missing.
 * Returns a redirect Response or null when shop is present / not embedded.
 */
export function redirectIfEmbeddedWithoutShop(request) {
  const url = new URL(request.url);

  if (url.searchParams.get("embedded") !== "1") {
    return null;
  }

  if (url.searchParams.get("shop")) {
    return null;
  }

  throw redirect("/auth/login");
}
