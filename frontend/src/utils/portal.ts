import type { NavigateFunction } from "react-router-dom";

export type PortalVariant = "applicant" | "internal";

const APPLICANT_PORT = process.env.REACT_APP_APPLICANT_PORT || "3000";
const INTERNAL_PORT = process.env.REACT_APP_INTERNAL_PORT || "3001";

const getFallbackLocation = () => ({
  protocol: "http:",
  hostname: "localhost",
  port: APPLICANT_PORT,
  pathname: "/",
  search: "",
  hash: ""
});

const getBrowserLocation = () =>
  typeof window !== "undefined" ? window.location : getFallbackLocation();

const normalizePath = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

export const isAbsoluteUrl = (value: string): boolean =>
  /^https?:\/\//i.test(value);

export const getCurrentPortal = (): PortalVariant =>
  getBrowserLocation().port === INTERNAL_PORT ? "internal" : "applicant";

export const getPortalLoginPath = (portal: PortalVariant): string =>
  portal === "internal" ? "/internal/login" : "/auth/login";

export const buildPortalUrl = (
  portal: PortalVariant,
  path: string
): string => {
  const location = getBrowserLocation();
  const port = portal === "internal" ? INTERNAL_PORT : APPLICANT_PORT;
  const normalizedPath = normalizePath(path);

  return `${location.protocol}//${location.hostname}:${port}${normalizedPath}`;
};

export const getCurrentPortalLoginPath = (): string =>
  getPortalLoginPath(getCurrentPortal());

export const redirectWithNavigate = (
  navigate: NavigateFunction,
  target: string,
  replace = true
): void => {
  if (isAbsoluteUrl(target)) {
    if (replace) {
      window.location.replace(target);
      return;
    }

    window.location.assign(target);
    return;
  }

  navigate(target, {
    replace
  });
};
