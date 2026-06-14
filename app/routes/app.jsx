import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticateAdminForLoader } from "../lib/embedded-redirect.server";
import { appPath, useAppSearch } from "../lib/embedded-search.js";

export const loader = async ({ request }) => {
  const result = await authenticateAdminForLoader(request, () => ({
    // eslint-disable-next-line no-undef
    apiKey: process.env.SHOPIFY_API_KEY || "",
  }));

  if (result instanceof Response) {
    return result;
  }

  return result;
};

// For redirects to Shopify URLs (billing confirmation, admin pages), use:
//   const { redirect } = await authenticate.admin(request);
//   throw redirect(url, { target: "_parent" });
// Or: import { redirectOutsideIframe } from "../lib/embedded-redirect.server";

export default function App() {
  const { apiKey } = useLoaderData();
  const search = useAppSearch();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href={appPath("/app", search)}>Home</s-link>
        <s-link href={appPath("/app/additional", search)}>Additional page</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
