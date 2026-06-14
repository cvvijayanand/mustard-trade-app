import { useLocation } from "react-router";

/** Preserve Shopify embedded frame params on client-side app navigation. */
export function useAppSearch() {
  const { search } = useLocation();
  return search;
}

export function appPath(pathname, search) {
  return search ? `${pathname}${search}` : pathname;
}
