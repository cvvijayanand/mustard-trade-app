import { boundary } from "@shopify/shopify-app-react-router/server";
import { returnAuthResponse } from "../lib/embedded-redirect.server";

export const loader = returnAuthResponse;

export const headers = (headersArgs) => boundary.headers(headersArgs);
